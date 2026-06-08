@echo off
call "%~dp0portable-env.cmd"
cd /d "%~dp0.."
call "%~dp0portable-stop.cmd"
set "DATABASE_URL=file:./packages/database/prisma/dev.db"
start "ANTARES API" cmd /k call "%~dp0portable-api.cmd"
start "ANTARES Web" cmd /k call "%~dp0portable-web.cmd"
