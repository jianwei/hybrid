import { spawn } from 'node:child_process'
import { access, mkdir, open } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const iosDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = resolve(iosDir, '../..')
const cacheDir = resolve(repoDir, '.cache/ios')
const derivedData = resolve(cacheDir, 'DerivedData')
const outputDir = resolve(repoDir, 'dist/ios/app/Debug-iphonesimulator')
const appPath = resolve(outputDir, 'HybridApp.app')
const childGroups = new Set()
let stopping = false

/**
 * 启动命令并跟踪其进程组，保证中断时同时停止派生进程。
 * @param {string} command - 可执行文件。
 * @param {string[]} args - 命令参数。
 * @param {import('node:child_process').SpawnOptions} options - 进程选项。
 * @returns {Promise<string>} 成功时返回捕获的标准输出。
 */
function run(command, args, options = {}) {
  return new Promise((resolveCommand, reject) => {
    const child = spawn(command, args, {
      cwd: repoDir,
      stdio: ['ignore', 'pipe', 'inherit'],
      ...options,
      detached: true
    })
    if (child.pid) childGroups.add(child.pid)
    let output = ''
    child.stdout?.on('data', chunk => { output += chunk })
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) {
        childGroups.delete(child.pid)
        resolveCommand(output.trim())
      } else {
        // 父进程异常退出时保留进程组，由统一清理停止可能仍存活的派生进程。
        reject(new Error(`${command} 执行失败（${signal ?? code}）。`))
      }
    })
  })
}

/**
 * 向当前任务创建的进程组发送信号，忽略已经退出的进程。
 * @param {NodeJS.Signals} signal - 终止信号。
 * @returns {void} 无返回值。
 */
function signalChildren(signal) {
  for (const pid of childGroups) {
    try {
      process.kill(-pid, signal)
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(error.message)
    }
  }
}

/**
 * 停止本次开发命令创建的服务与构建进程。
 * @param {number} code - 最终退出码。
 * @returns {Promise<void>} 清理完成后退出。
 */
async function stop(code) {
  if (stopping) return
  stopping = true
  // 保留组 ID：父进程退出后，其派生进程仍可能正在收尾。
  const groups = [...childGroups]
  signalChildren('SIGTERM')
  await delay(1500)
  for (const pid of groups) childGroups.add(pid)
  signalChildren('SIGKILL')
  process.exit(code)
}

/**
 * 检查 Metro 默认端口，避免连接其他项目或终止用户已有服务。
 * @returns {Promise<void>} 端口空闲时完成。
 */
async function checkMetroPort() {
  await new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', () => reject(new Error('8081 端口已占用，请先在原终端停止已有 Metro/服务，再运行 pnpm run dev:ios。')))
    server.listen(8081, () => server.close(resolvePort))
  })
}

/**
 * 等待本次 Metro 服务就绪；失败或超时会结束整个开发任务。
 * @param {Promise<never>} metroEnded - Metro 提前退出时拒绝的 Promise。
 * @returns {Promise<void>} Metro 就绪时完成。
 */
async function waitForMetro(metroEnded) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const isReady = await Promise.race([
      fetch('http://127.0.0.1:8081/status', { signal: AbortSignal.timeout(1000) })
        .then(response => response.text()).then(body => body === 'packager-status:running')
        .catch(() => false),
      metroEnded
    ])
    if (isReady) return
    await Promise.race([delay(500), metroEnded])
  }
  throw new Error('Metro 在 120 秒内未就绪，请检查上方日志。')
}

/**
 * 启动 Metro、构建最新 Debug App，然后安装并启动模拟器应用。
 * @returns {Promise<void>} 开发服务持续运行，直到中断或失败。
 */
async function main() {
  if (process.platform !== 'darwin') throw new Error('iOS 模拟器开发需要 macOS 和完整 Xcode。')
  await access(resolve(iosDir, 'Pods/Manifest.lock')).catch(() => {
    throw new Error('缺少 CocoaPods 依赖，请先运行 pnpm ios:pods。')
  })
  await checkMetroPort()
  const { devices } = JSON.parse(await run('xcrun', ['simctl', 'list', 'devices', 'available', '--json']))
  const simulators = Object.entries(devices)
    .filter(([runtime]) => runtime.includes('.iOS-')).flatMap(([, list]) => list)
  const requested = process.env.IOS_SIMULATOR
  const device = requested
    ? simulators.find(item => item.udid === requested || item.name === requested)
    : simulators.find(item => item.state === 'Booted')
      ?? simulators.find(item => item.name === 'iPhone 17')
      ?? simulators.find(item => item.name.startsWith('iPhone'))
      ?? simulators[0]
  if (!device) throw new Error(requested ? `找不到可用模拟器：${requested}` : '未找到 iOS 模拟器，请在 Xcode Settings → Components 安装 iOS Simulator。')

  console.log(`启动 Taro / Metro，使用模拟器：${device.name} (${device.udid})`)
  const metroEnded = run('pnpm', ['--filter', 'taro', 'run', 'dev:rn:ios'], {
    // 由编排脚本接收 Ctrl-C，避免 Metro 的交互快捷键截获终止信号。
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, NODE_ENV: 'development', RCT_METRO_PORT: '8081' }
  }).then(() => { throw new Error('Metro 已停止。') })
  // Metro 在构建期间退出也要立即结束任务，不能继续安装无法加载页面的 App。
  void metroEnded.catch(error => {
    if (!stopping) { console.error(error.message); void stop(1) }
  })
  await waitForMetro(metroEnded)
  if (device.state !== 'Booted') await run('xcrun', ['simctl', 'boot', device.udid])
  await run('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', device.udid])
  await run('xcrun', ['simctl', 'bootstatus', device.udid, '-b'], { stdio: 'inherit' })

  await mkdir(cacheDir, { recursive: true })
  const buildLog = resolve(cacheDir, 'dev-build.log')
  console.log(`正在增量构建最新 Debug App，日志：${buildLog}`)
  const logFile = await open(buildLog, 'w')
  try {
    await run('xcodebuild', [
      '-workspace', resolve(iosDir, 'HybridApp.xcworkspace'), '-scheme', 'HybridApp',
      '-configuration', 'Debug', '-sdk', 'iphonesimulator', '-destination', `id=${device.udid}`,
      '-derivedDataPath', derivedData, 'CODE_SIGNING_ALLOWED=NO', 'build'
    ], { stdio: ['ignore', logFile.fd, logFile.fd] })
  } finally {
    await logFile.close()
  }
  await mkdir(appPath, { recursive: true })
  await run('/usr/bin/rsync', ['-a', '--delete', `${derivedData}/Build/Products/Debug-iphonesimulator/HybridApp.app/`, `${appPath}/`])
  const bundleId = await run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', resolve(appPath, 'Info.plist')])
  await run('xcrun', ['simctl', 'install', device.udid, appPath])
  await run('xcrun', ['simctl', 'launch', '--terminate-running-process', device.udid, bundleId], { stdio: 'inherit' })
  console.log(`\n已启动最新 Debug App：${appPath}\n修改 apps/taro/src 后自动 Fast Refresh；修改原生代码/依赖后重新运行此命令。\n保持此终端运行；Ctrl-C 停止本次 Metro。`)
  await metroEnded
}

process.once('SIGINT', () => { void stop(130) })
process.once('SIGTERM', () => { void stop(143) })
try {
  await main()
} catch (error) {
  if (!stopping) console.error(error.message)
  await stop(1)
}
