@echo off
call "%~dp0portable-env.cmd"
cd /d "%~dp0.."
set "DATABASE_URL=file:C:/Users/davi.souza/Documents/Antares/packages/database/prisma/dev.db"
call npm run dev -w @antares/api
