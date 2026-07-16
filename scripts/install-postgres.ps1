# Run this script in PowerShell AS ADMINISTRATOR (right-click → Run as administrator)
# Installs PostgreSQL 16 and creates the app database.

$ErrorActionPreference = "Stop"

$pgPassword = "postgres"
$dbName = "content_generator"
$pgVersion = "16"

Write-Host "=== Installing PostgreSQL $pgVersion ===" -ForegroundColor Cyan

winget install PostgreSQL.PostgreSQL.$pgVersion `
  --accept-package-agreements `
  --accept-source-agreements `
  --disable-interactivity

$pgBin = "C:\Program Files\PostgreSQL\$pgVersion\bin"
if (-not (Test-Path $pgBin)) {
  Write-Host "PostgreSQL bin not found at $pgBin" -ForegroundColor Red
  Write-Host "If the installer is still running, wait for it to finish, then run: .\scripts\init-db.ps1"
  exit 1
}

$env:Path = "$pgBin;$env:Path"

Write-Host "`n=== Waiting for PostgreSQL service ===" -ForegroundColor Cyan
$serviceName = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Name
if ($serviceName) {
  Start-Service $serviceName -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

& "$PSScriptRoot\init-db.ps1" -Password $pgPassword -Database $dbName

$projectRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $projectRoot ".env"
$connectionString = "postgresql://postgres:${pgPassword}@localhost:5432/${dbName}"

@"
DATABASE_URL="$connectionString"
"@ | Set-Content -Path $envFile -Encoding utf8

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Updated .env with:"
Write-Host "  $connectionString"
Write-Host "`nNext (in a normal terminal, from project folder):"
Write-Host "  npm run db:setup"
Write-Host "  npm run dev"
