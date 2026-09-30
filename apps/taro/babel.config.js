// babel-preset-taro 更多选项和默认值：
// https://docs.taro.zone/docs/next/babel-config
const taroifyTargets = new Set(['h5', 'weapp'])

module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5',
      useBuiltIns: process.env.TARO_ENV === 'h5' ? 'usage' : false
    }]
  ],
  plugins: taroifyTargets.has(process.env.TARO_ENV)
    ? [
        [
          'import',
          {
            libraryName: '@taroify/core',
            libraryDirectory: '',
            style: true
          },
          '@taroify/core'
        ]
      ]
    : []
}
