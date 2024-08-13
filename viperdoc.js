const fs = require("fs-extra");
const path = require("path");
const ejs = require("ejs");
const marked = require("marked");
const hljs = require("highlight.js");

hljs.registerLanguage("silver", require("./syntax-silver.js"));

function extractSourceSnippet(sourcePath, position) {
  const [begLine, begCol] = position[0].split('@')[1].split('.').map(Number);
  const [endLine, endCol] = position[1].split('@')[1].split('.').map(Number);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const lines = source.split('\n');

  let snippet = '';
  if (begLine === endLine) {
    snippet = lines[begLine - 1].slice(begCol - 1, endCol - 1);
  } else {
    snippet += lines[begLine - 1].slice(begCol - 1) + '\n';
    for (let i = begLine; i < endLine - 1; i++) {
      snippet += lines[i] + '\n';
    }
    snippet += lines[endLine - 1].slice(0, endCol - 1);
  }
  return snippet;
}

function highlightSource(sourcePath, pos) {
  let source = extractSourceSnippet(sourcePath, pos);
  return hljs.highlight(source, { language: 'silver' }).value;
}

// modulePath is needed when called from the VSCode extension
async function generateWebsite(sourcePath, jsonData, modulePath = __dirname) {
  const data = JSON.parse(jsonData);

  await fs.writeFile(path.join(path.dirname(sourcePath), 'test.txt'), sourcePath);

  const template = await fs.readFile(path.join(modulePath, 'template.ejs'), 'utf-8');
  const html = ejs.render(template, { data, marked, hljs, path, fs,
                                      highlightSource, sourcePath, modulePath });

  await fs.writeFile(path.join(path.dirname(sourcePath), 'output.html'), html);
}

module.exports = {
  generateWebsite
};

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
      console.error('Usage: node viperdoc.js <path/to/vpr-file> <path/to/json-file>');
      process.exit(1);
    }
    const [vprFile, jsonFile] = args;
    try {
      const jsonData = await fs.readFile(jsonFile, 'utf-8');
      await generateWebsite(vprFile, jsonData);
    } catch (error) {
      console.error('Error: ', error);
      process.exit(1);
    }
  })();
}
