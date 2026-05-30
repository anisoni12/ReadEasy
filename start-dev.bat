@echo off
cd /d d:\Projects\ReadEasy\artifacts\readeasy
npx vite --config vite.config.ts --host 0.0.0.0 > ..\vite-log.txt 2>&1
