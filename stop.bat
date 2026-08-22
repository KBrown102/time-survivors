@echo off
chcp 65001 >nul
title Time Survivors · 停止服务器
echo 正在停止 Time Survivors 本地服务器...
echo.
powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*time-survivors*server.js*' } | ForEach-Object { $_.Kill(); Write-Host ('  已停止 PID ' + $_.Id) }"
echo.
echo 完成。端口 5173 已释放。
echo.
pause
