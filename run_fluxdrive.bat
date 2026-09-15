@echo off
echo ========================================================
echo   FLUXDRIVE - Ephemeral Privacy-First Workspace
echo ========================================================
echo.

echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "FluxDrive Backend" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

timeout /t 2 >nul

echo Starting Frontend on http://localhost:5173 ...
cd frontend
start "FluxDrive Frontend" cmd /k "npm run dev"

echo.
echo FluxDrive is running!
echo - Frontend UI: http://localhost:5173
echo - Backend API: http://127.0.0.1:8000/docs
echo ========================================================
