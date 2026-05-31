param(
  [string]$ProjectDir,
  [string]$EnvFile = ".env"
)

$path = Join-Path $ProjectDir $EnvFile
if (-not (Test-Path $path)) {
  Write-Warning ".env not found at $path - release build may embed localhost URLs"
  return
}

Get-Content $path -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq '' -or $line.StartsWith('#')) { return }
  $idx = $line.IndexOf('=')
  if ($idx -lt 1) { return }
  $key = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1).Trim()
  if ($key) {
    Set-Item -Path "env:$key" -Value $value
  }
}

$sharedUrl = ${env:EXPO_PUBLIC_SHARED_API_URL}
Write-Host "Loaded $EnvFile (EXPO_PUBLIC_SHARED_API_URL=$sharedUrl)"
