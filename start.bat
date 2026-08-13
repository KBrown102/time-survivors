@echo off
chcp 65001 >nul
title Time Survivors · 本地服务器
echo 正在启动本地服务器...
echo.
node "%~dp0server.js"
pause
