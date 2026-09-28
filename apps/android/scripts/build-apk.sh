#!/bin/sh
set -eu

android_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_dir=$(CDPATH= cd -- "$android_dir/../.." && pwd)
cache_dir="$repo_dir/.cache/android"
output_dir="$repo_dir/dist/rn/android/app/release"

if [ -n "${ANDROID_HOME:-}" ]; then
  sdk_dir="$ANDROID_HOME"
elif [ -n "${ANDROID_SDK_ROOT:-}" ]; then
  sdk_dir="$ANDROID_SDK_ROOT"
elif [ -d "$HOME/Library/Android/sdk" ]; then
  sdk_dir="$HOME/Library/Android/sdk"
else
  sdk_dir="/opt/homebrew/share/android-commandlinetools"
fi

# Gradle 缓存与中间文件统一放入 .cache/android/；Release 内嵌本次构建的 RN bundle。
export GRADLE_USER_HOME="$cache_dir/gradle"
export ANDROID_HOME="$sdk_dir"
export TARO_ENV=rn
export NODE_ENV=production

cd "$android_dir"
./gradlew :app:assembleRelease

mkdir -p "$output_dir"
cp "$cache_dir/build/app/outputs/apk/release/app-release.apk" "$output_dir/HybridApp.apk"

printf '\n已生成 Android Release APK：%s/HybridApp.apk\n' "$output_dir"
