$ErrorActionPreference = "Stop"
chcp 65001 | Out-Null

$ProjectDir = "C:\My files\mobile-app-recent"
$AndroidDir = Join-Path $ProjectDir "android"
$KeystorePath = Join-Path $AndroidDir "app\debug.keystore"

$env:CI = "1"
$env:NODE_BINARY = "C:\nvm4w\nodejs\node.exe"
$env:ANDROID_HOME = "C:\Users\vladf\AppData\Local\Android\Sdk"

& (Join-Path $ProjectDir "scripts\load-dotenv.ps1") -ProjectDir $ProjectDir
$env:NODE_ENV = "production"

'sdk.dir=C:/Users/vladf/AppData/Local/Android/Sdk' | Set-Content (Join-Path $AndroidDir "local.properties") -Encoding ascii

if (-not (Test-Path $KeystorePath)) {
  keytool -genkey -v -keystore $KeystorePath -storepass android -alias androiddebugkey -keypass android `
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
}

# Do NOT run `gradlew clean` here: CMake/native clean breaks when project path contains spaces ("My files").
$bundleDirs = @(
  "$AndroidDir\app\build\generated\assets\createBundleReleaseJsAndAssets",
  "$AndroidDir\app\build\intermediates\assets\release",
  "$AndroidDir\app\build\intermediates\sourcemaps\react\release"
)
foreach ($dir in $bundleDirs) {
  if (Test-Path $dir) {
    Write-Host "Removing stale bundle: $dir"
    Remove-Item -Recurse -Force $dir
  }
}

Set-Location $AndroidDir
Write-Host "Building release APK (fresh JS bundle from .env)..."
& .\gradlew.bat :app:createBundleReleaseJsAndAssets :app:assembleRelease --rerun-tasks --no-daemon

$ApkPath = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $ApkPath)) {
  Write-Host "APK not found"
  exit 1
}

$appConfigPath = Join-Path $AndroidDir "app\build\intermediates\assets\release\mergeReleaseAssets\app.config"
if (Test-Path $appConfigPath) {
  $cfg = Get-Content $appConfigPath -Raw
  if ($cfg -match '"sharedApiUrl":"([^"]+)"') {
    Write-Host "APK API URL (app.config): $($Matches[1])"
  }
}

Write-Host "APK built: $ApkPath"
Get-Item $ApkPath
