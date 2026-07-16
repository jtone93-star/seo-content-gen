param(
  [string]$Password = "postgres",
  [string]$Database = "content_generator",
  [string]$PgVersion = "16"
)

$pgBin = "C:\Program Files\PostgreSQL\$PgVersion\bin"
$psql = Join-Path $pgBin "psql.exe"

if (-not (Test-Path $psql)) {
  throw "psql not found at $psql. Install PostgreSQL first."
}

$env:PGPASSWORD = $Password

Write-Host "Creating database '$Database' if it does not exist..." -ForegroundColor Cyan

$check = & $psql -U postgres -h localhost -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$Database'"
if ($check -ne "1") {
  & $psql -U postgres -h localhost -p 5432 -d postgres -c "CREATE DATABASE $Database;"
  Write-Host "Database created." -ForegroundColor Green
} else {
  Write-Host "Database already exists." -ForegroundColor Yellow
}
