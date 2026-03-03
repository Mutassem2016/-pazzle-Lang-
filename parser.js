#!/usr/bin/env node
// parser.js - Pazzle Parser v14.2 (Bug-Fixed Edition)
const fs = require("fs");
const path = require("path");

// ✅ إصلاح #1 و #2: newInputsInCMD بيتملى الأول صح قبل ما parsePazzle تشتغل
let newInputsInCMD = [];
// ✅ إصلاح #4: inComment اتنقل جوه parsePazzle عشان متأثرش على ملفات تانية في watch mode

/* =========================================================================
   ERROR & WARNING SYSTEM
   ========================================================================= */

// ✅ إصلاح: بيقسم السطر على أول : وآخر () عشان يتعامل صح مع .trim() و.split() جوه الـ value
function parseVarEditorLine(line) {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;

  const left = line.substring(0, colonIdx).trim();
  const rest = line.substring(colonIdx + 1).trim();
  const parenIdx = rest.indexOf('(');
  if (parenIdx === -1) return null;

  const property = rest.substring(0, parenIdx).trim();
  const lastParen = rest.lastIndexOf(')');
  if (lastParen === -1) return null;

  const value = rest.substring(parenIdx + 1, lastParen).trim();

  // تأكد إن الـ property كلمة واحدة بس (مش expression)
  if (!/^[A-Za-z_]\w*$/.test(property)) return null;

  return { varName: left, property, value };
}

function PazzleError(line, msg) {
  throw new Error(`PazzleError (line ${line}): ${msg}`);
}

function PazzleWarn(lineNo, msg) {
  console.warn(`[Pazzle Warning] (line ${lineNo}) ${msg}`);
}

function PazzleInfo(msg) {
  console.log(`[Pazzle Info] ${msg}`);
}

/* =========================================================================
   PARSER STATE MANAGEMENT
   ========================================================================= */

class ParserState {
  constructor() {
    this.js = [];
    this.variables = new Set();
    this.functions = new Set();
    this.constants = new Set();
    this.imports = new Set();
    this.styleElements = new Map();
    this.htmlElements = new Map();
    this.loops = [];
    this.conditionals = [];
    this.inFunction = false;
    this.inLoop = false;
    this.inConditional = false;
    this.depth = 0;
    this.inMatch = false;
    this.depthMatch = 0;
  }

  addVariable(name, type = 'let') {
    this.variables.add(name);
    if (type === 'const') {
      this.constants.add(name);
    }
  }

  addFunction(name) {
    this.functions.add(name);
  }

  addImport(moduleName) {
    this.imports.add(moduleName);
  }

  isVariable(name) {
    return this.variables.has(name);
  }

  isFunction(name) {
    return this.functions.has(name);
  }

  isConstant(name) {
    return this.constants.has(name);
  }

  addJS(line) {
    this.js.push(line);
  }

  getOutput() {
    return this.js.join("\n");
  }
}

/* =========================================================================
   EXPRESSION PARSER
   ========================================================================= */

class ExpressionParser {
  constructor(state) {
    this.state = state;
  }

  parse(expr, lineNo) {
    let e = expr.trim();

    e = e.replace(/call\s+([A-Za-z_]\w*)\s*\(/g, (_, fn) => {
      if (!this.state.isFunction(fn)) {
        PazzleWarn(lineNo, `Calling undefined function '${fn}'`);
      }
      return `${fn}(`;
    });

    e = e.replace(/\s*\+\s*/g, ' + ');
    e = this.parseArithmetic(e);
    e = this.parseComparisons(e);
    e = this.balanceParentheses(e, lineNo);

    return e;
  }

  parseArithmetic(expr) {
    return expr;
  }

  parseComparisons(expr) {
    expr = expr.replace(/\s+equals\s+/g, ' === ');
    expr = expr.replace(/\s+not\s+equals\s+/g, ' !== ');
    expr = expr.replace(/\s+greater\s+than\s+/g, ' > ');
    expr = expr.replace(/\s+less\s+than\s+/g, ' < ');
    return expr;
  }

  balanceParentheses(expr, lineNo) {
    let open = 0;
    for (let c of expr) {
      if (c === "(") open++;
      else if (c === ")") open--;
    }
    if (open > 0) {
      PazzleWarn(lineNo, `Expression has ${open} unclosed parenthesis: ${expr}`);
    }
    return expr + ")".repeat(Math.max(0, open));
  }
}

/* =========================================================================
   PRINT HANDLER
   ========================================================================= */

class PrintHandler {
  constructor(state) {
    this.state = state;
  }

