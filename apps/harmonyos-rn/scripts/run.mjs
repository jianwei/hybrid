import { spawn } from 'node:child_process'
import { access, copyFile, cp, mkdir, open, rename, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const hostDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoDir = resolve(hostDir, '../..')
const taroDir = join(repoDir, 'apps/taro')
const cacheDir = join(repoDir, '.cache/harmony-rn')
const bundleDir = join(repoDir, 'dist/harmony-rn/bundle')
const rawfileDir = join(hostDir, 'entry/src/main/resources/rawfile')
const bundleName = 'com.tuniu.hybrid.rn'
const port = 8081
const children = new Set()
const abort = new AbortController()
let forwardCleanup

/**
 * 启动当前命令拥有的子进程组，方便中断时连同孙进程一起释放。
 * @param {string} command - 可执行文件。
 * @param {string[]} args - 参数。
 * @param {import('node:child_process').SpawnOptions} options - 进程配置。
 * @returns {import('node:child_process').ChildProcess} 已注册的子进程。
 */
function start(command, args, options = {}) {
  abort.signal.throwIfAborted()
  const child = spawn(command, args, { cwd: hostDir, stdio: 'inherit', detached: true, ...options })
  children.add(child)
  child.once('close', () => children.delete(child))
  return child
}

/**
 * 等待子进程结束并保持失败状态。
 * @param {import('node:child_process').ChildProcess} child - 子进程。
 * @returns {Promise<void>} 正常退出后完成。
 */
function completed(child) {
  return new Promise((resolveChild, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolveChild()
      else reject(new Error(`命令执行失败：${child.spawnfile}（${signal ?? code}）`))
    })
  })
}

/**
 * 执行命令，可选择收集有限大小的标准输出。
 * @param {string} command - 可执行文件。
 * @param {string[]} args - 参数。
 * @param {import('node:child_process').SpawnOptions & { capture?: boolean }} options - 运行配置。
 * @returns {Promise<string>} 捕获的输出，默认返回空字符串。
 */
async function run(command, args, { capture = false, ...options } = {}) {
  const child = start(command, args, { ...(capture ? { stdio: ['ignore', 'pipe', 'inherit'] } : {}), ...options })
  let output = ''
  if (capture) child.stdout.on('data', chunk => { output = (output + chunk).slice(-1_000_000) })
  await completed(child)
  return output.trim()
}

/**
 * hdc 部分失败仍返回零，额外检查命令响应，避免安装或转发失败被当作成功。
 * @param {string} command - hdc 路径。
 * @param {string[]} args - 参数。
 * @param {{ capture?: boolean, cleanup?: boolean }} options - 输出及退出清理模式。
 * @returns {Promise<string>} 已确认的命令响应。
 */
async function runHdc(command, args, { capture = false, cleanup = false } = {}) {
  let output = ''
  if (cleanup) {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'] })
    child.stdout.on('data', chunk => { output = (output + chunk).slice(-1_000_000) })
    await completed(child)
  } else output = await run(command, args, { capture: true })
  if (/\[Fail\]|\berror:|\bfailed\b/i.test(output)) throw new Error(`hdc 命令失败：${output.trim()}`)
  if (!capture && output.trim()) console.log(output.trim())
  return output.trim()
}

/**
 * 停止本脚本创建的命令组，不触碰既有服务与模拟器。
 * @returns {void} 无返回值。
 */
function stopChildren() {
  for (const child of children) {
    if (!child.pid) continue
    try { process.kill(-child.pid, 'SIGTERM') } catch (error) {
      if (error.code !== 'ESRCH') console.error(`清理子进程失败：${error.message}`)
    }
  }
}

/**
 * 处理终端中断，取消轮询并释放构建和 Metro。
 * @param {string} signal - 终止信号。
 * @returns {void} 无返回值。
 */
function interrupt(signal) {
  process.exitCode = signal === 'SIGINT' ? 130 : 143
  abort.abort(new Error(`收到 ${signal}，正在清理本次开发进程。`))
  stopChildren()
}
process.once('SIGINT', () => interrupt('SIGINT'))
process.once('SIGTERM', () => interrupt('SIGTERM'))

/**
 * 定位已安装的华为 Command Line Tools。
 * @returns {Promise<string>} 工具目录。
 */
async function findClt() {
  const candidates = process.env.HARMONY_CLT
    ? [process.env.HARMONY_CLT]
    : [join(homedir(), 'command-line-tools'), join(homedir(), 'Downloads/command-line-tools')]
  for (const candidate of candidates) {
    if (await access(join(candidate, 'bin/hvigorw')).then(() => true, () => false)) return candidate
  }
  throw new Error('未找到 Command Line Tools，请设置 HARMONY_CLT 指向包含 bin/hvigorw 的目录。')
}

