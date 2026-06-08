@echo off
call "%~dp0portable-env.cmd"
cd /d "%~dp0.."
set "VITE_API_URL=http://localhost:3333/api/v1"
call npm run dev -w @antares/web
