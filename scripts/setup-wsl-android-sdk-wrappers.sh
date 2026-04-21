#!/usr/bin/env bash
set -euo pipefail

sdk_root="/mnt/c/Users/vladf/AppData/Local/Android/Sdk"

if [ ! -d "$sdk_root/build-tools" ]; then
  echo "Android SDK build-tools directory not found: $sdk_root/build-tools" >&2
  exit 1
fi

exe_tools=(
  aapt
  aapt2
  aidl
  bcc_compat
  dexdump
  llvm-rs-cc
  split-select
  zipalign
  aarch64-linux-android-ld
  arm-linux-androideabi-ld
  i686-linux-android-ld
  x86_64-linux-android-ld
)

bat_tools=(
  apksigner
  d8
)

for dir in "$sdk_root"/build-tools/*; do
  [ -d "$dir" ] || continue
  version="$(basename "$dir")"

  for tool in "${exe_tools[@]}"; do
    if [ -f "$dir/$tool.exe" ]; then
      cat >"$dir/$tool" <<EOF
#!/usr/bin/env bash
"$sdk_root/build-tools/$version/$tool.exe" "\$@"
EOF
      chmod +x "$dir/$tool"
    fi
  done

  for tool in "${bat_tools[@]}"; do
    if [ -f "$dir/$tool.bat" ]; then
      windows_sdk_root='C:\\Users\\vladf\\AppData\\Local\\Android\\Sdk'
      cat >"$dir/$tool" <<EOF
#!/usr/bin/env bash
cmd.exe /C "${windows_sdk_root}\\build-tools\\$version\\$tool.bat" "\$@"
EOF
      chmod +x "$dir/$tool"
    fi
  done
done

echo "WSL wrappers generated for Android build-tools under $sdk_root"
