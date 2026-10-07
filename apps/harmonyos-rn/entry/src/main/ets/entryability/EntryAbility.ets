import { RNAbility } from '@rnoh/react-native-openharmony';

export default class EntryAbility extends RNAbility {
  /**
   * 指定承载 RN 的 ArkUI 页面。
   * @returns 首页资源路径。
   */
  protected getPagePath(): string {
    return 'pages/Index';
  }
}
