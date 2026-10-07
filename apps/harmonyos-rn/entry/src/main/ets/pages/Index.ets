import { JSBundleProvider, MetroJSBundleProvider, ResourceJSBundleProvider, RNApp,
  RNOHCoreContext, RNOHErrorDialog } from '@rnoh/react-native-openharmony';
import { createRNPackages } from '../RNPackagesFactory';

@Entry
@Component
struct Index {
  @StorageLink('RNOHCoreContext') private rnohCoreContext: RNOHCoreContext | undefined = undefined;

  /**
   * Debug 连接 Metro，Release 严格使用内嵌 bundle。
   * @returns 与当前构建模式匹配的 JS 载入器。
   */
  private bundleProvider(): JSBundleProvider {
    if (this.rnohCoreContext && this.rnohCoreContext.isDebugModeEnabled) {
      return new MetroJSBundleProvider();
    }
    if (!this.rnohCoreContext) {
      throw new Error('RNOH 上下文尚未初始化');
    }
    return new ResourceJSBundleProvider(this.rnohCoreContext.uiAbilityContext.resourceManager, 'bundle.harmony.js');
  }

  /**
   * 将系统返回交给 RN 导航处理。
   * @returns 是否已消费系统返回事件。
   */
  onBackPress(): boolean {
    if (!this.rnohCoreContext) {
      return false;
    }
    this.rnohCoreContext.dispatchBackPress();
    return true;
  }

  build() {
    Column() {
      if (this.rnohCoreContext) {
        if (this.rnohCoreContext && this.rnohCoreContext.isDebugModeEnabled) {
          RNOHErrorDialog({ ctx: this.rnohCoreContext });
        }
        RNApp({
          appKey: 'HybridApp',
          rnInstanceConfig: {
            createRNPackages,
            enableNDKTextMeasuring: true,
            enableCAPIArchitecture: true,
            enableBackgroundExecutor: false,
            arkTsComponentNames: []
          },
          jsBundleProvider: this.bundleProvider()
        });
      }
    }.width('100%').height('100%');
  }
}
