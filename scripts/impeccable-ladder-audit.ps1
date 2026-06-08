param(
  [string]$Url = "",
  [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$targets = @(
  "theladder/index.html",
  "theladder/ladder.css",
  "theladder/ladder-app.js",
  "theladder/ladder-data.js"
)

if ($Url.Trim()) {
  $targets += $Url.Trim()
}

$argsList = @("impeccable", "detect")
if ($Json) {
  $argsList += "--json"
}
$argsList += $targets

Write-Host "Running Impeccable design detector for The Ladder..." -ForegroundColor Cyan
npx @argsList
