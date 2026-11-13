@echo off
cd /d "C:\Users\JTonin\Documents\Cursor Projects\Content Generator Tool"
title SEO Turtle Tool
echo Starting SEO Turtle Tool...
echo Freeing ports 47821 / 55432 if a previous instance is stuck...
for %%P in (47821 55432) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    if not "%%A"=="0" taskkill /PID %%A /F >nul 2>&1
  )
)
call npm run desktop:dev
if errorlevel 1 pause
