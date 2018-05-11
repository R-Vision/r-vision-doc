
rm -rf html/ru
rm -rf html/en
cp -R src html/ru
cp -R src html/en

git apply documentation.patch

node docfixer/index.js html/ru
node docfixer/index.js html/en