/**
 * 只编译 harmony 平台的共享 Taro 页面与资源。
 * @param {string[]} extraArgs - 传给 Metro bundle 的附加参数。
 * @returns {Promise<void>} 全部产物生成后完成。
 */
async function bundle(extraArgs = []) {
  const staging = join(cacheDir, 'bundle-staging')
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  await run('pnpm', ['exec', 'react-native', 'bundle', '--config', 'metro.harmony.config.js',
    '--platform', 'harmony', '--dev', 'false', '--entry-file', 'index.js',
    '--bundle-output', join(staging, 'bundle.harmony.js'), '--assets-dest', staging, ...extraArgs],
  { cwd: taroDir, env: { ...process.env, NODE_ENV: 'production', TARO_ENV: 'rn' } })
  await mkdir(dirname(bundleDir), { recursive: true })
  await rm(bundleDir, { recursive: true, force: true })
  await rename(staging, bundleDir)
}

/**
 * 组装指定模式 HAP，成功后更新交付目录。
 * @param {string} clt - 鸿蒙 CLI 根目录。
 * @param {'debug' | 'release'} mode - 原生构建模式。
 * @returns {Promise<string>} 本次成功生成的 HAP 路径。
 */
async function build(clt, mode) {
  await mkdir(cacheDir, { recursive: true })
  await rm(rawfileDir, { recursive: true, force: true })
  if (mode === 'release') {
    await bundle()
    await cp(bundleDir, rawfileDir, { recursive: true })
  }
  const env = { ...process.env, PATH: `${join(clt, 'bin')}:${process.env.PATH}` }
  await run(join(clt, 'bin/ohpm'), ['install', '--all'], { env })
  await run(join(taroDir, 'node_modules/.bin/react-native'), ['codegen-harmony',
    '--rnoh-module-path', '../harmonyos-rn/entry/oh_modules/@rnoh/react-native-openharmony',
    '--cpp-output-path', '../harmonyos-rn/entry/src/main/cpp/generated', '--no-safety-check'], { cwd: taroDir })
  const logPath = join(cacheDir, `${mode}-build.log`)
  console.log(`构建 ${mode} HAP，日志：${logPath}`)
  const log = await open(logPath, 'w')
  try {
    await run(join(clt, 'bin/hvigorw'), ['assembleHap', '--mode', 'module', '-p', 'product=default',
      '-p', `buildMode=${mode}`, '--no-daemon'], { env, stdio: ['ignore', log.fd, log.fd] })
  } finally { await log.close() }
  const outputDir = join(repoDir, 'dist/harmony-rn/app', mode)
  await mkdir(outputDir, { recursive: true })
  const hap = join(outputDir, `HybridApp-${mode}.hap`)
  const stagedHap = `${hap}.tmp`
  await copyFile(join(hostDir, 'entry/build/default/outputs/default/entry-default-unsigned.hap'), stagedHap)
  await rename(stagedHap, hap)
  console.log(`HAP：${hap}`)
  return hap
}

/**
 * 拒绝占用中的 Metro 端口，防止错误连接其他工程。
 * @returns {Promise<void>} 端口可用后完成。
 */
function checkPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer()
    server.once('error', () => reject(new Error(`端口 ${port} 已被占用，请停止已有 Metro 或服务。`)))
    server.listen(port, '0.0.0.0', () => server.close(resolvePort))
  })
}

/**
 * 读取 hdc 在线设备列表。
 * @param {string} hdc - hdc 路径。
 * @returns {Promise<string[]>} 在线设备序列号。
 */
async function devices(hdc) {
  const output = await runHdc(hdc, ['list', 'targets'], { capture: true })
  return output.split(/\r?\n/).map(line => line.trim()).filter(line => line && line !== '[Empty]')
}

/**
 * 选择明确目标，必要时启动现有模拟器配置并等待系统就绪。
 * @param {string} clt - CLI 根目录。
 * @param {string} hdc - hdc 路径。
 * @param {boolean} noWindow - 是否无窗口启动。
 * @returns {Promise<string>} 就绪目标。
 */
