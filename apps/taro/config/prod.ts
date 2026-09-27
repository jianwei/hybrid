import type { UserConfigExport } from '@tarojs/cli'

/**
 * 按模板约定补充需要转译的 H5 依赖。
 * @param filename - 待编译文件路径。
 * @returns 是否交由 Babel 编译。
 */
function shouldCompileDependency(filename: string): boolean {
  return /node_modules\/(?!(@babel|core-js|style-loader|css-loader|react|react-dom))/.test(filename)
}

export default {
  mini: {},
  h5: {
    compile: {
      include: [shouldCompileDependency]
    }
  }
} satisfies UserConfigExport<'webpack5'>
