#!/bin/sh
set -eu

harmony_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_dir=$(CDPATH= cd -- "$harmony_dir/../.." && pwd)
output_dir="$repo_dir/dist/harmony/app"

# 定位华为 Command Line Tools：优先 HARMONY_CLT 环境变量，其次默认下载目录。
# Emulator 依赖中文 locale，否则会拒绝启动（仅限中国大陆能力）。
export LANG=zh_CN.UTF-8 LC_ALL=zh_CN.UTF-8
if [ -z "${HARMONY_CLT:-}" ]; then
  for candidate in "$HOME/command-line-tools" "$HOME/Downloads/command-line-tools"; do
    if [ -x "$candidate/bin/hvigorw" ]; then
      HARMONY_CLT="$candidate"
      break
    fi
  done
fi
if [ -z "${HARMONY_CLT:-}" ] || [ ! -x "$HARMONY_CLT/bin/hvigorw" ]; then
  echo "未找到 Command Line Tools，请设置 HARMONY_CLT 指向解压目录（应包含 bin/hvigorw）。" >&2
  exit 1
fi
export PATH="$HARMONY_CLT/bin:$PATH"

# 先编译 Taro 页面并注入本工程；插件经 which ohpm 自动安装 ohpm 依赖。
(cd "$repo_dir" && pnpm --filter taro run build:harmony)

cd "$harmony_dir"
ohpm install --all
hvigorw assembleHap --mode module -p product=default -p buildMode=debug --no-daemon

mkdir -p "$output_dir"
hap_file="$harmony_dir/entry/build/default/outputs/default/default-default-unsigned.hap"
if [ ! -f "$hap_file" ]; then
  echo "未找到 HAP 产物：$hap_file" >&2
  exit 1
fi
cp "$hap_file" "$output_dir/HybridApp-debug.hap"

printf '\n已生成 HarmonyOS HAP（未签名，可安装到模拟器）：%s/HybridApp-debug.hap\n' "$output_dir"
