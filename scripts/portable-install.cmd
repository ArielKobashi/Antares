@echo off
call "%~dp0portable-env.cmd"
cd /d "%~dp0.."
if not exist ".env" copy ".env.example" ".env"
call npm install
