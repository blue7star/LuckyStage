@echo off
cd /d "%~dp0"
echo Starting lottery server. Keep this window open while using the site.
call npm start
echo.
echo Server stopped. Check the message above.
pause
