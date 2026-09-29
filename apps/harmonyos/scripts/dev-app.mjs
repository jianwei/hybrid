import { spawn } from 'node:child_process'
import { access, copyFile, mkdir, open } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const harmonyDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = resolve(harmonyDir, '../..')
const cacheDir = resolve(repoDir, '.cache/harmony')
const builtHap = resolve(harmonyDir, 'entry/build/default/outputs/default/default-default-unsigned.hap')
const outputDir = resolve(repoDir, 'dist/harmony/app')
const outputHap = resolve(outputDir, 'HybridApp-debug.hap')
const bundleName = 'com.tuniu.hybrid'
const abilityName = 'app'
const moduleName = 'default'
const emulatorName = process.env.HARMONY_EMULATOR ?? 'HybridOS_Phone'

// 模拟器按进程 locale 判定地区，非中文环境会拒绝启动（仅限中国大陆能力）。
process.env.LANG = 'zh_CN.UTF-8'
process.env.LC_ALL = 'zh_CN.UTF-8'

/**
 * 执行命令并收集标准输出。
 * @param {string} command - 可执行文件。
 * @param {string[]} args - 命令参数。
 * @param {import('node:child_process').SpawnOptions} options - 进程选项。
 * @returns {Promise<string>} 成功时返回捕获的标准输出。
 */
function run(command, args, options = {}) {
  return new Promise((resolveCommand, reject) => {
    const child = spawn(command, args, {
      cwd: harmonyDir,
      stdio: ['ignore', 'pipe', 'inherit'],
      ...options
    })
    let output = ''
    child.stdout?.on('data', chunk => { output += chunk })
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolveCommand(output.trim())
      else reject(new Error(`${command} 执行失败（${signal ?? code}）。`))
    })
  })
}

/**
 * 定位华为 Command Line Tools：优先 HARMONY_CLT 环境变量，其次常见下载目录。
 * @returns {Promise<string>} 包含 bin/hvigorw 的工具根目录。
 */
async function findClt() {
  const candidates = [
    process.env.HARMONY_CLT,
    join(homedir(), 'command-line-tools'),
    join(homedir(), 'Downloads/command-line-tools')
  ].filter(Boolean)
  for (const dir of candidates) {
    const found = await access(join(dir, 'bin/hvigorw')).then(() => true, () => false)
    if (found) return dir
  }
  throw new Error('未找到 Command Line Tools，请设置 HARMONY_CLT 指向解压目录（应包含 bin/hvigorw）。')
}

/**
 * 列出 hdc 可见的在线设备。
 * @param {string} hdc - hdc 可执行文件路径。
 * @returns {Promise<string[]>} 设备连接地址列表。
 */
async function onlineDevices(hdc) {
  const output = await run(hdc, ['list', 'targets'])
  return output.split('\n').map(line => line.trim())
    .filter(line => line && line !== '[Empty]')
}

/**
 * 后台启动鸿蒙模拟器并等待 hdc 就绪。
 * @param {string} hdc - hdc 可执行文件路径。
 * @param {string} emulatorBin - Emulator 可执行文件路径。
 * @returns {Promise<string>} 已就绪设备的连接地址。
 */
async function bootEmulator(hdc, emulatorBin) {
  // --noWindow 供自动化测试使用：不弹窗口，只通过 hdc/截图验证。
  const noWindow = process.argv.includes('--noWindow')
  console.log(`启动鸿蒙模拟器：${emulatorName}${noWindow ? '（无窗口模式）' : ''}`)
  // 模拟器独立于本命令存活，不随脚本退出而关闭。
  const child = spawn(emulatorBin, ['-start', emulatorName, ...(noWindow ? ['-noWindow'] : [])], { stdio: 'ignore', detached: true })
  child.unref()
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    await delay(5000)
    const devices = await onlineDevices(hdc)
    if (devices.length > 0 && await run(hdc, ['shell', 'bm', 'dump', '-a']).catch(() => '') !== '') {
      return devices[0]
    }
  }
  throw new Error(`模拟器 ${emulatorName} 在 240 秒内未就绪，可用 Emulator -list 查看已创建的模拟器。`)
}

/**
 * 选择 hdc 设备：优先已在线设备，否则后台启动模拟器。
 * @param {string} hdc - hdc 可执行文件路径。
 * @param {string} emulatorBin - Emulator 可执行文件路径。
 * @returns {Promise<string>} 设备连接地址。
 */
async function ensureDevice(hdc, emulatorBin) {
  const online = await onlineDevices(hdc)
  if (online.length > 0) return online[0]
  return bootEmulator(hdc, emulatorBin)
}

/**
 * 编译 Taro 鸿蒙产物、组装 HAP，安装到模拟器并启动应用。
 * @returns {Promise<void>} 部署完成后结束（鸿蒙端为静态打包，无常驻服务）。
 */
async function main() {
  await access(resolve(repoDir, 'apps/taro/node_modules')).catch(() => {
    throw new Error('缺少 workspace 依赖，请先运行 pnpm install。')
  })
  const clt = await findClt()
  const hdc = join(clt, 'sdk/default/openharmony/toolchains/hdc')
  const hvigorw = join(clt, 'bin/hvigorw')
  const ohpm = join(clt, 'bin/ohpm')
  const emulatorBin = join(clt, 'bin/Emulator')
  const target = await ensureDevice(hdc, emulatorBin)
  console.log(`使用设备：${target}`)
  // Taro 插件通过 which ohpm 定位 ohpm，把工具 bin 目录放到 PATH 前可让插件自动装依赖。
  const cltEnv = { ...process.env, PATH: `${join(clt, 'bin')}:${process.env.PATH}` }

  console.log('编译 Taro 鸿蒙产物…')
  await run('pnpm', ['--filter', 'taro', 'run', 'build:harmony'], { cwd: repoDir, stdio: 'inherit', env: cltEnv })

  await mkdir(cacheDir, { recursive: true })
  const buildLog = resolve(cacheDir, 'dev-build.log')
  console.log(`组装 HAP，日志：${buildLog}`)
  await run(ohpm, ['install', '--all'], { stdio: 'inherit' })
  const logFile = await open(buildLog, 'w')
  try {
    await run(hvigorw, ['assembleHap', '--mode', 'module', '-p', 'product=default', '-p', 'buildMode=debug', '--no-daemon'], {
      stdio: ['ignore', logFile.fd, logFile.fd]
    })
  } finally {
    await logFile.close()
  }

  await mkdir(outputDir, { recursive: true })
  await copyFile(builtHap, outputHap)
  await run(hdc, ['-t', target, 'install', '-r', outputHap], { stdio: 'inherit' })
  await run(hdc, ['-t', target, 'shell', 'aa', 'start', '-b', bundleName, '-a', abilityName, '-m', moduleName], { stdio: 'inherit' })
  console.log(`\n已安装并启动：${outputHap}\n鸿蒙端为静态打包：修改 apps/taro/src 后需重新运行此命令。`)
}

try {
  await main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
