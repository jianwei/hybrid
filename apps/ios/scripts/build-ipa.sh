#!/bin/sh
set -eu

ios_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_dir=$(CDPATH= cd -- "$ios_dir/../.." && pwd)
team_id=${IOS_TEAM_ID:-}
export_method=${IOS_EXPORT_METHOD:-debugging}

if [ "$#" -ne 0 ]; then
  printf '%s\n' '此命令不接受位置参数；请通过 IOS_TEAM_ID、IOS_EXPORT_METHOD 和 IOS_BUNDLE_ID 配置。' >&2
  exit 1
fi

case "$export_method" in
  debugging|release-testing) ;;
  *)
    printf '%s\n' 'IOS_EXPORT_METHOD 仅支持 debugging（开发测试）或 release-testing（Ad Hoc 测试分发）。' >&2
    exit 1
    ;;
esac

if [ "${#team_id}" -ne 10 ] || printf '%s' "$team_id" | LC_ALL=C grep -q '[^A-Z0-9]'; then
  printf '%s\n' '请设置 IOS_TEAM_ID 为 Apple Developer 团队的 10 位 Team ID。签名准备步骤见 apps/ios/README.md。' >&2
  exit 1
fi

if [ -n "${IOS_BUNDLE_ID:-}" ]; then
  case "$IOS_BUNDLE_ID" in
    *[!A-Za-z0-9.-]*)
      printf '%s\n' 'IOS_BUNDLE_ID 只能包含字母、数字、句点和连字符，且须对应团队的 App ID。' >&2
      exit 1
      ;;
  esac
fi

# 先检查本机身份，避免无签名条件下仍耗时编译 RN 和原生依赖。
if ! /usr/bin/security find-identity -v -p codesigning | grep -Eq '[1-9][0-9]* valid identities found'; then
  printf '%s\n' '本机没有有效的代码签名身份（证书及私钥）。请先在 Xcode 配置团队、证书和描述文件，再重试；当前无法生成可安装的真机 IPA。' >&2
  exit 1
fi

pnpm --dir "$ios_dir" run bundle

cache_dir="$repo_dir/.cache/ios"
mkdir -p "$cache_dir"
staging_dir=$(mktemp -d "$cache_dir/ipa.XXXXXX")
trap 'rm -rf "$staging_dir"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
archive_path="$staging_dir/HybridApp.xcarchive"
export_path="$staging_dir/export"
options_path="$staging_dir/ExportOptions.plist"

# 仅使用已安装的签名材料；不允许命令行创建或更新开发者账号下的证书和描述文件。
set -- "DEVELOPMENT_TEAM=$team_id" CODE_SIGN_STYLE=Automatic
if [ -n "${IOS_BUNDLE_ID:-}" ]; then
  set -- "$@" "HYBRID_BUNDLE_IDENTIFIER=$IOS_BUNDLE_ID"
fi

xcodebuild \
  -workspace "$ios_dir/HybridApp.xcworkspace" \
  -scheme HybridApp \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$cache_dir/DerivedData-device" \
  -archivePath "$archive_path" \
  "$@" \
  archive

# Team ID 和导出方式已限制字符范围；自动签名由 Xcode 选择与 App ID 匹配的本机描述文件。
cat > "$options_path" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>$export_method</string>
  <key>teamID</key><string>$team_id</string>
  <key>signingStyle</key><string>automatic</string>
  <key>destination</key><string>export</string>
  <key>thinning</key><string>&lt;none&gt;</string>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
  -archivePath "$archive_path" \
  -exportOptionsPlist "$options_path" \
  -exportPath "$export_path"

set -- "$export_path"/*.ipa
if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  printf '%s\n' 'Xcode 未导出唯一的 IPA，未更新 dist/ios/ipa。' >&2
  exit 1
fi

output_dir="$repo_dir/dist/ios"
ipa_delivery_dir="$staging_dir/ipa"
mkdir -p "$ipa_delivery_dir"
cp "$1" "$ipa_delivery_dir/"
mkdir -p "$output_dir/ipa" "$output_dir/archive/HybridApp.xcarchive"
/usr/bin/rsync -a --delete "$archive_path/" "$output_dir/archive/HybridApp.xcarchive/"
/usr/bin/rsync -a --delete "$ipa_delivery_dir/" "$output_dir/ipa/"
printf '\n已生成真机 IPA：%s/ipa/%s\n' "$output_dir" "$(basename "$1")"
