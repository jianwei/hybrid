#!/bin/sh
set -eu

ios_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_dir=$(CDPATH= cd -- "$ios_dir/../.." && pwd)
derived_data="$repo_dir/.cache/ios/DerivedData"
app_name="HybridApp.app"
product_dir="Release-iphonesimulator"
output_dir="$repo_dir/dist/ios/app/$product_dir"

# Xcode 中间文件独立缓存；只有成功构建的模拟器 App 才复制到交付目录。
xcodebuild \
  -workspace "$ios_dir/HybridApp.xcworkspace" \
  -scheme HybridApp \
  -configuration Release \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$derived_data" \
  CODE_SIGNING_ALLOWED=NO \
  build

mkdir -p "$output_dir/$app_name"
/usr/bin/rsync -a --delete \
  "$derived_data/Build/Products/$product_dir/$app_name/" \
  "$output_dir/$app_name/"

printf '\n已生成 iOS 模拟器 App：%s/%s\n' "$output_dir" "$app_name"
