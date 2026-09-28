import { spawn } from 'node:child_process'
import { access, copyFile, mkdir, open } from 'node:fs/promises'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const androidDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = resolve(androidDir, '../..')
const cacheDir = resolve(repoDir, '.cache/android')
const gradleUserHome = resolve(cacheDir, 'gradle')
const builtApk = resolve(cacheDir, 'build/app/outputs/apk/debug/app-debug.apk')
const outputDir = resolve(repoDir, 'dist/rn/android/app/debug')
const outputApk = resolve(outputDir, 'HybridApp-debug.apk')
const packageId = 'com.tuniu.hybrid'
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
    server.once('error', () => reject(new Error('8081 端口已占用，请先在原终端停止已有 Metro/服务，再运行 pnpm run dev:android。')))
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
 * 定位 Android SDK：优先环境变量，其次 Android Studio 默认目录，最后 Homebrew 命令行工具目录。
 * @returns {Promise<string>} 可用的 SDK 根目录。
 */
async function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    join(homedir(), 'Library/Android/sdk'),
    '/opt/homebrew/share/android-commandlinetools'
  ].filter(Boolean)
  for (const dir of candidates) {
    const found = await access(join(dir, 'platform-tools/adb')).then(() => true, () => false)
    if (found) return dir
  }
  throw new Error('未找到 Android SDK，请安装 Android Studio 或命令行工具，并设置 ANDROID_HOME。')
}

/**
 * 列出 adb 可见的在线设备。
 * @param {string} adb - adb 可执行文件路径。
 * @returns {Promise<string[]>} 状态为 device 的设备序列号。
 */
async function onlineDevices(adb) {
  const output = await run(adb, ['devices'])
  return output.split('\n').slice(1)
    .map(line => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === 'device')
    .map(([serial]) => serial)
}

/**
 * 后台启动指定 AVD 并等待系统引导完成，返回模拟器序列号。
 * @param {string} adb - adb 可执行文件路径。
 * @param {string} emulatorBin - emulator 可执行文件路径。
 * @param {string} avd - AVD 名称。
 * @returns {Promise<string>} 已就绪模拟器的序列号。
 */
async function bootAvd(adb, emulatorBin, avd) {
  const avds = (await run(emulatorBin, ['-list-avds'])).split('\n').map(name => name.trim()).filter(Boolean)
  if (!avds.includes(avd)) throw new Error(`找不到 Android 虚拟设备：${avd}（可用：${avds.join('、') || '无'}）`)
  const before = new Set(await onlineDevices(adb))
  // 模拟器独立于本次开发命令存活，不纳入统一清理；Ctrl-C 后保留打开。
  const child = spawn(emulatorBin, ['-avd', avd], { stdio: 'ignore', detached: true })
  child.unref()
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    await delay(2000)
    const serial = (await onlineDevices(adb)).find(item => item.startsWith('emulator-') && !before.has(item))
      ?? (await onlineDevices(adb)).find(item => item.startsWith('emulator-'))
    if (serial && await run(adb, ['-s', serial, 'shell', 'getprop', 'sys.boot_completed']).catch(() => '') === '1') {
      return serial
    }
  }
  throw new Error(`模拟器 ${avd} 在 180 秒内未完成启动，请检查模拟器窗口或日志。`)
}

/**
 * 选择本次使用的设备：ANDROID_AVD 指定的序列号或 AVD 名、已在线的模拟器、否则启动第一个可用 AVD。
 * @param {string} adb - adb 可执行文件路径。
 * @param {string} emulatorBin - emulator 可执行文件路径。
 * @returns {Promise<string>} 设备序列号。
 */
async function ensureDevice(adb, emulatorBin) {
  const requested = process.env.ANDROID_AVD
  const online = await onlineDevices(adb)
  if (requested) {
    if (online.includes(requested)) return requested
    return bootAvd(adb, emulatorBin, requested)
  }
  const existing = online.find(item => item.startsWith('emulator-')) ?? online[0]
  if (existing) return existing
  const avds = (await run(emulatorBin, ['-list-avds'])).split('\n').map(name => name.trim()).filter(Boolean)
  if (avds.length === 0) throw new Error('未找到 Android 虚拟设备（AVD），请用 Android Studio 或 avdmanager 创建一个。')
  console.log(`启动 Android 模拟器：${avds[0]}`)
  return bootAvd(adb, emulatorBin, avds[0])
}

/**
 * 启动 Metro、构建最新 Debug App，然后安装并启动模拟器应用。
 * @returns {Promise<void>} 开发服务持续运行，直到中断或失败。
 */
async function main() {
  await access(resolve(repoDir, 'apps/taro/node_modules')).catch(() => {
    throw new Error('缺少 workspace 依赖，请先运行 pnpm install。')
  })
  await checkMetroPort()
  const sdk = await findSdk()
  const adb = join(sdk, 'platform-tools/adb')
  const emulatorBin = join(sdk, 'emulator/emulator')
  const serial = await ensureDevice(adb, emulatorBin)

  console.log(`启动 Taro / Metro，使用设备：${serial}`)
  const metroEnded = run('pnpm', ['--filter', 'taro', 'run', 'dev:rn:android'], {
    // 由编排脚本接收 Ctrl-C，避免 Metro 的交互快捷键截获终止信号。
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, NODE_ENV: 'development', RCT_METRO_PORT: '8081' }
  }).then(() => { throw new Error('Metro 已停止。') })
  // Metro 在构建期间退出也要立即结束任务，不能继续安装无法加载页面的 App。
  void metroEnded.catch(error => {
    if (!stopping) { console.error(error.message); void stop(1) }
  })
  await waitForMetro(metroEnded)

  await run(adb, ['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081'])
  const abi = await run(adb, ['-s', serial, 'shell', 'getprop', 'ro.product.cpu.abi'])

  await mkdir(cacheDir, { recursive: true })
  const buildLog = resolve(cacheDir, 'dev-build.log')
  console.log(`正在增量构建最新 Debug App（${abi}），日志：${buildLog}`)
  const logFile = await open(buildLog, 'w')
  try {
    await run(resolve(androidDir, 'gradlew'), [':app:assembleDebug', `-PreactNativeArchitectures=${abi}`], {
      cwd: androidDir,
      stdio: ['ignore', logFile.fd, logFile.fd],
      env: {
        ...process.env,
        ANDROID_HOME: sdk,
        GRADLE_USER_HOME: gradleUserHome,
        TARO_ENV: 'rn',
        NODE_ENV: 'development'
      }
    })
  } finally {
    await logFile.close()
  }
  await mkdir(outputDir, { recursive: true })
  await copyFile(builtApk, outputApk)
  await run(adb, ['-s', serial, 'install', '-r', outputApk])
  await run(adb, ['-s', serial, 'shell', 'am', 'start', '-n', `${packageId}/.MainActivity`], { stdio: 'inherit' })
  console.log(`\n已启动最新 Debug App：${outputApk}\n修改 apps/taro/src 后自动 Fast Refresh；修改原生代码/依赖后重新运行此命令。\n保持此终端运行；Ctrl-C 停止本次 Metro。`)
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
