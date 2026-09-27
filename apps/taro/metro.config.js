const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { getMetroConfig } = require('@tarojs/rn-supporter')
const path = require('node:path')

/**
 * 让 Metro 访问 pnpm 工作区中的真实依赖路径。
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, '../..')],
  resolver: {
    unstable_enableSymlinks: true
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