async function ensureDevice(clt, hdc, noWindow) {
  const online = await devices(hdc)
  if (process.env.HARMONY_DEVICE) {
    if (!online.includes(process.env.HARMONY_DEVICE)) throw new Error('HARMONY_DEVICE 指定的设备不在线。')
    return process.env.HARMONY_DEVICE
  }
  if (online.length > 1) throw new Error('发现多个在线设备，请用 HARMONY_DEVICE 指定序列号。')
  if (online.length === 1) return online[0]
  const name = process.env.HARMONY_EMULATOR ?? 'HybridOS_Phone'
  console.log(`启动模拟器 ${name}${noWindow ? '（无窗口）' : ''}`)
  // 模拟器与 iOS/Android 约定一致，保留供下一次调试复用。
  const emulator = spawn(join(clt, 'bin/Emulator'), ['-start', name, ...(noWindow ? ['-noWindow'] : [])], {
    detached: true, stdio: 'ignore', env: { ...process.env, LANG: 'zh_CN.UTF-8', LC_ALL: 'zh_CN.UTF-8' }
  })
  let launchError
  emulator.once('error', error => { launchError = error })
  emulator.unref()
  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    abort.signal.throwIfAborted()
    if (launchError) throw launchError
    const targets = await devices(hdc)
    if (targets.length > 1) throw new Error('出现多个设备，请使用 HARMONY_DEVICE 重新运行。')
    if (targets.length === 1) {
      const packages = await runHdc(hdc, ['-t', targets[0], 'shell', 'bm', 'dump', '-a'], { capture: true })
      if (packages.includes('com.')) return targets[0]
    }
    await delay(2000, undefined, { signal: abort.signal })
  }
  throw new Error(`模拟器 ${name} 在 240 秒内未就绪；请用 Emulator -list 检查配置。`)
}

/**
 * 启动 Metro 并轮询其状态，监视启动失败和终端取消。
 * @returns {Promise<Promise<void>[]>} 装在数组中的服务生命周期 Promise。
 */
async function startMetro() {
  const child = start('pnpm', ['exec', 'react-native', 'start', '--config', 'metro.harmony.config.js', '--port', String(port)], {
    cwd: taroDir, env: { ...process.env, NODE_ENV: 'development', TARO_ENV: 'rn' }
  })
  const lifetime = completed(child)
  // 等待就绪期间立即观察拒绝，避免启动失败成为未处理异常。
  let metroError
  lifetime.catch(error => { metroError = error })
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    abort.signal.throwIfAborted()
    if (metroError) throw metroError
    if (child.exitCode !== null) throw new Error('Metro 在就绪前退出。')
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(1000) })
      if (await response.text() === 'packager-status:running') return [lifetime]
    } catch (error) {
      if (error.name !== 'TimeoutError' && error.cause?.code !== 'ECONNREFUSED') throw error
    }
    await delay(500, undefined, { signal: abort.signal })
  }
  throw new Error('Metro 在 90 秒内未就绪。')
}

/**
 * 一键启动开发环境、增量构建、安装并保持 Metro 存活。
 * @param {string} clt - CLI 根目录。
 * @param {boolean} noWindow - 是否无窗口启动模拟器。
 * @returns {Promise<void>} Metro 退出或用户中断后完成。
 */
async function dev(clt, noWindow) {
  await checkPort()
  const hdc = join(clt, 'sdk/default/openharmony/toolchains/hdc')
  const target = await ensureDevice(clt, hdc, noWindow)
  const abi = await runHdc(hdc, ['-t', target, 'shell', 'param', 'get', 'const.product.cpu.abilist'], { capture: true })
  if (!abi.includes('arm64-v8a')) throw new Error(`当前 RNOH HAR 仅支持 arm64-v8a，设备 ABI：${abi}`)
  const [metroLifetime] = await startMetro()
  const hap = await build(clt, 'debug')
  const forwards = await runHdc(hdc, ['-t', target, 'fport', 'ls'], { capture: true })
  const hasReverse = forwards.split(/\r?\n/).some(line => line.trim().startsWith(`${target} `) &&
    line.includes(`tcp:${port} tcp:${port}`) && line.includes('[Reverse]'))
  if (!hasReverse) {
    await runHdc(hdc, ['-t', target, 'rport', `tcp:${port}`, `tcp:${port}`])
    forwardCleanup = { hdc, target }
  }
  await runHdc(hdc, ['-t', target, 'install', '-r', hap])
  await runHdc(hdc, ['-t', target, 'shell', 'aa', 'force-stop', bundleName])
  await runHdc(hdc, ['-t', target, 'shell', 'aa', 'start', '-b', bundleName, '-a', 'EntryAbility', '-m', 'entry'])
  console.log('鸿蒙 RN 已启动；修改 apps/taro/src 后使用 Fast Refresh。Ctrl-C 结束本次 Metro，模拟器保留。')
  await metroLifetime
}

try {
  const [mode, ...args] = process.argv.slice(2)
  if (mode === 'bundle') await bundle(args)
  else if (mode === 'build' && args.length === 0) await build(await findClt(), 'release')
  else if (mode === 'dev' && args.every(arg => arg === '--noWindow')) await dev(await findClt(), args.includes('--noWindow'))
  else throw new Error('用法：run.mjs bundle [Metro 参数] | build | dev [--noWindow]')
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode ||= 1
} finally {
  stopChildren()
  if (forwardCleanup) {
    const { hdc, target } = forwardCleanup
    await runHdc(hdc, ['-t', target, 'fport', 'rm', `tcp:${port}`, `tcp:${port}`], { cleanup: true })
      .catch(error => { console.error(error.message); process.exitCode ||= 1 })
  }
}
