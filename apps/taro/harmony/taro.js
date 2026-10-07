// 版本边界：沿用 Taro 4.2.1 的 API 实现，仅裁剪未接入鸿蒙的原生依赖。
const { unsupported } = require('./unsupported')
const runtime = require('@tarojs/runtime-rn')
const api = { ...runtime }
Object.assign(api, require('@tarojs/taro-rn/dist/lib/ENV_TYPE'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/arrayBufferToBase64'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/base64ToArrayBuffer'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/connectSocket'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/getEnv'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/hideKeyboard'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/hideLoading'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/hideToast'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/makePhoneCall'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/offKeyboardHeightChange'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/offUserCaptureScreen'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/offWindowResize'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/onKeyboardHeightChange'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/onUserCaptureScreen'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/onWindowResize'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/openUrl'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/request'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/showLoading'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/showModal'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/showToast'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/vibrateLong'))
Object.assign(api, require('@tarojs/taro-rn/dist/lib/vibrateShort'))
const taro = new Proxy(api, {
  /**
   * 导出已接入能力，调用未接入 API 时给出明确错误。
   * @param {object} target - Taro 已接入 API 表。
   * @param {string | symbol} name - 请求的导出名称。
   * @returns {unknown} 真实 API 或抛错函数。
   */
  get(target, name) {
    if (name === '__esModule') return true
    if (name === 'default') return taro
    if (name in target || typeof name !== 'string') return target[name]
    return unsupported(`Taro.${name}`)
  }
})
module.exports = taro
