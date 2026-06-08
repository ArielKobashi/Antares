param(
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectName = Split-Path $root -Leaf

if (-not $OutputPath) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $OutputPath = Join-Path (Split-Path $root -Parent) "$projectName-$stamp.zip"
}

$excludeDirs = @(
  "node_modules",
  ".tools",
  "dist",
  "build",
  ".vite",
  ".turbo",
  "coverage",
  "uploads",
  ".git"
)

$excludeFiles = @(
  ".env",
  ".env.local",
  "dev.db",
  "dev.db-journal"
)

$temp = Join-Path ([System.IO.Path]::GetTempPath()) "$projectName-package-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $temp | Out-Null
$target = Join-Path $temp $projectName
New-Item -ItemType Directory -Path $target | Out-Null

Get-ChildItem -Path $root -Force | ForEach-Object {
  if ($_.PSIsContainer -and ($excludeDirs -contains $_.Name)) { return }
  if (-not $_.PSIsContainer -and ($excludeFiles -contains $_.Name)) { return }

  $destination = Join-Path $target $_.Name
  Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force
}

Get-ChildItem -Path $target -Recurse -Force | Where-Object {
  ($_.PSIsContainer -and ($excludeDirs -contains $_.Name)) -or
  (-not $_.PSIsContainer -and ($excludeFiles -contains $_.Name)) -or
  ($_.Name -like "*.log")
} | Sort-Object FullName -Descending | Remove-Item -Recurse -Force

if (Test-Path $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

Compress-Archive -Path $target -DestinationPath $OutputPath -Force
Remove-Item -LiteralPath $temp -Recurse -Force

Write-Host "Pacote criado em: $OutputPath"
