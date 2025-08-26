@echo off
REM Batch script to enable or disable headless autostart on Windows machines

for %%I in ("%~dp0\..\depinus.exe") do set PROGRAM_PATH=%%~fI
set PROGRAM_ARGS=--headless
set AUTOSTART_NAME=DepinusHeadless

if "%1"=="" (
    echo Usage: %0 enable ^| disable
    pause
    exit /b
)

if /i "%1"=="enable" (
    reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v %AUTOSTART_NAME% /t REG_SZ /d "\"%PROGRAM_PATH%\" %PROGRAM_ARGS%" /f
    exit /b
)

if /i "%1"=="disable" (
    reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v %AUTOSTART_NAME% /f
    exit /b
)

echo Usage: %0 enable ^| disable
