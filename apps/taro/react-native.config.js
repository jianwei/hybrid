module.exports = {
  platforms: { harmony: {} },
  // 鸿蒙适配包不得参与既有 iOS / Android autolinking。
  dependencies: {
    '@react-native-oh/react-native-harmony': { platforms: { ios: null, android: null } },
    '@react-native-oh-tpl/react-native-gesture-handler': { platforms: { ios: null, android: null } },
    '@react-native-oh-tpl/react-native-safe-area-context': { platforms: { ios: null, android: null } }
  },
  project: {
    ios: { sourceDir: '../ios' },
    android: { sourceDir: '../android' }
  }
}
