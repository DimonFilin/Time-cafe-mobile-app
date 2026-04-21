# Build APK on Windows (PowerShell).
# Prerequisites: Java 17+, Android SDK (e.g. via Android Studio).
# ANDROID_HOME or local.properties must point to SDK.

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$AndroidDir = Join-Path $ProjectDir "android"
$KeystorePath = Join-Path $AndroidDir "app\debug.keystore"

Set-Location $ProjectDir
Write-Host "Project dir: $ProjectDir"

# Check Java
try {
  $javaVersion = java -version 2>&1
  Write-Host "Java: $($javaVersion[0])"
} catch {
  Write-Host "Java not found. Install JDK 17 and add to PATH."
  exit 1
}

# Debug keystore
if (-not (Test-Path $KeystorePath)) {
  Write-Host "Creating debug.keystore..."
  keytool -genkey -v -keystore $KeystorePath -storepass android -alias androiddebugkey -keypass android `
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
}

Set-Location $AndroidDir
Write-Host "Running Gradle assembleRelease..."
& .\gradlew.bat assembleRelease

$ApkPath = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
if (Test-Path $ApkPath) {
  Write-Host "APK built: $ApkPath"
  Get-Item $ApkPath
} else {
  Write-Host "APK not found at $ApkPath"
  exit 1
}
