@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 案件管理系統

rem 第一次啟動時，若尚未安裝套件則自動安裝（呼應 CLAUDE.md：首次執行自動檢查下載）
if not exist "node_modules" (
  echo.
  echo 第一次啟動，正在安裝必要套件，請稍候約 3-5 分鐘...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [錯誤] 套件安裝失敗，請確認已安裝 Node.js（https://nodejs.org）。
    pause
    exit /b 1
  )
)

echo.
echo ============================================
echo    正在啟動案件管理系統...
echo    稍候瀏覽器會自動開啟，請勿關閉這個視窗
echo    （關閉視窗系統就會停止；用完直接關閉即可）
echo ============================================
echo.

call npm start

echo.
echo 系統已停止。按任意鍵關閉視窗。
pause >nul
