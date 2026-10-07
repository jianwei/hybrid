/**
 * 避免 pnpm 隐藏目录被鸿蒙 rawfile 打包器过滤；Metro 同时用此元数据生成 JS 与复制图片。
 * @param {import('metro').AssetData} asset - Metro 图片资源描述。
 * @returns {import('metro').AssetData} 具有可入包路径的描述。
 */
module.exports = function harmonyAssetPath(asset) {
  return {
    ...asset,
    httpServerLocation: asset.httpServerLocation.replace(/\/\.pnpm(?=\/|$)/g, '/pnpm')
  }
}
