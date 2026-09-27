#!/bin/sh
set -eu

# Debug 从 Metro 加载；Release 将 Taro 的 bundle 和图片等资源嵌入 App。
if [ "$CONFIGURATION" = "Debug" ]; then
  exit 0
fi

bundle_dir="$PROJECT_DIR/../../dist/ios/bundle"
if [ ! -s "$bundle_dir/main.jsbundle" ]; then
  echo "error: 缺少 RN bundle，请先在仓库根目录运行 pnpm build:ios。" >&2
  exit 1
fi

destination="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
mkdir -p "$destination"
/usr/bin/rsync -a --exclude='*.map' "$bundle_dir/" "$destination/"
