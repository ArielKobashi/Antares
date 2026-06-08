@echo off
set "PROJECT_ROOT=%~dp0.."
set "NODE_HOME="

if exist "%PROJECT_ROOT%\.tools\node-v24.16.0-win-x64\node.exe" set "NODE_HOME=%PROJECT_ROOT%\.tools\node-v24.16.0-win-x64"
if not defined NODE_HOME if exist "%PROJECT_ROOT%\.tools\node-v22.22.3-win-x64\node.exe" set "NODE_HOME=%PROJECT_ROOT%\.tools\node-v22.22.3-win-x64"

if defined NODE_HOME set "PATH=%NODE_HOME%;%PATH%"
if defined NODE_HOME (
  set "NODE_EXE=%NODE_HOME%\node.exe"
) else (
  set "NODE_EXE=node"
)
