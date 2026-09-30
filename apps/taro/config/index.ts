import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import { resolve } from 'node:path'
import devConfig from './dev'
import prodConfig from './prod'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'webpack5'>(async (merge) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'taro',
    date: '2026-9-27',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: `../../dist/${process.env.TARO_ENV ?? 'h5'}`,
    plugins: [
      "@tarojs/plugin-generator",
      "@tarojs/plugin-platform-harmony-cpp"
    ],
    defineConstants: {
    },
    copy: {
      patterns: [
      ],
      options: {
      }
    },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      prebundle: {
        esbuild: {
          logOverride: {
            // Stencil 运行时动态导入 entry 会触发 esbuild empty-glob 误报，仅覆盖该诊断
            'empty-glob': 'silent'
          }
        }
      }
    },
    cache: {
      enable: false
    },
    alias: {
      '@': resolve(__dirname, '../src')
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    h5: {
      esnextModules: ['@taroify'],
      publicPath: '/',
      router: {
        mode: 'browser'
      },
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[fullhash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[fullhash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    rn: {
      appName: 'HybridApp',
      output: {
        ios: '../../dist/ios/bundle/main.jsbundle',
        iosAssetsDest: '../../dist/ios/bundle',
        android: '../../dist/rn/android/index.android.bundle',
        androidAssetsDest: '../../dist/rn/android'
      },
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    },
    harmony: {
      // @ts-expect-error -- 4.2.1 类型定义未声明 compiler 字段，但鸿蒙端运行时必需；升级 Taro 后若类型补全则移除此注释
      compiler: 'vite',
      // 鸿蒙端当前仅支持 Vite 编译（平台级配置，不影响 h5/小程序的 webpack5）
      // 鸿蒙宿主工程（Stage 模型），Taro 页面编译注入其 entry HAP
      projectPath: resolve(__dirname, '../../../apps/harmonyos'),
      hapName: 'entry'
    }
  }

  process.env.BROWSERSLIST_ENV = process.env.NODE_ENV

  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