  parse(expr, lineNo) {
    const exprParser = new ExpressionParser(this.state);
    const e = exprParser.parse(expr, lineNo);

    const isString = e.startsWith('"') || e.startsWith("'");
    const isNumber = !isNaN(e) && e.trim() !== '';
    const isFunctionCall = e.includes("(");
    const isVariable = /^[A-Za-z_]\w*/.test(e);
    const isExpression = /[+\-*/%]/.test(e);

    if (!isString && !isNumber && !isFunctionCall && !isVariable && !isExpression) {
      PazzleError(lineNo, `Cannot print '${e}': Invalid expression`);
    }

    return `__Pazzle_Print__(${e});`;
  }
}

/* =========================================================================
   REGEX HANDLER (RE)
   ========================================================================= */

class RegexHandler {
  constructor(state) {
    this.state = state;
  }

  parse(varName, pattern, targets, lineNo) {
    let regexPattern = this.convertPattern(pattern);

    const js = [];
    js.push(`const ${varName}Match = ${varName}.match(/${regexPattern}/);`);
    js.push(`if(${varName}Match){`);

    const targetList = targets.split(",").map(t => t.trim());
    targetList.forEach((t, index) => {
      this.state.addVariable(t);
      js.push(`  const ${t} = ${varName}Match[${index}];`);
    });

    return js;
  }

  convertPattern(pattern) {
    let p = pattern;
    p = p.replace(/\(num\)/g, "\\d+");
    p = p.replace(/\(word\)/g, "\\w+");
    p = p.replace(/\(any\)/g, ".+");
    p = p.replace(/\(letter\)/g, "[a-zA-Z]");
    p = p.replace(/\(digit\)/g, "\\d");
    p = p.replace(/\(numCL\)/g, "\\d+?");
    p = p.replace(/\(wordCL\)/g, "\\w+?");
    p = p.replace(/\(anyCL\)/g, ".+?");
    p = p.replace(/\(_\)/g, "\\s*");
    p = p.replace(/ /g, "\\s+");
    p = p.replace(/\(dot\)/g, "\\.");
    p = p.replace(/\|/g, "");
    p = p.replace(/\(\|\)/g, "\\|");
    p = p.replace(/b\(/g, "\\(");
    p = p.replace(/b\)/g, "\\)");
    return p;
  }

  closeBlock() {
    return "}";
  }
}

/* =========================================================================
   VARIABLE EDITOR
   ========================================================================= */

class VariableEditor {
  constructor(state) {
    this.state = state;
  }

  parse(varNames, property, value, lineNo) {
    const names = varNames.split(",").map(v => v.trim());
    const js = [];

    for (const v of names) {
      if (!this.state.isVariable(v)) {
        PazzleWarn(lineNo, `Variable '${v}' not declared`);
      }
      if (this.state.isConstant(v)) {
        PazzleError(lineNo, `Cannot modify constant '${v}'`);
      }
      const result = this.applyOperation(v, property, value, lineNo);
      if (result) {
        js.push(result);
      }
    }

    return js;
  }

  applyOperation(varName, property, value, lineNo) {
    const operations = {
      'add': `${varName} += ${value};`,
      'subtract': `${varName} -= ${value};`,
      'multiply': `${varName} *= ${value};`,
      'divide': `${varName} /= ${value};`,
      'mod': `${varName} %= ${value};`,
      'power': `${varName} **= ${value};`,
      'set': `${varName} = ${value};`,
      'toggle': `${varName} = !${varName};`,
      'increment': `${varName}++;`,
      'decrement': `${varName}--;`,
      'To': `${value}.innerText = ${varName};`,
      'From': `${varName} = ${value}.innerText;`,
      'ToHTML': `${value}.innerHTML = ${varName};`,
      'FromHTML': `${varName} = ${value}.innerHTML;`,
      'ToValue': `${value}.value = ${varName};`,
      'FromValue': `${varName} = ${value}.value;`,
      'style': `${varName}.style.${value};`,
      'IfEmpty': `if (${varName} === "" || ${varName} === null || ${varName} === undefined || ${varName} === false || ${varName} === 0 || ${varName} <= 0) ${varName} = ${value};`,
      'SetMax': `if (${varName} > ${value}) ${varName} = ${value};`,
      'SetMin': `if (${varName} < ${value}) ${varName} = ${value};`,
      'push':   `${varName}.push(${value});`,
    };

    if (property === 'take') {
      return this.parseTake(varName, value, lineNo);
    }

    if (property in operations) {
      return operations[property];
    } else {
      PazzleError(lineNo, `Unknown property '${property}'`);
    }
  }

  // ✅ إصلاح #8: إضافة lineNo وعمل PazzleError بدل ما يرجع null بصمت
  parseTake(varName, value, lineNo) {
    const values = value.split(",").map(v => v.trim());
    if (values.length !== 2) {
      PazzleError(lineNo, `'take' expects exactly 2 arguments, got ${values.length}: ${value}`);
      return null;
    }
    return `${varName} += ${values[1]}; ${values[0]} -= ${values[1]};`;
  }
}

/* =========================================================================
   FUNCTION PARSER
   ========================================================================= */

class FunctionParser {
  constructor(state) {
    this.state = state;
  }

