/**
 * 为未接入鸿蒙的能力生成明确失败入口，避免伪造成功。
 * @param {string} name - 组件或 API 名。
 * @returns {(...args: unknown[]) => never} 调用时抛错的函数。
 */
function unsupported(name) {
  /**
   * 报告当前宿主尚未接入的能力。
   * @param {...unknown} _args - 原调用参数。
   * @returns {never} 始终抛错。
   */
  return function unavailable(..._args) {
    throw new Error(`鸿蒙 RN 暂未接入 ${name}，请先实现并验证对应原生能力。`)
  }
}
exports.unsupported = unsupported
