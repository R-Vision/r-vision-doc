@echo off

RMDIR /S /Q html/ru
RMDIR /S /Q html/en

XCOPY /s /e src html/ru
XCOPY /s /e src html/en

git apply documentation.patch

node docfixer/index.js html/ru
node docfixer/index.js html/en
