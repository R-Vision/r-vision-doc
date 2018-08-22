'use strict';

const fs = require('fs');
const path = require('path');

const lunr = require('lunr');
const Entities = require('html-entities').AllHtmlEntities;
const stripTags = require('striptags');

require('lunr-languages/lunr.stemmer.support.js')(lunr);
require('lunr-languages/lunr.multi.js')(lunr);
require('lunr-languages/lunr.ru.js')(lunr);

const entities = new Entities();

if (process.argv.length <= 2) {
  console.log(`Usage: ${__filename} path/to/directory/with/docs`);
  process.exit(-1);
}

const docsPath = process.argv[2];
let fileId = 0;

/**
 * Обработчик прочтения документа.
 *
 * @param {String} data - Прочитанный документ
 * @param {String} fileName - Имя документа
 * @return {Object} - Объект содержащий: id докумета, заголовочную часть, тело
 */
function onReadDoc(data, fileName) {
  let match = data.match(/<title[^>]*>([^<]*?)\s\-\s[\w|\s\-]*<\/title>/i);
  if (match === null) {
    if (fileName !== 'index.html') {
      throw new Error(`File is does not have title: ${fileName}`);
    }
    return null;
  }

  const title = entities.decode(match[1]);

  match = data.match(/data-index-for-search="true"[^>]*>([\s\S]+?)<\/div>\s+<\/article>/i);
  if (match === null) {
    if (fileName !== 'search.html') {
        throw new Error(`File is does not have body: ${fileName}`);
    }
    return null;
  }

  const body = entities.decode(stripTags(match[1]));
  return { id: ++fileId, title, body };
}

/**
 * Построить индекс ключевых слов
 *
 * @see RVN-3541
 * @param {Array} dataToIndex - Массив данных Lunr для построения индекса
 * @return {String} - строка с содержимым для файла индексов
 */
function buildIndex(dataToIndex) {
  const index = lunr((builder) => {
    builder.use(lunr.multiLanguage('en', 'ru'));
    builder.ref('id');
    builder.field('title');
    builder.field('body');
    builder.searchPipeline = lunr.Pipeline.load([
      'lunr-multi-trimmer-en-ru',
      'stemmer',
      'stemmer-ru',
    ]);
    for (let i = 0; i !== dataToIndex.length; ++i) {
      builder.add(dataToIndex[i]);
    }
  });

  return `lunr.multiLanguage('en', 'ru'); var lunrIndex = ${JSON.stringify(index)};`;
}

/**
 * Записать изменения в файл
 *
 * @see RVN-3541
 * @param {String} data - Данные для записи
 * @param {String} path - Путь для записи
 */
function writeFile(data, path) {
  fs.writeFileSync(path, data);
}

/**
 * Копирование файлов
 *
 * @see RVN-3541
 * @param {Array} paths - Пути к исходным файлам
 * @param {String} to - Директория назначения
 */
function copyFiles(paths, to) {
  if (fs.existsSync(to)) { fs.unlinkSync(to); }

  const writeStream = fs.createWriteStream(to);

  for (let i = 0; i !== paths.length; ++i) {
    fs.createReadStream(paths[i]).pipe(writeStream);
  }
}

/**
 * Запуск сканирования документации
 *
 * @see RVN-3541
 * @param {Array} items - Массив документов
 */
function scanDocs(items) {
  const dataToIndex = [];
  const documentList = [];
  for (let i = 0; i !== items.length; ++i) {
    const fileName = items[i];
    if (!/\.html$/.test(fileName)) {
      console.log(`Skipped ${fileName}`);
      continue;
    }

    let data = fs.readFileSync(path.join(docsPath, fileName), 'utf8');
    data = onReadDoc(data, fileName);
    if (data !== null) {
      dataToIndex.push(data);
      documentList.push({ id: data.id, title: data.title, link: fileName });
    }
  }

  const lunrIndexContents = buildIndex(dataToIndex);
  const lunrDataContents = `var lunrData = ${JSON.stringify(documentList)};`;

  writeFile(lunrIndexContents, path.join(docsPath, 'js/lunr-index.js'));
  writeFile(lunrDataContents, path.join(docsPath, 'js/lunr-data.js'));
  copyFiles([
    path.resolve(__dirname, 'node_modules/lunr/lunr.js'),
  ], path.join(docsPath, 'js/lunr.js'));
  copyFiles([
      path.resolve(__dirname, 'node_modules/lunr-languages/lunr.stemmer.support.js'),
      path.resolve(__dirname, 'node_modules/lunr-languages/lunr.multi.js'),
      path.resolve(__dirname, 'node_modules/lunr-languages/lunr.ru.js'),
  ], path.join(docsPath, 'js/lunr-extras.js'));
}

try {
  scanDocs(fs.readdirSync(docsPath));
} catch (e) {
  console.error(e.message);
  process.exit(-1);
}