  parse(fnName, lines, startIndex) {
    this.state.addFunction(fnName);
    this.state.inFunction = true;

    const js = [];
    js.push(`function ${fnName}(){`);

    let depth = 1;
    let i = startIndex + 1;

    while (i < lines.length && depth > 0) {
      const line = lines[i].trim();

      if (!line || line.startsWith("#")) {
        i++;
        continue;
      }

      const openCount = (line.match(/\{/g) || []).length;
      const closeCount = (line.match(/\}/g) || []).length;

      if (line === "}") {
        depth--;
        if (depth === 0) {
          js.push("}");
          break;
        }
        js.push("}");
        i++;
        continue;
      }

      depth += openCount - closeCount;

      const parsed = this.parseFunctionLine(line, i + 1);
      if (parsed) {
        if (Array.isArray(parsed)) {
          js.push(...parsed.map(l => "  " + l));
        } else {
          js.push("  " + parsed);
        }
      } else {
        if (line !== "{") {
          PazzleWarn(i + 1, `Unrecognized syntax in function: ${line}`);
        }
      }

      i++;
    }

    this.state.inFunction = false;
    return { code: js, endIndex: i };
  }

  parseFunctionLine(line, lineNo) {
    const printHandler = new PrintHandler(this.state);
    const varEditor = new VariableEditor(this.state);

    let m = line.match(/^make\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) {
      const [, name, value] = m;
      this.state.addVariable(name, 'let');
      return `let ${name} = ${value};`;
    }

    m = line.match(/^stop\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) {
      const [, name, value] = m;
      this.state.addVariable(name, 'const');
      return `const ${name} = ${value};`;
    }

    m = line.match(/^local\.My's\.web\.txtar\s*\(\s*print\((.+?)\)\s*\)$/);
    if (m) {
      return printHandler.parse(m[1], lineNo);
    }

    const _ve1 = parseVarEditorLine(line);
    if (_ve1) {
      return varEditor.parse(_ve1.varName, _ve1.property, _ve1.value, lineNo);
    }

    m = line.match(/^write\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
    if (m) {
      return `fs.writeFileSync(${m[1]}, ${m[2]}, "utf8");`;
    }

    m = line.match(/^return\s+(.+)$/);
    if (m) {
      return `return ${m[1]};`;
    }

    if (line.startsWith("if(")) {
      return line;
    }

    m = line.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
    if (m) {
      return `${m[1]}(${m[2]});`;
    }

    return null;
  }
}

/* =========================================================================
   CONDITIONAL PARSER (IF/ELSE)
   ========================================================================= */

class ConditionalParser {
  constructor(state) {
    this.state = state;
  }

  parse(condition, lines, startIndex) {
    this.state.inConditional = true;

    const js = [];
    js.push(`if(${condition}){`);

    let depth = 1;
    let i = startIndex + 1;

    while (i < lines.length && depth > 0) {
      const line = lines[i].trim();

      if (!line || line.startsWith("#")) {
        i++;
        continue;
      }

      const openCount = (line.match(/\{/g) || []).length;
      const closeCount = (line.match(/\}/g) || []).length;

      if (line.startsWith("}else if(")) {
        const elseIfMatch = line.match(/\}else if\((.+?)\)\{/);
        if (elseIfMatch) {
          depth += openCount - closeCount;
          js.push(`}else if(${elseIfMatch[1]}){`);
          i++;
          continue;
        }
      }

      if (line.startsWith("}else") || line.startsWith("} else")) {
        js.push("}else{");
        i++;
        continue;
      }

      depth += openCount - closeCount;

      if (depth <= 0) {
        js.push("}");
        break;
      }

      const parsed = this.parseConditionalLine(line, i + 1);
      if (parsed) {
        if (Array.isArray(parsed)) {
          js.push(...parsed.map(l => "  " + l));
        } else {
          js.push("  " + parsed);
        }
      }

      i++;
    }

    this.state.inConditional = false;
    return { code: js, endIndex: i };
  }

  parseConditionalLine(line, lineNo) {
    const printHandler = new PrintHandler(this.state);
    const varEditor = new VariableEditor(this.state);

    let m = line.match(/^local\.My's\.web\.txtar\s*\(\s*print\((.+?)\)\s*\)$/);
    if (m) {
      return printHandler.parse(m[1], lineNo);
    }

    const _ve1 = parseVarEditorLine(line);
    if (_ve1) {
      return varEditor.parse(_ve1.varName, _ve1.property, _ve1.value, lineNo);
    }

    m = line.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
    if (m) {
      return `${m[1]}(${m[2]});`;
    }

    if (line.startsWith("if(")) {
      return line;
    }

    return null;
  }
}

/* =========================================================================
   LOOP PARSER
   ========================================================================= */

class LoopParser {
  constructor(state) {
    this.state = state;
  }

  parseInterval(delay, lines, startIndex) {
    this.state.inLoop = true;

    const js = [];
    const delayMs = Number(delay) * 1000;
    js.push(`setInterval(()=>{`);

    let i = startIndex + 1;
    while (i < lines.length) {
      const line = lines[i].trim();

      if (!line || line.startsWith("#")) {
        i++;
        continue;
      }

      if (line.includes("}]")) {
        js.push(`}, ${delayMs});`);
        break;
      }

      const parsed = this.parseLoopLine(line, i + 1);
      if (parsed) {
        if (Array.isArray(parsed)) {
          js.push(...parsed.map(l => "  " + l));
        } else {
          js.push("  " + parsed);
        }
      }

      i++;
    }

    this.state.inLoop = false;
    return { code: js, endIndex: i };
  }

  parseFor(varName, start, end, step, lines, startIndex) {
    const js = [];
    const stepValue = step || 1;
    js.push(`for(let ${varName} = ${start}; ${varName} <= ${end}; ${varName} += ${stepValue}){`);

    let i = startIndex + 1;
    let depth = 1;

    while (i < lines.length && depth > 0) {
      const line = lines[i].trim();

      if (!line || line.startsWith("#")) {
        i++;
        continue;
      }

      const openCount = (line.match(/\{/g) || []).length;
      const closeCount = (line.match(/\}/g) || []).length;
      depth += openCount - closeCount;

      if (depth <= 0) {
        js.push("}");
        break;
      }

      const parsed = this.parseLoopLine(line, i + 1);
      if (parsed) {
        if (Array.isArray(parsed)) {
          js.push(...parsed.map(l => "  " + l));
        } else {
          js.push("  " + parsed);
        }
      }

      i++;
    }

    return { code: js, endIndex: i };
  }

  parseLoopLine(line, lineNo) {
    const printHandler = new PrintHandler(this.state);
    const varEditor = new VariableEditor(this.state);

    let m = line.match(/^local\.My's\.web\.txtar\s*\(\s*print\((.+?)\)\s*\)$/);
    if (m) {
      return printHandler.parse(m[1], lineNo);
    }

    const _ve1 = parseVarEditorLine(line);
    if (_ve1) {
      return varEditor.parse(_ve1.varName, _ve1.property, _ve1.value, lineNo);
    }

    // runJS: بيعدّي JS خام جوه الـ loop
    const mJS = line.match(/^runJS:\s*(.+)$/);
    if (mJS) { return mJS[1].trim(); }

    return null;
  }
}

/* =========================================================================
   DOM & HTML PARSER
   ✅ إصلاح #5: الاسم اتغير من DOMParser لـ PazzleDOMParser
   ========================================================================= */

class PazzleDOMParser {
  constructor(state) {
    this.state = state;
  }

  createElement(elementName, elementType, className, lineNo) {
    this.state.htmlElements.set(elementName, elementType);

    const js = [];
    js.push(`let ${elementName} = document.createElement("${elementType}");`);

    if (className) {
      js.push(`${elementName}.className = "${className}";`);
    }

    return js;
  }

  getElementById(varName, elementId) {
    return `const ${varName} = document.getElementById("${elementId}");`;
  }

  querySelector(varName, selector) {
    return `const ${varName} = document.querySelector("${selector}");`;
  }
}

/* =========================================================================
   FILE SYSTEM HANDLER
   ========================================================================= */

class FileSystemHandler {
  constructor(state) {
    this.state = state;
  }

  enableFS() {
    this.state.addImport('fs');
    return "const fs = require('fs');";
  }

  readFile(fileName, varName) {
    let m = varName.match(/('|")(.+?)\1/);
    if (m) { varName = m[2]; }
    return `const ${varName}inner = fs.readFileSync(${fileName}, "utf8");`;
  }

  writeFile(fileName, content) {
    return `fs.writeFileSync("${fileName}", ${content}, "utf8");`;
  }

  appendFile(fileName, content) {
    return `fs.appendFileSync("${fileName}", ${content}, "utf8");`;
  }

  deleteFile(fileName) {
    return `fs.unlinkSync("${fileName}");`;
  }

  fileExists(fileName, varName) {
    return `const ${varName} = fs.existsSync("${fileName}");`;
  }
}

/* =========================================================================
   MAIN PARSER
   ========================================================================= */

function parsePazzle(filePath) {
  if (!filePath.endsWith(".pazzle")) {
    throw new Error("File must end with .pazzle");
  }

  PazzleInfo(`Parsing ${path.basename(filePath)}...`);

  const code = fs.readFileSync(filePath, "utf8");
  const lines = code.split("\n");

  const state = new ParserState();

  // ✅ إصلاح #4: inComment بقى local جوه parsePazzle مش global
  let inComment = false;

  const exprParser = new ExpressionParser(state);
  const printHandler = new PrintHandler(state);
  const regexHandler = new RegexHandler(state);
  const varEditor = new VariableEditor(state);
  const functionParser = new FunctionParser(state);
  const conditionalParser = new ConditionalParser(state);
  const loopParser = new LoopParser(state);
  const domParser = new PazzleDOMParser(state);
  const fsHandler = new FileSystemHandler(state);

  state.addJS("function __Pazzle_Print__(msg) { console.log(msg); }");

  /* ========= Main Parsing Loop ========= */

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNo = i + 1;

    if (!line || line.startsWith("#")) continue;
    if (inComment && !line.includes("---")) continue;

    let matched = false;
    if (line.includes("---")) {
      inComment = !inComment;
      matched = true;
      continue;
    }

    // ===== File System =====
    if (line === "fs") {
      state.addJS(fsHandler.enableFS());
      matched = true;
      continue;
    }

    // ===== Variable Declaration (make) =====
    let m = line.match(/^make\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) {
      const [, name, valueRaw] = m;
      let value = valueRaw.trim();
      const getElem = value.match(/^get\s+(.+)$/);
      if (getElem) {
        value = `document.getElementById("${getElem[1]}")`;
      }
      state.addVariable(name, 'let');
      state.addJS(`let ${name} = ${value};`);
      matched = true;
      continue;
    }

    // ===== Constant Declaration (stop) =====
    m = line.match(/^stop\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) {
      const [, name, valueRaw] = m;
      let value = valueRaw.trim();
      const getElem = value.match(/^get\s+(.+)$/);
      if (getElem) {
        value = `document.getElementById("${getElem[1]}")`;
      }
      state.addVariable(name, 'const');
      state.addJS(`const ${name} = ${value};`);
      matched = true;
      continue;
    }

    // ===== Function Definition (catch) =====
    m = line.match(/^catch\s+([A-Za-z_]\w*)\s*\{$/);
    if (m) {
      const result = functionParser.parse(m[1], lines, i);
      result.code.forEach(l => state.addJS(l));
      i = result.endIndex;
      matched = true;
      continue;
    }

    // ===== Regular Expression (RE) =====
    m = line.match(/^(.+?)\s*=\s*RE\((.+?)\)\s*to\((.+?)\)\{$/);
    if (m) {
      const [, varName, pattern, targets] = m;
      const reCode = regexHandler.parse(varName, pattern, targets, lineNo);
      reCode.forEach(l => state.addJS(l));

      let depth = 1;
      i++;

      while (i < lines.length && depth > 0) {
        const inner = lines[i].trim();

        if (!inner || inner.startsWith("#")) {
          i++;
          continue;
        }

        const openCount = (inner.match(/\{/g) || []).length;
        const closeCount = (inner.match(/\}/g) || []).length;
        depth += openCount - closeCount;

        if (depth <= 0) {
          state.addJS(regexHandler.closeBlock());
          break;
        }

        const printMatch = inner.match(/^local\.My's\.web\.txtar\s*\(\s*print\((.+?)\)\s*\)$/);
        if (printMatch) {
          state.addJS(`  ${printHandler.parse(printMatch[1], i + 1)}`);
        }

        i++;
      }

      matched = true;
      continue;
    }

    // ===== Conditional (if) =====
    m = line.match(/^if\((.+?)\)\{$/);
    if (m) {
      const result = conditionalParser.parse(m[1], lines, i);
      result.code.forEach(l => state.addJS(l));
      i = result.endIndex;
      matched = true;
      continue;
    }

    // ===== Loop (interval) =====
    m = line.match(/^loop_to\.end\.time\(\{(\d+)\}\[\{$/);
    if (m) {
      const result = loopParser.parseInterval(m[1], lines, i);
      result.code.forEach(l => state.addJS(l));
      i = result.endIndex;
      matched = true;
      continue;
    }

    // ===== For Loop =====
    m = line.match(/^for\s+([A-Za-z_]\w*)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+?))?\s*\{$/);
    if (m) {
      const [, varName, start, end, step] = m;
      const result = loopParser.parseFor(varName, start, end, step, lines, i);
      result.code.forEach(l => state.addJS(l));
      i = result.endIndex;
      matched = true;
      continue;
    }

    // ===== Variable Editor =====
    const _ve2 = parseVarEditorLine(line);
    if (_ve2) {
      const result = varEditor.parse(_ve2.varName, _ve2.property, _ve2.value, lineNo);
      result.forEach(l => state.addJS(l));
      matched = true;
      continue;
    }

    // ===== Print =====
    m = line.match(/^local\.My's\.web\.txtar\s*\(\s*print\((.+?)\)\s*\)$/);
    if (m) {
      state.addJS(printHandler.parse(m[1], lineNo));
      matched = true;
      continue;
    }

    // ===== Function Call =====
    m = line.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
    if (m) {
      const [, fnName, args] = m;
      if (!state.isFunction(fnName)) {
        PazzleWarn(lineNo, `Function '${fnName}' not defined`);
      }
      state.addJS(`${fnName}(${args});`);
      matched = true;
      continue;
    }

    // ===== Write File =====
    m = line.match(/^write\s*\(\s*"(.+?)"\s*,\s*(.+?)\s*\)$/);
    if (m) {
      state.addJS(fsHandler.writeFile(m[1], m[2]));
      matched = true;
      continue;
    }

    // ===== Read File =====
    // ✅ إصلاح #6: بقى بيسجل الـ variable في state.variables
    m = line.match(/^read\s*\(\s*(.+?)\s*\)$/);
    if (m) {
      const varName = m[1].replace(/\./g, "_");
      state.addJS(fsHandler.readFile(m[1], varName));
      state.addVariable(`${varName}inner`, 'const'); // ← إصلاح: تسجيل الـ variable
      matched = true;
      continue;
    }

    // ===== Create Element =====
    m = line.match(/^local\.Make\s*=\s*local\.web\s*\|\|\s*front-end\s*\|\|\.\|\s*loop_to\.find\(element\("(.+?)"\)&hasType\("(.+?)"\)\)\.make_it\s+on\s+Equal\("(.+?)"\)$/);
    if (m) {
      const result = domParser.createElement(m[1], m[2], m[3], lineNo);
      result.forEach(l => state.addJS(l));
      matched = true;
      continue;
    }

    // ===== Link =====
    // ✅ إصلاح #5: link بقى بيحصل بعد ما الـ parse يخلص (في نهاية الـ loop)
    m = line.match(/^link\s+(index|script)\s+(.+)$/);
    if (m) {
      const linkType = m[1];
      const linkTarget = m[2].trim();

      // بنحتفظ بالـ link عشان ننفذه بعد الـ parse
      state._pendingLink = { type: linkType, target: linkTarget };
      matched = true;
      continue;
    }

    // ===== sc (goTo) =====
    m = line.match(/^sc$/);
    if (m) {
      state.addJS(`function goTo(to){window.location.href = to;}`);
      matched = true;
      continue;
    }

    // ===== Match Statement =====
    // ✅ إصلاح #7: إضافة دعم لـ default case
    m = line.match(/^match\s+(.+?)\s*\{$/);
    if (m) {
      const varName = m[1].trim();
      if (!state.isVariable(varName)) {
        PazzleError(lineNo, `Variable '${varName}' not declared for match statement`);
      }

      state.inMatch = true;
      state.depthMatch++;
      state.addJS(`switch(${varName}){`);

      i++;
      while (i < lines.length) {
        const caseLine = lines[i].trim();

        if (!caseLine || caseLine.startsWith("#")) {
          i++;
          continue;
        }

        if (caseLine === "}") {
          state.addJS("}");
          state.inMatch = false;
          state.depthMatch--;
          break;
        }

        // ✅ إصلاح #7: دعم default
        if (caseLine === "default{" || caseLine === "default {") {
          state.addJS(`default:`);
          i++;
          let caseDepth = 1;
          while (i < lines.length && caseDepth > 0) {
            const innerLine = lines[i].trim();
            if (!innerLine || innerLine.startsWith("#")) { i++; continue; }
            const openCount = (innerLine.match(/\{/g) || []).length;
            const closeCount = (innerLine.match(/\}/g) || []).length;
            caseDepth += openCount - closeCount;
            if (caseDepth <= 0) { state.addJS("  break;"); break; }
            let ma = innerLine.match(/^local\.My's\.web\.txtar\s*\(\s*print\((.+?)\)\s*\)$/);
            if (ma) { state.addJS(`  ${printHandler.parse(ma[1], i + 1)}`); i++; continue; }
            const _vei = parseVarEditorLine(innerLine);
            if (_vei) { const res = varEditor.parse(_vei.varName, _vei.property, _vei.value, i + 1); res.forEach(l => state.addJS("  " + l)); i++; continue; }
            ma = innerLine.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
            if (ma) { state.addJS(`  ${ma[1]}(${ma[2]});`); i++; continue; }
            i++;
          }
          i++;
          continue;
        }

        const caseMatch = caseLine.match(/^"(.+?)"\s*\{\s*$/);
        if (caseMatch) {
          state.addJS(`case "${caseMatch[1]}":`);
          i++;

          let caseDepth = 1;
          while (i < lines.length && caseDepth > 0) {
            const innerLine = lines[i].trim();

            if (!innerLine || innerLine.startsWith("#")) {
              i++;
              continue;
            }

            const openCount = (innerLine.match(/\{/g) || []).length;
            const closeCount = (innerLine.match(/\}/g) || []).length;
            caseDepth += openCount - closeCount;

            if (caseDepth <= 0) {
              state.addJS("  break;");
              break;
            }

            let ma = innerLine.match(/^local\.My's\.web\.txtar\s*\(\s*print\((.+?)\)\s*\)$/);
            if (ma) { state.addJS(`  ${printHandler.parse(ma[1], i + 1)}`); i++; continue; }
            const _vei = parseVarEditorLine(innerLine);
            if (_vei) { const res = varEditor.parse(_vei.varName, _vei.property, _vei.value, i + 1); res.forEach(l => state.addJS("  " + l)); i++; continue; }
            ma = innerLine.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
            if (ma) { state.addJS(`  ${ma[1]}(${ma[2]});`); i++; continue; }
            ma = innerLine.match(/^write\s*\(\s*"(.+?)"\s*,\s*(.+?)\s*\)$/);
            if (ma) { state.addJS("  " + fsHandler.writeFile(ma[1], ma[2])); i++; continue; }
            ma = innerLine.match(/^read\s*\(\s*"(.+?)"\s*\)$/);
            if (ma) { const vName = ma[1].replace(/\./g, "_"); state.addJS("  " + fsHandler.readFile(ma[1], vName)); state.addVariable(`${vName}inner`, 'const'); i++; continue; }
            ma = innerLine.match(/^if\((.+?)\)\{$/);
            if (ma) { const result = conditionalParser.parse(ma[1], lines, i); result.code.forEach(l => state.addJS("  " + l)); i = result.endIndex; continue; }
            ma = innerLine.match(/^for\s+([A-Za-z_]\w*)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+?))?\s*\{$/);
            if (ma) { const [, vn, st, en, sp] = ma; const result = loopParser.parseFor(vn, st, en, sp, lines, i); result.code.forEach(l => state.addJS("  " + l)); i = result.endIndex; continue; }

            i++;
          }
        } else {
          PazzleWarn(i + 1, `Unrecognized case syntax: ${caseLine}`);
        }

        i++;
      }

      matched = true;
      continue;
    }

    // ===== run =====
    // ✅ إصلاح #3: async واضح إنه مش async حقيقي، بنوضح ده بـ warning
    m = line.match(/^run\s+(.+)$/);
    if (m) {
      const toRun = m[1].replace('\n', ';').split(';');
      let ri = 0;
      while (ri < toRun.length) {
        const cmd = toRun[ri].trim();
        if (!cmd) { ri++; continue; }

        let ma = cmd.match(/^local\.My's\.web\.txtar\s*\(\s*print\((.+?)\)\s*\)$/);
        if (ma) { state.addJS(printHandler.parse(ma[1], lineNo)); ri++; continue; }
        const _vec = parseVarEditorLine(cmd);
        if (_vec) { const res = varEditor.parse(_vec.varName, _vec.property, _vec.value, lineNo); res.forEach(l => state.addJS(l)); ri++; continue; }
        ma = cmd.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
        if (ma) { state.addJS(`${ma[1]}(${ma[2]});`); ri++; continue; }
        ma = cmd.match(/^write\s*\(\s*"(.+?)"\s*,\s*(.+?)\s*\)$/);
        if (ma) { state.addJS(fsHandler.writeFile(ma[1], ma[2])); ri++; continue; }
        ma = cmd.match(/^read\s*\(\s*"(.+?)"\s*\)$/);
        if (ma) { const vName = ma[1].replace(/\./g, "_"); state.addJS(fsHandler.readFile(ma[1], vName)); state.addVariable(`${vName}inner`, 'const'); ri++; continue; }
        ma = cmd.match(/^if\((.+?)\)\{$/);
        if (ma) { const result = conditionalParser.parse(ma[1], toRun, ri); result.code.forEach(l => state.addJS(l)); ri = result.endIndex; continue; }
        ma = cmd.match(/^for\s+([A-Za-z_]\w*)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+?))?\s*\{$/);
        if (ma) { const [, vn, st, en, sp] = ma; const result = loopParser.parseFor(vn, st, en, sp, toRun, ri); result.code.forEach(l => state.addJS(l)); ri = result.endIndex; continue; }
        ma = cmd.match(/^match\s+(.+?)\s*\{$/);
        if (ma) {
          state.addJS(`switch(${ma[1].trim()}){`);
          ri++;
          while (ri < toRun.length) {
            const nextCmd = toRun[ri].trim();
            if (nextCmd === "}") { state.addJS("}"); ri++; break; }
            const matchCase = nextCmd.match(/^"(.+?)":\s*(.+)$/);
            if (matchCase) {
              state.addJS(`case "${matchCase[1].trim()}": ${matchCase[2].trim()}; break;`);
            } else {
              PazzleError(lineNo + ri, `Invalid case syntax: ${nextCmd}`);
            }
            ri++;
          }
          continue;
        }

        PazzleWarn(lineNo, `run: Unrecognized command skipped: ${cmd}`);
        ri++;
      }
      matched = true;
      continue;
    }

    // ===== async Input =====
    // ✅ إصلاح #3: تحذير واضح إن async هنا مش async/await حقيقي
    m = line.match(/async\s+(.+?)\s*=\s*(.+)$/);
    if (m) {
      let [, name, value] = m;
      value = value.trim();
      PazzleWarn(lineNo, `'async' keyword here is not real async/await - it only reads from command line inputs`);
      state.addVariable(name, 'let');
      let inputCode = "";
      let mValue = value.match(/^Input\((.+?)\)$/);
      if (mValue) {
        inputCode = newInputsInCMD[Number(mValue[1].trim()) - 1] || '';
      }

      state.addJS(`let ${name} = '${inputCode}';`);
      matched = true;
      continue;
    }

    if (line === "}") {
      matched = true;
      continue;
    }

    if (!matched) {
      PazzleError(lineNo, `Unknown syntax: ${line}`);
    }
  }

  /* ========= Output Generation ========= */

  const outFile = path.basename(filePath, ".pazzle") + ".js";
  const outputPath = path.resolve(path.dirname(filePath), outFile);

  fs.writeFileSync(outputPath, state.getOutput(), "utf8");
  PazzleInfo(`✔ Generated: ${outFile}`);

  // ✅ إصلاح #5: link بيتنفذ بعد ما الـ parse يخلص والـ JS يكون كامل
  if (state._pendingLink) {
    const { type, target } = state._pendingLink;
    if (type === "index") {
      PazzleInfo(`Linking to ${target}...`);
      try {
        const fileContent = fs.readFileSync(target, "utf8");
        const fileLines = fileContent.split("\n");
        const startIndex = getLineHas(fileContent, "<script>");
        const endIndex = getLineHas(fileContent, "</script>");

        if (startIndex !== -1 && endIndex !== -1) {
          const before = fileLines.slice(0, startIndex).join("\n");
          const after = fileLines.slice(endIndex + 1).join("\n");
          const jsCode = state.js.join("\n");
          const newContent = before + "\n<script>\n" + jsCode + "\n</script>\n" + after;
          fs.writeFileSync(target, newContent, "utf8");
          PazzleInfo(`✔ Linked successfully to ${target}`);
        } else {
          PazzleWarn(0, `Could not find <script> tags in ${target}`);
        }
      } catch (err) {
        PazzleWarn(0, `Link failed: ${err.message}`);
      }
    }
  }

  /* ========= Execution ========= */

  const { exec } = require("child_process");

  exec(`node "${outputPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Runtime Error]: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`[Internal Error]: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
}

/* =========================================================================
   CLI INTERFACE
   ========================================================================= */

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            🧩 Pazzle Parser v14.2 (Bug-Fixed Edition)         ║
╚════════════════════════════════════════════════════════════════╝

Usage:
  pazzle <file.pazzle>      Compile and run a single file
  pazzle .                  Compile all .pazzle files in current directory
  pazzle -w                 Watch mode (auto-recompile on change)
  pazzle --help             Show this help message

Examples:
  pazzle code.pazzle        Run code.pazzle
  pazzle .                  Run all .pazzle files
  pazzle -w                 Watch current directory

Features:
  ✓ Variables & Constants
  ✓ Functions
  ✓ Regular Expressions
  ✓ Conditionals (if/else)
  ✓ Loops (interval, for)
  ✓ File System Operations
  ✓ DOM Manipulation
  ✓ Variable Editing
  ✓ Print System
  ✓ Match Statements (with default case)
  `);
}

function startCompilation() {
  const target = process.argv[2];

  if (!target || target === "--help" || target === "-h") {
    printHelp();
    process.exit(0);
  }

  // ✅ إصلاح #1 و #2: newInputsInCMD بيتملى الأول وبشكل صح
  newInputsInCMD = [];
  for (let i = 3; i < process.argv.length; i++) {
    newInputsInCMD.push(process.argv[i]);
  }

  const isWatch = process.argv.includes("-w");

  const compileAll = () => {
    const files = fs.readdirSync(process.cwd()).filter(f => f.endsWith(".pazzle"));

    if (files.length === 0) {
      console.log("No .pazzle files found in current directory.");
      return;
    }

    files.forEach(file => {
      try {
        parsePazzle(path.resolve(file));
      } catch (err) {
        console.error(`Error in ${file}: ${err.message}`);
      }
    });
  };

  if (isWatch) {
    PazzleInfo("👀 Pazzle is watching for changes...");

    fs.watch(process.cwd(), (eventType, filename) => {
      if (filename && filename.endsWith(".pazzle")) {
        console.log(`\n📄 File changed: ${filename}. Recompiling...`);
        try {
          parsePazzle(path.resolve(filename));
        } catch (err) {
          console.error(`Error: ${err.message}`);
        }
      }
    });
  } else if (target === "." || target === "-all") {
    compileAll();
  } else {
    const fullPath = path.resolve(target);

    if (fs.existsSync(fullPath)) {
      try {
        parsePazzle(fullPath);
      } catch (err) {
        console.error(`Error: ${err.message}`);
      }
    } else {
      console.error(`❌ Error: File not found -> ${target}`);
      process.exit(1);
    }
  }
}

/* =========================================================================
   MAIN EXECUTION
   ========================================================================= */

startCompilation();

function has(str, substr) {
  return str.includes(substr);
}

function getLineHas(joinedArea, substr) {
  const lines = joinedArea.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(substr)) {
      return i;
    }
  }
  return -1;
}