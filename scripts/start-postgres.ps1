# Start local PostgreSQL (when Windows service is not registered)
$pgCtl = "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe"
$dataDir = "C:\Program Files\PostgreSQL\16\data"
$logFile = "$dataDir\server.log"

$status = & $pgCtl -D $dataDir status 2>&1 | Out-String
if ($status -match "server is running") {
  Write-Host "PostgreSQL is already running." -ForegroundColor Green
} else {
  Write-Host "Starting PostgreSQL..." -ForegroundColor Cyan
  & $pgCtl -D $dataDir -l $logFile start
  Write-Host "Started. Log: $logFile" -ForegroundColor Green
}
