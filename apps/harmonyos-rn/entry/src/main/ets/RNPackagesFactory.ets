import { RNPackage, RNPackageContext } from '@rnoh/react-native-openharmony/ts';
import { GestureHandlerPackage } from '@react-native-oh-tpl/react-native-gesture-handler/ts';
import { SafeAreaViewPackage } from '@react-native-oh-tpl/react-native-safe-area-context/ts';

/**
 * 注册共享 Taro 导航使用的鸿蒙原生模块。
 * @param ctx - RNOH 包上下文。
 * @returns 已连接的原生模块。
 */
export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  return [new GestureHandlerPackage(ctx), new SafeAreaViewPackage(ctx)];
}
