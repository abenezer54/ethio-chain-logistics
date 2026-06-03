param(
  [string]$BaseUrl = $env:BASE_URL
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$installScript = Join-Path $PSScriptRoot "install_k6.ps1"
$loadTest = Join-Path $repoRoot "..\backend\load-test.k6.js"
$report = Join-Path $repoRoot "load-report.json"

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = "http://localhost:8080"
}

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
  Write-Host "k6 not found on PATH, installing it locally..."
  & $installScript
}

$k6Exe = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6Exe) {
  $candidateRoots = @(
    "C:\tools\k6",
    (Join-Path $env:USERPROFILE "AppData\Local\Programs\k6")
  )
  foreach ($root in $candidateRoots) {
    if (Test-Path $root) {
      $found = Get-ChildItem -Path $root -Filter k6.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($found) {
        $k6Exe = $found.FullName
        break
      }
    }
  }
}

if (-not $k6Exe) {
  throw "k6 was not found after installation. Reopen PowerShell or run frontend/scripts/install_k6.ps1 manually."
}

if ($k6Exe -is [System.Management.Automation.CommandInfo]) {
  $k6Path = $k6Exe.Source
} else {
  $k6Path = $k6Exe
}

& $k6Path run $loadTest --out "json=$report" -e "BASE_URL=$BaseUrl"