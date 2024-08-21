const fs = require("fs-extra");
const path = require("path");
const ejs = require("ejs");
const marked = require("marked");
const hljs = require("highlight.js");

hljs.registerLanguage("silver", require("./syntax-silver.js"));

function posFromStr(positionString) {
  const file = positionString[0].split("@")[0];
  const [begLine, begCol] = positionString[0].split("@")[1].split(".").map(Number);
  const [endLine, endCol] = positionString[1].split("@")[1].split(".").map(Number);
  return {file, begLine, begCol, endLine, endCol};
}

function filterOutDocLines(snippet) {
  let lines = snippet.split("\n").filter((line) => !line.trim().startsWith("///"));
  return lines.join("\n");
}

function extractSourceSnippet(source, position, ignoreColumns = true, filterDocLines = true) {
  const {file, begLine, begCol, endLine, endCol} = position;
  let lines = source.split("\n");
  let snippet = "";
  if (ignoreColumns) {
    for (let i = begLine - 1; i < endLine; i++) {
      snippet += lines[i] + "\n";
    }
  } else {
    if (begLine === endLine) {
      snippet += lines[begLine - 1].slice(begCol - 1, endCol - 1);
    } else {
      snippet += lines[begLine - 1].slice(begCol - 1) + "\n";
      for (let i = begLine; i < endLine - 1; i++) {
        snippet += lines[i] + "\n";
      }
      snippet += lines[endLine - 1].slice(0, endCol - 1);
    }
  }
  return filterDocLines ? filterOutDocLines(snippet) : snippet;
}

function highlightSource(source, posStr) {
  let sourceSnippet = extractSourceSnippet(source, posFromStr(posStr));
  return hljs.highlight(sourceSnippet, { language: "silver" }).value;
}

function createLinkLayer(linksSource, posStr) {
  return extractSourceSnippet(linksSource, posFromStr(posStr), true);
}

function insertLinksSource(filename, source, data) {
  function extractIdnRefPositions(data) {
    function extractRec(node, idnrefs) {
        if (node.nodeType === "IdnRef") {
          const name = node.info.name;
          const [line, begCol] = node.pos[0].split("@")[1].split(".").map(Number);
          const [endLine, endCol] = node.pos[1].split("@")[1].split(".").map(Number);
          if (line !== endLine) {
            console.error("Identifier spans multiple lines.");
          }
          idnrefs.push({ name, line, begCol, endCol });
        } else if (node.children) {
          node.children.forEach(child => extractRec(child, idnrefs));
        }
    }
    let idnrefs = [];
    extractRec(data, idnrefs);
    // the parse AST reorders local variable declarations
    return idnrefs.sort((a, b) => (a.line == b.line && a.begCol < b.begCol) || (a.line < b.line));
  }

  idnPositions = extractIdnRefPositions(data);
  curLine = 1;
  curCol = 1;
  let res = "";
  for (let i = 0; i < idnPositions.length; i++) {
    let idnpos = idnPositions[i];
    let idn = idnpos.name;
    let link = '<a href="#' + idn + '">' + idn + "</a>";
    // snippet between last and current identifier
    let snippetPos = {file: filename, begLine: curLine, begCol: curCol, endLine: idnpos.line, endCol: idnpos.begCol};
    let snippet = extractSourceSnippet(source, snippetPos, false, false);
    res += snippet + link;
    curLine = idnpos.line;
    curCol = idnpos.endCol;
  }

  return res;
}

// modulePath is needed when called from the VSCode extension
async function generateWebsite(sourcePath, jsonData, modulePath = __dirname) {
  const data = JSON.parse(jsonData);
  const source = fs.readFileSync(sourcePath, "utf8");

  const template = await fs.readFile(path.join(modulePath, "template.ejs"), "utf-8");
  const filename = path.basename(sourcePath);
  const linksSource = insertLinksSource(filename, source, data);
  const html = ejs.render(template, { data, marked, hljs, path, fs,
                                      highlightSource, filename, source, linksSource, createLinkLayer, modulePath });

  // console.log(insertLinksSource(path.basename(sourcePath), source, data));
  await fs.writeFile(path.join(path.dirname(sourcePath), "output.html"), html);
}

module.exports = {
  generateWebsite
};

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
      console.error("Usage: node viperdoc.js <path/to/vpr-file> <path/to/json-file>");
      process.exit(1);
    }
    const [vprFile, jsonFile] = args;
    try {
      const jsonData = await fs.readFile(jsonFile, "utf-8");
      await generateWebsite(vprFile, jsonData);
    } catch (error) {
      console.error("Error: ", error);
      process.exit(1);
    }
  })();
}
