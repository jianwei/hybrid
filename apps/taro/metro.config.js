const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { getMetroConfig } = require('@tarojs/rn-supporter')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '../..')

/**
 * 转义正则元字符，用于把仓库路径拼接进 blockList。
 * @param {string} value - 原始路径。
 * @returns {string} 转义后的正则片段。
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 让 Metro 访问 pnpm 工作区中的真实依赖路径。
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [repoRoot],
  resolver: {
    unstable_enableSymlinks: true,
    // 仅排除仓库根的构建缓存与交付目录（原生构建频繁改写，监视会导致 Metro watcher 崩溃），
    // 不能误伤 node_modules 内合法的 dist 目录。
    blockList: [
      new RegExp(`^${escapeRegExp(repoRoot)}/\\.cache/`),
      new RegExp(`^${escapeRegExp(repoRoot)}/dist/`)
    ]
  }
}

/**
 * 合并 React Native、Taro 和工作区配置。
 * @returns {Promise<import('metro-config').MetroConfig>} Metro 配置
 */
async function createMetroConfig() {
  return mergeConfig(getDefaultConfig(__dirname), await getMetroConfig(), config)
}

module.exports = createMetroConfig()
