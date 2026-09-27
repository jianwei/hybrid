import { createSSRApp } from "vue";
import App from "./App.vue";

/**
 * 创建 uni-app 应用实例
 *
 * @returns 包含 Vue 应用实例的启动配置
 */
export function createApp() {
  const app = createSSRApp(App);
  return {
    app,
  };
}
