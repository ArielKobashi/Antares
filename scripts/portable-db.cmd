@echo off
call "%~dp0portable-env.cmd"
cd /d "%~dp0.."
call "%~dp0portable-stop.cmd"
if not exist ".env" copy ".env.example" ".env"
set "ROOT_PATH=%CD:\=/%"
set "DATABASE_URL=file:%ROOT_PATH%/packages/database/prisma/dev.db"
if not exist ".tools" mkdir ".tools"
if exist "packages\database\prisma\dev.db" del "packages\database\prisma\dev.db"
call npm run db:generate
call "packages\database\node_modules\.bin\prisma.cmd" migrate diff --from-empty --to-schema-datamodel packages/database/prisma/schema.prisma --script > ".tools\sqlite-schema.sql"
call "%NODE_EXE%" "%~dp0..\scripts\apply-sqlite-schema.mjs"
call npm run db:seed
