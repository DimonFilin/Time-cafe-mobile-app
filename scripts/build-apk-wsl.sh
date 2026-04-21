#!/bin/bash
# Build APK for Android (run from WSL).
# Prerequisites: Java 17 (openjdk-17-jdk), Android SDK.
# Optional: use Windows SDK from WSL: ANDROID_HOME=/mnt/c/Users/YOUR_USER/AppData/Local/Android/Sdk

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "Project dir: $PROJECT_DIR"

# Java
if ! command -v java &>/dev/null; then
  echo "Java not found. Install: sudo apt update && sudo apt install -y openjdk-17-jdk"
  exit 1
fi
echo "Java: $(java -version 2>&1 | head -1)"

# Android SDK: use ANDROID_HOME or default WSL path to Windows SDK
if [ -z "$ANDROID_HOME" ]; then
  WIN_USER="${USER}"
  if [ -n "$WSL_USER" ]; then WIN_USER="$WSL_USER"; fi
  for u in "$WIN_USER" "vladf" "User"; do
    CANDIDATE="/mnt/c/Users/$u/AppData/Local/Android/Sdk"
    if [ -d "$CANDIDATE" ]; then
      export ANDROID_HOME="$CANDIDATE"
      break
    fi
  done
fi
if [ -z "$ANDROID_HOME" ] || [ ! -d "$ANDROID_HOME" ]; then
  echo "ANDROID_HOME not set or not found. Set it to Android SDK path (e.g. export ANDROID_HOME=/mnt/c/Users/vladf/AppData/Local/Android/Sdk)"
  exit 1
fi
echo "ANDROID_HOME: $ANDROID_HOME"

# local.properties for WSL (Unix path to SDK)
LP="$PROJECT_DIR/android/local.properties"
echo "sdk.dir=$ANDROID_HOME" > "$LP"
echo "Written $LP"

# Debug keystore (required by build.gradle)
KEYSTORE="$PROJECT_DIR/android/app/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
  echo "Creating debug.keystore..."
  keytool -genkey -v -keystore "$KEYSTORE" -storepass android -alias androiddebugkey -keypass android \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
fi

# Build
cd "$PROJECT_DIR/android"
echo "Running Gradle assembleRelease..."
./gradlew assembleRelease

APK="$PROJECT_DIR/android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  echo "APK built: $APK"
  ls -la "$APK"
else
  echo "APK not found at $APK"
  exit 1
fi
