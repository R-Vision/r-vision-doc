#!/bin/bash

log() {
    echo $1
    echo $1 >> convert_log.log
}

error() {
    read -rsp $'Press any key to continue...\n' -n1 key
    exit $1
}


if [ -f convert_log.log ]; then
    echo "" > convert_log.log
fi

if [ -d .tmp ]; then
    rm -rf .tmp
fi

if [ ! -f "src/index.html" ]; then
    log "ERROR: No files in src directory. Please, put exported documentation into src folder"
    error 1
fi

log "Starting documentation convertion..."

log "Creating temp folder"
mkdir -p .tmp >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot create temp folder"
    error 2
fi

log "Copying source files to temp folder..."
cp -R src/* .tmp >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot copy files to temp folder"
    error 3
fi

log "Applying documentation patch..."
patch src/assets/css/content-style.css -i patches/content-style.css.patch -o .tmp/assets/css/content-style.css

if [ $? -ne 0 ]; then
    log "ERROR: Cannot apply documentation patch"
    error 4
fi

patch src/assets/css/theme.main.css -i patches/theme.main.css.patch -o .tmp/assets/css/theme.main.css

if [ $? -ne 0 ]; then
    log "ERROR: Cannot apply documentation patch"
    error 4
fi

patch src/assets/js/theme.main.js -i patches/theme.main.js.patch -o .tmp/assets/js/theme.main.js

if [ $? -ne 0 ]; then
    log "ERROR: Cannot apply documentation patch"
    error 4
fi

log "Adding cyrillic search patch..."
pushd docfixer >> convert_log.log

npm i >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot update modules, please, check is NPM is installed"
    error 5
fi

node index.js ../.tmp >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot apply cyrillic search patch"
    error 6
fi

popd >> convert_log.log

log "Removing old documentation files..."
rm -rf html/ru >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot remove old documentation files"
    error 7
fi

rm -rf html/en >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot remove old documentation files"
    error 7
fi

log "Copying new documentation files..."
cp -R .tmp html/ru >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot copy new documentation files"
    error 8
fi

cp -R .tmp html/en >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot copy new documentation files"
    error 8
fi

log "Removing temp folder..."
rm -rf .tmp >> convert_log.log

if [ $? -ne 0 ]; then
    log "ERROR: Cannot remove temp folder"
    error 9
fi

log "Done!"