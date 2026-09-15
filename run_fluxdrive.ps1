Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  FLUXDRIVE - Ephemeral Privacy-First Workspace" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$workspace = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace'; python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

Write-Host "Starting Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\frontend'; npm run dev"

Write-Host ""
Write-Host "FluxDrive is running!" -ForegroundColor Green
Write-Host "  Frontend UI: http://localhost:5173" -ForegroundColor Green
Write-Host "  Backend API: http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
