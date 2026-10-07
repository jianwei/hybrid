const path = require('node:path')
const { existsSync } = require('node:fs')
const { mergeConfig } = require('@react-native/metro-config')
const { getMetroConfig } = require('@tarojs/rn-supporter')
const { createHarmonyMetroConfig } = require('@react-native-oh/react-native-harmony/metro.config')

const harmony = createHarmonyMetroConfig({ reactNativeHarmonyPackageName: '@react-native-oh/react-native-harmony' })
const aliases = {
  '@tarojs/components-rn': path.join(__dirname, 'harmony/components.js'),
  '@tarojs/taro-rn': path.join(__dirname, 'harmony/taro.js'),
  'react-native-gesture-handler': '@react-native-oh-tpl/react-native-gesture-handler',
  'react-native-safe-area-context': '@react-native-oh-tpl/react-native-safe-area-context'
}
const redirectedPackages = ['react-native-gesture-handler', 'react-native-safe-area-context'].map(name => ({
  original: path.dirname(require.resolve(`${name}/package.json`)),
  harmony: path.dirname(require.resolve(`${aliases[name]}/package.json`))
}))
const harmonyResolve = harmony.resolver.resolveRequest

/**
 * 保留 RNOH 核心解析，并显式连接 pnpm 软链中的三方鸿蒙包。
 * @param {import('metro-resolver').ResolutionContext} context - Metro 上下文。
 * @param {string} moduleName - 原模块名。
 * @param {string | null} platform - Metro 平台。
 * @returns {import('metro-resolver').Resolution} 已解析的模块。
 */
function resolveHarmony(context, moduleName, platform) {
  if (platform === 'harmony' && moduleName.startsWith('.')) {
    for (const mapping of redirectedPackages) {
      if (!context.originModulePath.startsWith(`${mapping.original}${path.sep}`)) continue
      const relative = path.relative(mapping.original, path.resolve(path.dirname(context.originModulePath), moduleName))
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) continue
      const replacement = path.join(mapping.harmony, relative)
      if (['', '.harmony.tsx', '.harmony.ts', '.harmony.js', '.native.tsx', '.native.ts', '.native.js', '.tsx', '.ts', '.js', '/index.tsx', '/index.ts', '/index.js'].some(ext => existsSync(replacement + ext))) {
        return context.resolveRequest(context, replacement, platform)
      }
    }
  }
  const alias = aliases[moduleName]
  if (platform === 'harmony' && alias) {
    return context.resolveRequest(context, alias, platform)
  }
  return harmonyResolve(context, moduleName, platform)
}

/**
 * 将 Taro 入口、样式及别名处理包在 RNOH resolver 外层。
 * @returns {Promise<import('metro-config').MetroConfig>} 鸿蒙专用 Metro 配置。
 */
async function createConfig() {
  const base = await require('./metro.config')
  const adapted = await getMetroConfig({}, {
    ...harmony,
    resolver: { ...harmony.resolver, resolveRequest: resolveHarmony }
  })
  return mergeConfig(base, adapted, {
    projectRoot: __dirname,
    transformer: {
      assetPlugins: [...(base.transformer.assetPlugins ?? []),
        ...(process.env.NODE_ENV === 'production' ? [path.join(__dirname, 'harmony/asset-plugin.js')] : [])]
    },
    resolver: { platforms: ['ios', 'android', 'native', 'harmony'], nodeModulesPaths: [path.join(__dirname, 'node_modules')], blockList: base.resolver.blockList },
    maxWorkers: 4
  })
}
module.exports = createConfig()
