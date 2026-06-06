#!/usr/bin/env node
// parser.js - Pazzle Parser v14.4 (Self-Contained Edition)
const fs = require("fs");
const path = require("path");
let qcount = 0;
let JSONdata = {};
let JSONsitting = {};
let EPnum = 0;

let newInputsInCMD = [];

// =========================================================================
// TERMINAL BUILT-INS - بيتحولوا مباشرة لـ JS
// =========================================================================
const TERMINAL_BUILTINS = {
  'term.cls':        `process.stdout.write('\x1b[2J\x1b[H');`,
  'term.home':       `process.stdout.write('\x1b[H');`,
  'term.hide.cursor':`process.stdout.write('\x1b[?25l');`,
  'term.show.cursor':`process.stdout.write('\x1b[?25h');`,
  'term.reset':      `process.stdout.write('\x1b[0m');`,
  'term.setup.keys': `if(!global.__pazzle_keys){const __rl=require('readline');__rl.emitKeypressEvents(process.stdin);if(process.stdin.isTTY)process.stdin.setRawMode(true);global.__pazzle_keys={};process.stdin.on('keypress',(str,key)=>{if(!key)return;if(key.ctrl&&key.name==='c'){process.stdout.write('\x1b[?25h\x1b[0m');process.exit(0);}global.__pazzle_keys[key.name]=true;setTimeout(()=>{if(global.__pazzle_keys)global.__pazzle_keys[key.name]=false;},80);});}`,
};

let varTypes = {}
let Typefunctions = {}
function parseBuiltinCall(line, state) {
  let m;

  for (const [key, js] of Object.entries(TERMINAL_BUILTINS)) {
    if (line === key || line === key + '()') return js;
  }

  m = line.match(/^term\.move\((.+?),\s*(.+?),\s*(.+)\)$/);
  if (m) return `process.stdout.write(\`\x1b[\${${m[2]}};\${${m[1]}}H\${${m[3]}}\`);`;

  m = line.match(/^term\.write\((.+)\)$/);
  if (m) return `process.stdout.write(${m[1]});`;

  m = line.match(/^term\.writeln\((.+)\)$/);
  if (m) return `process.stdout.write(${m[1]} + '\n');`;

  if (line === 'term.exit()') return `process.stdout.write('\x1b[?25h\x1b[0m'); process.exit(0);`;

  const decl = (v, val) => {
    if (state.isVariable(v)) return `${v} = ${val};`;
    state.addVariable(v, 'let');
    return `let ${v} = ${val};`;
  };

  m = line.match(/^math\.floor\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[2], `Math.floor(${m[1]})`);
  m = line.match(/^math\.floor\((.+?)\)$/);
  if (m) return `Math.floor(${m[1]});`;

  m = line.match(/^math\.ceil\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[2], `Math.ceil(${m[1]})`);

  m = line.match(/^math\.round\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[2], `Math.round(${m[1]})`);

  m = line.match(/^math\.min\((.+?),\s*(.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[3], `Math.min(${m[1]}, ${m[2]})`);
  m = line.match(/^math\.min\((.+?),\s*(.+?)\)$/);
  if (m) return `Math.min(${m[1]}, ${m[2]});`;

  m = line.match(/^math\.max\((.+?),\s*(.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[3], `Math.max(${m[1]}, ${m[2]})`);
  m = line.match(/^math\.max\((.+?),\s*(.+?)\)$/);
  if (m) return `Math.max(${m[1]}, ${m[2]});`;

  m = line.match(/^math\.abs\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[2], `Math.abs(${m[1]})`);

  m = line.match(/^math\.random\(\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[1], `Math.random()`);

  m = line.match(/^math\.sqrt\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[2], `Math.sqrt(${m[1]})`);

  m = line.match(/^str\.length\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[2], `String(${m[1]}).length`);

  m = line.match(/^str\.pad\((.+?),\s*(.+?),\s*(.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[4], `String(${m[1]}).padStart(${m[2]}, ${m[3]})`);

  m = line.match(/^str\.repeat\((.+?),\s*(.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[3], `String(${m[1]}).repeat(${m[2]})`);

  m = line.match(/^arr\.new\((.+?),\s*(.+?),\s*(.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[4], `Array.from({length:${m[2]}},()=>new Array(${m[1]}).fill(${m[3]}))`);

  m = line.match(/^arr\.fill\((.+?),\s*(.+?)\)$/);
  if (m) return `${m[1]}.fill(${m[2]});`;

  m = line.match(/^arr\.every\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
  if (m) return decl(m[2], `${m[1]}.every(a=>!a)`);

  return null;
}

let varEditorInputs = {
      'add': `var += value;`,
      'subtract': `var -= value;`,
      'multiply': `var *= value;`,
      'divide': `var /= value;`,
      'mod': `var %= value;`,
      'power': `var **= value;`,
      'set': `var = value;`,
      'toggle': `var = !var;`,
      'increment': `var++;`,
      'decrement': `var--;`,
      'To': `value.innerText = var;`,
      'From': `var = value.innerText;`,
      'ToHTML': `value.innerHTML = var;`,
      'FromHTML': `var = value.innerHTML;`,
      'ToValue': `value.value = var;`,
      'FromValue': `var = value.value;`,
      'style': `var.style.value;`,
      'IfEmpty': `if (var === "" || var === null || var === undefined || var === false || var === 0 || var <= 0) var = value;`,
      'SetMax': `if (var > value) var = value;`,
      'clear': `var = [];`,
      'SetMin': `if (var < value) var = value;`,
      'push': `var.push(value);`,
      'auto': `setInterval(() => { var = (function(){ const chars = "abcdefghijklmnopqrstuvwxyz"; return Array.from({length: Math.floor(Math.random()*12)+5}, () => chars[Math.floor(Math.random()*chars.length)]).join(""); })(); }, 10);`
};

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

  if (!/^[A-Za-z_]\w*$/.test(property)) return null;

  return { varName: left, property, value };
}

function PazzleError(line, msg) {
  throw new Error(`PazzleError (line ${line}): ${msg}`);
}

function PazzleWarn(lineNo, msg) {
  console.warn(`[Pazzle Warning] (line ${lineNo}) ${msg}`);
}

function PazzleInfo(msg, file) {
  if (JSONdata[`${file}info`] !== "hide") {
    console.log(`[Pazzle Info] ${msg}`);
  }
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
    const body = this.js.join("\n");
    if (body.includes("await ")) {
      const closeRl = `if (global.__pazzle_rl) global.__pazzle_rl.close();`;
      return `(async () => {\n${body}\n${closeRl}\n})().catch(err => { console.error("[Pazzle Async Error]:", err.message); });`;
    }
    return body;
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
      PazzleError(lineNo, `Expression has ${open} unclosed parenthesis: ${expr}`);
    }
    if (open < 0) {
      PazzleError(lineNo, `Expression has ${Math.abs(open)} extra closing parenthesis: ${expr}`);
    }
    return expr;
  }
}

/* =========================================================================
   PRINT HANDLER
   ========================================================================= */

class PrintHandler {
  constructor(state) {
    this.state = state;
  }

  parse(type,expr, lineNo) {
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
    if (type === "print"){
      return `__Pazzle_Print__(${e});`;
    }
    if (type === "link"){
      return `process.stdout.write(${e});`;
    }
    if (type === "reprint"){
      return `process.stdout.write('\\r' + ${e});`;
    }
    if(type === "Up"){
      return `process.stdout.write('\\x1b[${e}A');`;
    }
    if(type === "printUp"){
      return `process.stdout.write('\\x1b[${e.split(',')[0]}A' + ${e.split(',')[1]});`;
    }
    if(type === "down"){
      return `process.stdout.write('\\x1b[${e}B');`;
    }
    if(type === "printDown"){
      return `process.stdout.write('\\x1b[${e.split(',')[0]}B' + ${e.split(',')[1]});`;
    }
    return null;
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
    p = p.replace(/\(\|\)/g, "\\|");
    p = p.replace(/\|/g, "");
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
    if (property === 'take') {
      return this.parseTake(varName, value, lineNo);
    }

    if (property in Typefunctions) {
      const typeName = Typefunctions[property];
      if (varTypes[varName] !== typeName) {
        PazzleError(lineNo, `Variable '${varName}' is not of type '${typeName}'`);
      }
      return `${varName}.${property}(${value});`;
    }

    if (property in varEditorInputs) {
      return varEditorInputs[property].replace(/var/g, varName).replace(/value/g, value);
    }

    // Fallback: treat as method call on object (for class instances)
    return `${varName}.${property}(${value});`;
  }

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

  parse(fnName, lines, startIndex,args) {
    this.state.addFunction(fnName);
    this.state.inFunction = true;

    const js = [];
    js.push(`function ${fnName}(${args.join(',')}){`);

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
      const isOwnClass = value.match(/new\s+([A-Za-z_]\w*)\s*\(.+?\)/);
      if(isOwnClass){
        const className = isOwnClass[1];
        varTypes[name] = className;
      }
      this.state.addVariable(name, 'let');
      return `let ${name} = ${value};`;
    }

    m = line.match(/^stop\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) {
      const [, name, value] = m;
      this.state.addVariable(name, 'const');
      return `const ${name} = ${value};`;
    }

    m = line.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
    if (m) {
      return printHandler.parse(m[1], m[2], lineNo);
    }

    m = line.match(/^runJS:\s*(.+)$/);
    if (m) return m[1].trim();

    const _builtin1 = parseBuiltinCall(line, this.state);
    if (_builtin1) return _builtin1;

    m = line.match(/^for\s+([A-Za-z_]\w*)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+?))?\s*\{$/);
    if (m) {
      const [, vn, st, en, sp] = m;
      const step = sp ? sp : '1';
      return `for(let ${vn}=${st}; ${vn}<${en}; ${vn}+=${step}){`;
    }

    m = line.match(/^while\((.+?)\)\{$/);
    if (m) {
      const parsedC = new ExpressionParser(this.state).parseComparisons(m[1]);
      return `while(${parsedC}){`;
    }

    if (line === '}') return '}';
    if (line === 'break') return 'break;';
    if (line === 'continue') return 'continue;';

    m = line.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
    if (m && this.state.isVariable(m[1])) {
      const op2 = m[2].trim();
      const isArrOp = /^(push|pop|shift|unshift|reverse|sort|clear|remove|get\(|set\(|slice|includes|indexOf|join|length)/.test(op2);
      if (isArrOp) {
        const arrayH2 = new ArrayHandler(this.state);
        const arrResult2 = arrayH2.parseArrayOp(m[1], op2, lineNo);
        if (arrResult2) return arrResult2;
      }
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

    m = line.match(/^if\((.+?)\)\{$/);
    if (m) {
      const parsedC = new ExpressionParser(this.state).parseComparisons(m[1]);
      return `if(${parsedC}){`;
    }

    m = line.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
    if (m) {
      return `${m[1]}(${m[2]});`;
    }

    m = line.match(/^onKey\(([A-Za-z_]\w*)\)\s*\{$/);
    if (m) return `if (global.__pazzle_keys && global.__pazzle_keys['${m[1]}']) {`;

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

    let m = line.match(/^runJS:\s*(.+)$/);
    if (m) return m[1].trim();

    const _builtin2 = parseBuiltinCall(line, this.state);
    if (_builtin2) return _builtin2;

    m = line.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
    if (m) {
      return printHandler.parse(m[1], m[2], lineNo);
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

    m = line.match(/^onKey\(([A-Za-z_]\w*)\)\s*\{$/);
    if (m) return `if (global.__pazzle_keys && global.__pazzle_keys['${m[1]}']) {`;

    if (line === '}') return '}';
    if (line === 'break') return 'break;';

    m = line.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
    if (m && this.state.isVariable(m[1])) {
      const op = m[2].trim();
      const isArrayOp = /^(push|pop|shift|unshift|reverse|sort|clear|remove|get\(|set\(|slice|includes|indexOf|join|length)/.test(op);
      if (isArrayOp) {
        const arrayH = new ArrayHandler(this.state);
        const arrRes2 = arrayH.parseArrayOp(m[1], op, lineNo);
        if (arrRes2) return arrRes2;
      }
      const _ve = parseVarEditorLine(m[0]);
      if (_ve) {
        const varEditor2 = new VariableEditor(this.state);
        return varEditor2.parse(_ve.varName, _ve.property, _ve.value, lineNo);
      }
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
    let closed = false;

    while (i < lines.length) {
      const line = lines[i].trim();

      if (!line || line.startsWith("#")) {
        i++;
        continue;
      }

      if (line.includes("}]")) {
        js.push(`}, ${delayMs});`);
        closed = true;
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

    if (!closed) {
      PazzleError(startIndex + 1, `Unclosed interval loop — missing '}]' token`);
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

    let m = line.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
    if (m) {
      return printHandler.parse(m[1], m[2], lineNo);
    }
    const mJS = line.match(/^runJS:\s*(.+)$/);
    if (mJS) { return mJS[1].trim(); }

    const _builtinL = parseBuiltinCall(line, this.state);
    if (_builtinL) return _builtinL;

    const _ve1 = parseVarEditorLine(line);
    if (_ve1) {
      return varEditor.parse(_ve1.varName, _ve1.property, _ve1.value, lineNo);
    }

    m = line.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
    if (m && this.state.isVariable(m[1])) {
      const op = m[2].trim();
      const isArrayOp = /^(push|pop|shift|unshift|reverse|sort|clear|remove|get\(|set\(|slice|includes|indexOf|join|length)/.test(op);
      if (isArrayOp) {
        const arrayH = new ArrayHandler(this.state);
        const arrResult = arrayH.parseArrayOp(m[1], op, lineNo);
        if (arrResult) return arrResult;
      }
    }

    m = line.match(/^onKey\(([A-Za-z_]\w*)\)\s*\{$/);
    if (m) { return `if (global.__pazzle_keys && global.__pazzle_keys['${m[1]}']) {`; }

    m = line.match(/^make\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) { this.state.addVariable(m[1], 'let'); return `let ${m[1]} = ${m[2]};`; }

    m = line.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
    if (m) return `${m[1]}(${m[2]});`;

    m = line.match(/^if\((.+?)\)\{$/);
    if (m) {
      const parsedC = new ExpressionParser(this.state).parseComparisons(m[1]);
      return `if(${parsedC}){`;
    }

    if (line === 'break')    return 'break;';
    if (line === 'continue') return 'continue;';
    if (line === '}') return '}';

    return null;
  }
}

/* =========================================================================
   WHILE LOOP PARSER
   ========================================================================= */

class WhileParser {
  constructor(state) { this.state = state; }

  parse(condition, lines, startIndex) {
    const js = [];
    const exprParser = new ExpressionParser(this.state);
    const parsedCond = exprParser.parseComparisons(condition);
    js.push(`while(${parsedCond}){`);
    let depth = 1;
    let i = startIndex + 1;
    while (i < lines.length && depth > 0) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) { i++; continue; }
      const openCount  = (line.match(/\{/g) || []).length;
      const closeCount = (line.match(/\}/g) || []).length;
      depth += openCount - closeCount;
      if (depth <= 0) { js.push('}'); break; }
      const parsed = this.parseWhileLine(line, i + 1);
      if (parsed) {
        if (Array.isArray(parsed)) js.push(...parsed.map(l => '  ' + l));
        else js.push('  ' + parsed);
      } else if (line !== '{') {
        PazzleWarn(i + 1, `Unrecognized syntax in while: ${line}`);
      }
      i++;
    }
    return { code: js, endIndex: i };
  }

  parseWhileLine(line, lineNo) {
    const printHandler = new PrintHandler(this.state);
    const varEditor    = new VariableEditor(this.state);
    let m = line.match(/^make\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) { this.state.addVariable(m[1], 'let'); return `let ${m[1]} = ${m[2]};`; }
    m = line.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
    if (m) return printHandler.parse(m[1], m[2], lineNo);
    const _builtinW = parseBuiltinCall(line, this.state);
    if (_builtinW) return _builtinW;
    const _ve = parseVarEditorLine(line);
    if (_ve) return varEditor.parse(_ve.varName, _ve.property, _ve.value, lineNo);
    m = line.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
    if (m) return `${m[1]}(${m[2]});`;
    if (line === 'break')    return 'break;';
    if (line === 'continue') return 'continue;';
    m = line.match(/^runJS:\s*(.+)$/);
    if (m) return m[1].trim();
    m = line.match(/^if\((.+?)\)\{$/);
    if (m) {
      const parsedC = new ExpressionParser(this.state).parseComparisons(m[1]);
      return `if(${parsedC}){`;
    }
    return null;
  }
}

/* =========================================================================
   ARRAY HANDLER
   ========================================================================= */

class ArrayHandler {
  constructor(state) { this.state = state; }

  declare(name, value) {
    this.state.addVariable(name, 'let');
    return `let ${name} = ${value};`;
  }

  parseArrayOp(varName, op, lineNo) {
    let m;
    const sd = (v, val) => {
      if (this.state.isVariable(v)) return `${v} = ${val};`;
      this.state.addVariable(v, 'let');
      return `let ${v} = ${val};`;
    };
    m = op.match(/^length\s*>>\s*([A-Za-z_]\w*)$/);
    if (m) return sd(m[1], `${varName}.length`);
    m = op.match(/^get\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
    if (m) return sd(m[2], `${varName}[${m[1]}]`);
    m = op.match(/^set\((.+?),\s*(.+?)\)$/);
    if (m) return `${varName}[${m[1]}] = ${m[2]};`;
    m = op.match(/^slice\((.+?),\s*(.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
    if (m) return sd(m[3], `${varName}.slice(${m[1]}, ${m[2]})`);
    m = op.match(/^includes\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
    if (m) return sd(m[2], `${varName}.includes(${m[1]})`);
    m = op.match(/^indexOf\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
    if (m) return sd(m[2], `${varName}.indexOf(${m[1]})`);
    m = op.match(/^join\((.+?)\)\s*>>\s*([A-Za-z_]\w*)$/);
    if (m) return sd(m[2], `${varName}.join(${m[1]})`);
    m = op.match(/^remove\((.+?)\)$/);
    if (m) return `${varName}.splice(${m[1]}, 1);`;
    m = op.match(/^push\((.+?)\)$/);
    if (m) return `${varName}.push(${m[1]});`;
    m = op.match(/^pop\(\)\s*>>\s*([A-Za-z_]\w*)$/);
    if (m) return sd(m[1], `${varName}.pop()`);
    if (op === 'pop()') return `${varName}.pop();`;
    m = op.match(/^shift\(\)\s*>>\s*([A-Za-z_]\w*)$/);
    if (m) return sd(m[1], `${varName}.shift()`);
    if (op === 'shift()') return `${varName}.shift();`;
    m = op.match(/^unshift\((.+?)\)$/);
    if (m) return `${varName}.unshift(${m[1]});`;
    if (op === 'reverse()') return `${varName}.reverse();`;
    if (op === 'sort()')    return `${varName}.sort();`;
    if (op === 'clear()')   return `${varName} = [];`;
    return null;
  }
}

/* =========================================================================
   KEY HANDLER (real-time keyboard)
   ========================================================================= */

class KeyHandler {
  constructor(state) { this.state = state; this._setup = false; }

  ensureSetup() {
    if (this._setup) return [];
    this._setup = true;
    return [
      `if (!global.__pazzle_keys) {`,
      `  const __rl_keys = require('readline');`,
      `  __rl_keys.emitKeypressEvents(process.stdin);`,
      `  if (process.stdin.isTTY) process.stdin.setRawMode(true);`,
      `  global.__pazzle_keys = {};`,
      `  process.stdin.on('keypress', (str, key) => {`,
      `    if (!key) return;`,
      `    if (key.ctrl && key.name === 'c') { process.stdout.write('\\x1b[?25h'); process.exit(0); }`,
      `    global.__pazzle_keys[key.name] = true;`,
      `    setTimeout(() => { if(global.__pazzle_keys) global.__pazzle_keys[key.name] = false; }, 80);`,
      `  });`,
      `}`,
    ];
  }

  parse(keyName, lines, startIndex) {
    const setup = this.ensureSetup();
    const js = [...setup];
    js.push(`if (global.__pazzle_keys && global.__pazzle_keys['${keyName}']) {`);
    let depth = 1;
    let i = startIndex + 1;
    const printHandler = new PrintHandler(this.state);
    const varEditor    = new VariableEditor(this.state);
    while (i < lines.length && depth > 0) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) { i++; continue; }
      const openCount  = (line.match(/\{/g) || []).length;
      const closeCount = (line.match(/\}/g) || []).length;
      depth += openCount - closeCount;
      if (depth <= 0) { js.push('}'); break; }
      const _ve = parseVarEditorLine(line);
      if (_ve) { const r = varEditor.parse(_ve.varName, _ve.property, _ve.value, i+1); (Array.isArray(r)?r:[r]).forEach(l=>js.push('  '+l)); i++; continue; }
      let m = line.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
      if (m) { js.push('  ' + printHandler.parse(m[1], m[2], i+1)); i++; continue; }
      m = line.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
      if (m) { js.push(`  ${m[1]}(${m[2]});`); i++; continue; }
      m = line.match(/^runJS:\s*(.+)$/);
      if (m) { js.push('  ' + m[1].trim()); i++; continue; }
      m = line.match(/^make\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
      if (m) { this.state.addVariable(m[1],'let'); js.push(`  let ${m[1]} = ${m[2]};`); i++; continue; }
      PazzleWarn(i+1, `Unrecognized syntax in onKey: ${line}`);
      i++;
    }
    return { code: js, endIndex: i };
  }
}

/* =========================================================================
   DOM & HTML PARSER
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
    return `const ${varName}inner = fs.readFileSync('${fileName}', "utf8");`;
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

  const fileBase = path.basename(filePath, '.pazzle');
  PazzleInfo(`Parsing ${path.basename(filePath)}...`, filePath);

  const code = fs.readFileSync(filePath, "utf8");
  const lines = code.split("\n");

  const state = new ParserState();

  let inComment = false;

  const exprParser = new ExpressionParser(state);
  const printHandler = new PrintHandler(state);
  const regexHandler = new RegexHandler(state);
  const varEditor = new VariableEditor(state);
  const functionParser = new FunctionParser(state);
  const conditionalParser = new ConditionalParser(state);
  const loopParser = new LoopParser(state);
  const whileParser = new WhileParser(state);
  const arrayHandler = new ArrayHandler(state);
  const keyHandler = new KeyHandler(state);
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
      // تسجيل نوع المتغير إذا كان new ClassName(...)
      const isOwnClass = value.match(/^new\s+([A-Za-z_]\w*)\s*\(/);
      if (isOwnClass) {
        varTypes[name] = isOwnClass[1];
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
    m = line.match(/^catch\s+([A-Za-z_]\w*)\s*\((.+?)\)\s*\{$/);
    if (m) {
      const result = functionParser.parse(m[1], lines, i, m[2].replaceAll(' ','').split(','));
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

        const printMatch = inner.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
        if (printMatch) {
          state.addJS(`  ${printHandler.parse(printMatch[1], printMatch[2], i + 1)}`);
        }

        i++;
      }

      matched = true;
      continue;
    }

    // ===== Conditional (if) =====
    m = line.match(/^if\((.+?)\)\{$/);
    if (m) {
      const parsedCond = exprParser.parseComparisons(m[1]);
      const result = conditionalParser.parse(parsedCond, lines, i);
      result.code.forEach(l => state.addJS(l));
      i = result.endIndex;
      matched = true;
      continue;
    }

    // ===== Loop (interval) =====
    m = line.match(/^loop_to\.end\.time\(\{(\d+(?:\.\d+)?)\}\[\{$/);
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

    // ===== While Loop =====
    m = line.match(/^while\((.+?)\)\{$/);
    if (m) {
      const result = whileParser.parse(m[1], lines, i);
      result.code.forEach(l => state.addJS(l));
      i = result.endIndex;
      matched = true;
      continue;
    }

    // ===== Array Declaration: make arr = [] or make arr = [1,2,3] =====
    m = line.match(/^make\s+([A-Za-z_]\w*)\s*=\s*(\[.*\])$/);
    if (m) {
      state.addJS(arrayHandler.declare(m[1], m[2]));
      matched = true;
      continue;
    }

    // ===== Array Operations =====
    m = line.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
    if (m && state.isVariable(m[1])) {
      const op = m[2].trim();
      const isArrayOp = /^(push|pop|shift|unshift|reverse|sort|clear|remove|get\(|set\(|slice|includes|indexOf|join|length)/.test(op);
      if (isArrayOp) {
        const arrRes = arrayHandler.parseArrayOp(m[1], op, lineNo);
        if (arrRes) { state.addJS(arrRes); matched = true; continue; }
      }
    }

    // ===== onKey(keyname) { ... } =====
    m = line.match(/^onKey\(([A-Za-z_]\w*)\)\s*\{$/);
    if (m) {
      const result = keyHandler.parse(m[1], lines, i);
      result.code.forEach(l => state.addJS(l));
      i = result.endIndex;
      matched = true;
      continue;
    }

    // ===== Raw JS =====
    m = line.match(/^runJS:\s*(.+)$/);
    if (m) {
      state.addJS(m[1].trim());
      matched = true;
      continue;
    }

    // ===== Built-in functions =====
    const _builtinMain = parseBuiltinCall(line, state);
    if (_builtinMain) {
      state.addJS(_builtinMain);
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
    m = line.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
    if (m) {
      state.addJS(printHandler.parse(m[1], m[2], lineNo));
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
    m = line.match(/^read\s*\(\s*(.+?)\s*\)$/);
    if (m) {
      const varName = m[1].replace(/\./g, "_");
      state.addJS(fsHandler.readFile(m[1], varName));
      state.addVariable(`${varName}inner`, 'const');
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
    m = line.match(/^link\s+(index|script)\s+(.+)$/);
    if (m) {
      const linkType = m[1];
      const linkTarget = m[2].trim();
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
    m = line.match(/^match\s+(.+?)\s*\{$/);
    if (m) {
      const varName = m[1].trim();
      if (!state.isVariable(varName)) {
        PazzleWarn(lineNo, `'${varName}' may not be declared — using in match anyway`);
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

        if (caseLine === "_{" || caseLine === "_ {") {
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
            let ma = innerLine.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
            if (ma) { state.addJS(`  ${printHandler.parse(ma[1], ma[2], i + 1, filePath)}`); i++; continue; }
            const _vei = parseVarEditorLine(innerLine);
            if (_vei) { const res = varEditor.parse(_vei.varName, _vei.property, _vei.value, i + 1); res.forEach(l => state.addJS("  " + l)); i++; continue; }
            ma = innerLine.match(/^call\s+([A-Za-z_]\w*)\s*\((.*?)\)$/);
            if (ma) { state.addJS(`  ${ma[1]}(${ma[2]});`); i++; continue; }
            ma = innerLine.match(/New\s+LANG\s+simple\{/);
            if (ma) {
              const sr = parseSimple(lines.join('\n'), i + 2, state);
              i += sr.i;
              sr.code.split('\n').forEach(l => state.addJS("  " + l));
              caseDepth--;
              continue;
            }
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

            let ma = innerLine.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
            if (ma) { state.addJS(`  ${printHandler.parse(ma[1], ma[2], i + 1)}`); i++; continue; }
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
            if(innerLine ==="end") break;
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
    m = line.match(/^run\s+(.+)$/);
    if (m) {
      const toRun = m[1].replace('\n', ';').split(';');
      let ri = 0;
      while (ri < toRun.length) {
        const cmd = toRun[ri].trim();
        if (!cmd) { ri++; continue; }

        let ma = cmd.match(/^local\.txtar\s*\(\s*(print|link|reprint|Up|printUp|down|printDown)\((.+?)\)\s*\)$/);
        if (ma) { state.addJS(printHandler.parse(ma[1], ma[2], lineNo)); ri++; continue; }
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
    m = line.match(/async\s+(.+?)\s*=\s*(.+)$/);
    if (m) {
      let [, name, value] = m;
      value = value.trim();
      PazzleWarn(lineNo, `'async' keyword here is not real async/await - it only reads from command line inputs`);
      state.addVariable(name, 'let');
      let inputCode = "";
      let mValue = value.match(/^Input\((.+?)\)$/);
      if (mValue) {
        inputCode = `'${newInputsInCMD[Number(mValue[1].trim()) - 1] || ''}'`;
      }
      mValue = value.match(/get\s+json\s+\((.+?)\)/);
      if (mValue) {
        inputCode = `JSON.parse(require("fs").readFileSync('${fileBase}.json','utf8')).${mValue[1]}`;
      }
      mValue = value.match(/Inputs/);
      if (mValue) {
        inputCode = `'${newInputsInCMD.join(" ")}'`;
      }
      mValue = value.match(/Input\.area/);
      if (mValue) {
        inputCode = `[${newInputsInCMD.join(",").forEach(i => `'${i}'`)}]`;
      }
      mValue = value.match(/^Input\s+By\s+non-string\((.+?)\)$/);
      if (mValue) {
        inputCode = `${newInputsInCMD[Number(mValue[1].trim()) - 1] || 'none'}`;
      }
      mValue = value.match(/Input\s+By\s+non-string\.area/);
      if (mValue) {
        inputCode = `[${newInputsInCMD.join(",")}]`;
      }
      mValue = value.match(/Input\s+By\s+all\((\d+)\)/);
      if (mValue) {
        inputCode = `{ no: ${newInputsInCMD[Number(mValue[1].trim()) - 1] || 'none'}, string: '${newInputsInCMD[Number(mValue[1].trim()) - 1] || ''}'}`;
      }
      mValue = value.match(/Input\s+By\s+all\.area\((\d+)\)/);
      if (mValue) {
        inputCode = `[${newInputsInCMD.map(i => `{ no: ${i}, string: '${i}' }`).join(",")}]`;
      }
      state.addJS(`let ${name} = ${inputCode};`);
      matched = true;
      continue;
    }

    if (line === "}") {
      matched = true;
      continue;
    }

    m = line.match(/New\s+LANG\s+simple\s*\{/);
    if (m) {
      let simpleResult = parseSimple(lines.join('\n'), lineNo + 1, state);
      i += simpleResult.i;
      let simpleCode = simpleResult.code.split('\n');
      for (let loop = 0; loop < simpleCode.length; loop++) {
        state.addJS(simpleCode[loop]);
      }
      matched = true;
      continue;
    }

    m = line.match(/auto:(end|start)\*\(\)/);
    if (m) {
      if (m[1] === 'end') {
        state.addJS('function weirdVar(){');
        state.addJS('  const chars = "abcdefghijklmnopqrstuvwxyz";');
        state.addJS('  const len = Math.floor(Math.random()*12)+5;');
        state.addJS('  return Array.from({length:len}, () =>');
        state.addJS('    chars[Math.floor(Math.random()*chars.length)]');
        state.addJS('  ).join("");');
        state.addJS('}');
        state.addJS(`setInterval(() => {`);
        state.addJS(`  auto = weirdVar();`);
        state.addJS(`}, 10);`);
        matched = true;
        continue;
      }
      if (m[1] === 'start') {
        state.addJS(`let auto = weirdVar();`);
        matched = true;
        continue;
      }
    }

    m = line.match(/app:rerun\*\((.+?)\)/);
    if (m) {
      const targetFile = m[1];
      const resolvedDir = path.dirname(filePath);
      state.addJS(`const { exec } = require("child_process");`);
      state.addJS(`exec('python "${path.resolve(resolvedDir, targetFile)}"', (error, stdout, stderr) => {`);
      state.addJS(`  if (error) {`);
      state.addJS(`    console.error(\`[Runtime Error]: \${error.message}\`);`);
      state.addJS(`    return;`);
      state.addJS(`  }`);
      state.addJS(`  if (stderr) {`);
      state.addJS(`    console.error(\`[Internal Error]: \${stderr}\`);`);
      state.addJS(`    return;`);
      state.addJS(`  }`);
      state.addJS(`  console.log(stdout);`);
      state.addJS(`});`);
      matched = true;
      continue;
    }

    m = line.match(/^(hide|show)\s+(info|warn|error)$/);
    if (m) {
      JSONdata[`${filePath}${m[2]}`] = m[1];
      matched = true;
      continue;
    }

    m = line.match(/^Add\s+Variable\s+property\s+\((\w+),\s*(.+?)\)$/);
    if (m) {
      const [_, propName, funcBody] = m;
      varEditorInputs[propName] = funcBody;
      matched = true;
      continue;
    }
    
    // ===== Type Definition =====
    m = line.match(/^type\s+([A-Za-z_]\w*)\s*\{$/);
    if (m) {
      const typeName = m[1];
      let props = [];
      let methods = [];
      let constructorArgs = [];
      i++;

      while (i < lines.length) {
        const propLine = lines[i].trim();
        if (!propLine || propLine.startsWith('#')) { i++; continue; }

        // الـ } المُغلق للـ type (سطر يحتوي فقط على })
        if (propLine === '}') {
          i++; // نتخطى الـ }
          break;
        }

        // method: name(args) { - يجب الكشف عنه أولاً قبل احتساب depth
        let propMatch = propLine.match(/^(\w+)\s*\((.*?)\)\s*\{$/);
        if (propMatch) {
          const mName = propMatch[1];
          const mArgs = propMatch[2].split(",").map(s => s.trim()).filter(s => s);
          const bodyLines = [];
          i++;
          let methodDepth = 1;
          while (i < lines.length && methodDepth > 0) {
            const innerLine = lines[i].trim();
            const iOpen  = (innerLine.match(/\{/g) || []).length;
            const iClose = (innerLine.match(/\}/g) || []).length;
            methodDepth += iOpen - iClose;
            if (methodDepth <= 0) { i++; break; }
            if (innerLine && !innerLine.startsWith("#")) bodyLines.push(innerLine);
            i++;
          }
          methods.push({ name: mName, args: mArgs, body: bodyLines });
          continue;
        }

        // property: name = value
        propMatch = propLine.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
        if (propMatch) {
          const pName = propMatch[1];
          const pValue = propMatch[2].trim();
          if (!pValue.startsWith('"') && !pValue.startsWith("'") && !state.isVariable(pValue) && isNaN(pValue)) {
            constructorArgs.push(pValue);
          }
          props.push({ name: pName, value: pValue });
          i++;
          continue;
        }

        i++;
      }

      // توليد الكلاس
      state.addJS(`class ${typeName} {`);
      state.addJS(`  constructor(${constructorArgs.join(", ")}) {`);
      props.forEach(p => {
        state.addJS(`    this.${p.name} = ${p.value};`);
      });
      state.addJS(`  }`);

      methods.forEach(method => {
        state.addJS(`  ${method.name}(${method.args.join(", ")}) {`);
        props.forEach(p => {
          state.addJS(`    let ${p.name} = this.${p.name};`);
        });
        for (const bodyLine of method.body) {
          let translated = null;
          const ve = parseVarEditorLine(bodyLine);
          if (ve) {
            const editorRes = varEditor.parse(ve.varName, ve.property, ve.value, i);
            translated = Array.isArray(editorRes) ? editorRes.join("\n    ") : editorRes;
          } else if (bodyLine.startsWith("return ")) {
            translated = bodyLine + ";";
          } else {
            translated = functionParser.parseFunctionLine(bodyLine, i);
          }
          if (translated) {
            const lines2 = Array.isArray(translated) ? translated : [translated];
            lines2.forEach(l => state.addJS(`    ${l}`));
          } else {
            PazzleWarn(i, `Unhandled line in method '${method.name}': ${bodyLine}`);
          }
        }
        const hasReturn = method.body.some(l => l.trim().startsWith("return"));
        if (!hasReturn) {
          props.forEach(p => {
            state.addJS(`    this.${p.name} = ${p.name};`);
          });
        }
        state.addJS(`  }`);
      });

      state.addJS(`}`);
      matched = true;
      // i مضبوط بالفعل من داخل الحلقة (يشير للسطر التالي بعد })
      // الـ for سيعمل i++ فنطرح 1 لنعوض
      i--;
      continue;
    }





    m = line.match(/^type\s+([A-Za-z_]\w*)\s+from\s+(.+?)\s*\{$/);
    if (m) {
      const typeName = m[1];
      let props = [];
      let methods = [];
      let constructorArgs = [];
      let parentArgs = [];
      i++;

      while (i < lines.length) {
        const propLine = lines[i].trim();
        if (!propLine || propLine.startsWith('#')) { i++; continue; }

        // الـ } المُغلق للـ type (سطر يحتوي فقط على })
        if (propLine === '}') {
          i++; // نتخطى الـ }
          break;
        }

        // method: name(args) { - يجب الكشف عنه أولاً قبل احتساب depth
        let propMatch = propLine.match(/^(\w+)\s*\((.*?)\)\s*\{$/);
        if (propMatch) {
          const mName = propMatch[1];
          const mArgs = propMatch[2].split(",").map(s => s.trim()).filter(s => s);
          const bodyLines = [];
          i++;
          let methodDepth = 1;
          while (i < lines.length && methodDepth > 0) {
            const innerLine = lines[i].trim();
            const iOpen  = (innerLine.match(/\{/g) || []).length;
            const iClose = (innerLine.match(/\}/g) || []).length;
            methodDepth += iOpen - iClose;
            if (methodDepth <= 0) { i++; break; }
            if (innerLine && !innerLine.startsWith("#")) bodyLines.push(innerLine);
            i++;
          }
          methods.push({ name: mName, args: mArgs, body: bodyLines });
          continue;
        }
        propMatch = propLine.match(/parent\((.*?)\)/);
        if (propMatch) {
          parentArgs.push(...propMatch[1].split(",").map(s => s.trim()).filter(s => s));
        }
        // property: name = value
        propMatch = propLine.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
        if (propMatch) {
          const pName = propMatch[1];
          const pValue = propMatch[2].trim();
          if (!pValue.startsWith('"') && !pValue.startsWith("'") && !state.isVariable(pValue) && isNaN(pValue)) {
            constructorArgs.push(pValue);
          }
          props.push({ name: pName, value: pValue });
          i++;
          continue;
        }

        i++;
      }

      // توليد الكلاس
      state.addJS(`class ${typeName} extends ${m[2].trim()} {`);
      state.addJS(`  constructor(${constructorArgs.join(", ")}) {`);
      state.addJS(`    super(${parentArgs.join(", ")});`);
      props.forEach(p => {
        state.addJS(`    this.${p.name} = ${p.value};`);
      });
      state.addJS(`  }`);

      methods.forEach(method => {
        state.addJS(`  ${method.name}(${method.args.join(", ")}) {`);
        props.forEach(p => {
          state.addJS(`    let ${p.name} = this.${p.name};`);
        });
        for (const bodyLine of method.body) {
          let translated = null;
          const ve = parseVarEditorLine(bodyLine);
          if (ve) {
            const editorRes = varEditor.parse(ve.varName, ve.property, ve.value, i);
            translated = Array.isArray(editorRes) ? editorRes.join("\n    ") : editorRes;
          } else if (bodyLine.startsWith("return ")) {
            translated = bodyLine + ";";
          } else {
            translated = functionParser.parseFunctionLine(bodyLine, i);
          }
          if (translated) {
            const lines2 = Array.isArray(translated) ? translated : [translated];
            lines2.forEach(l => state.addJS(`    ${l}`));
          } else {
            PazzleWarn(i, `Unhandled line in method '${method.name}': ${bodyLine}`);
          }
        }
        const hasReturn = method.body.some(l => l.trim().startsWith("return"));
        if (!hasReturn) {
          props.forEach(p => {
            state.addJS(`    this.${p.name} = ${p.name};`);
          });
        }
        state.addJS(`  }`);
      });

      state.addJS(`}`);
      matched = true;
      // i مضبوط بالفعل من داخل الحلقة (يشير للسطر التالي بعد })
      // الـ for سيعمل i++ فنطرح 1 لنعوض
      i--;
      continue;
    }
    

    if (!matched) {
      PazzleError(lineNo, `Unknown syntax: ${line}`);
    }
  }

  state.addJS('Number.prototype.add = function(value) { return this + value; };');
  state.addJS('Number.prototype.subtract = function(value) { return this - value; };');
  state.addJS('Number.prototype.multiply = function(value) { return this * value; };');
  state.addJS('Number.prototype.divide = function(value) { return this / value; };');
  state.addJS('Number.prototype.mod = function(value) { return this % value; };');
  state.addJS('Number.prototype.power = function(value) { return this ** value; };');
  state.addJS('Number.prototype.set = function(value) { return value; };');
  state.addJS('Boolean.prototype.toggle = function() { return !this; };');
  state.addJS('Number.prototype.increment = function() { return this + 1; };');
  state.addJS('Number.prototype.decrement = function() { return this - 1; };');
  state.addJS('String.prototype.add = function(value) { return this + value; };');
  state.addJS('String.prototype.set = function(value) { return value; };');
  state.addJS('Number.prototype.IfEmpty = function(value) { if (this === "" || this === null || this === undefined || this === false || this === 0 || this <= 0) { return value; } else { return this; } };');
  state.addJS('Number.prototype.SetMax = function(value) { if (this > value) { return value; } else { return this; } };');
  state.addJS('Number.prototype.SetMin = function(value) { if (this < value) { return value; } else { return this; } };');

  /* ========= Output Generation ========= */
  
  const outFile = fileBase + ".js";
  const outputPath = path.resolve(path.dirname(filePath), outFile);

  fs.writeFileSync(outputPath, state.getOutput(), "utf8");
  PazzleInfo(`✔ Generated: ${outFile}`, filePath);

  if (state._pendingLink) {
    const { type, target } = state._pendingLink;
    if (type === "index") {
      PazzleInfo(`Linking to ${target}...`, filePath);
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
          PazzleInfo(`✔ Linked successfully to ${target}`, filePath);
        } else {
          PazzleWarn(0, `Could not find <script> tags in ${target}`);
        }
      } catch (err) {
        PazzleWarn(0, `Link failed: ${err.message}`);
      }
    }
  }

  /* ========= Execution ========= */

  const { spawn } = require("child_process");

  const child = spawn("node", [outputPath], { stdio: "inherit" });

  child.on("error", (err) => {
    console.error(`[Runtime Error]: ${err.message}`);
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[Pazzle] Process exited with code ${code}`);
    }
  });
}

/* =========================================================================
   CLI INTERFACE
   ========================================================================= */

function printHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║            🧩 Pazzle Parser v14.4 (Self-Contained Edition)    ║
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
  ✓ Loops (interval, for, while)
  ✓ File System Operations
  ✓ DOM Manipulation
  ✓ Variable Editing
  ✓ Print System
  ✓ Match Statements (with default case)
  ✓ Types (classes)
  `);
}

class parseSimpleClass {
  color(line) {
    let m = line.match(/(.+?)\s*\(\s*(.+?)\s*\)/);
    if (!m) return null;

    let id = "";
    switch (m[1].trim()) {
      case "red":    id = "31"; break;
      case "green":  id = "32"; break;
      case "yellow": id = "33"; break;
      case "blue":   id = "34"; break;
      case "purple": id = "35"; break;
      case "cyan":   id = "36"; break;
      default:       id = "0";
    }
    return `console.log("\\x1b[${id}m${m[2]}\\x1b[0m")`;
  }
}

function startCompilation() {
  const target = process.argv[2];

  if (!target || target === "--help" || target === "-h") {
    printHelp();
    process.exit(0);
  }

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
    PazzleInfo("👀 Pazzle is watching for changes...", '');

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
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(substr)) {
      return i;
    }
  }
  return -1;
}

function parseSimple(code, lineNo, state) {
  let depth = 1;
  EPnum++;
  let codeTwo = code.split('\n');
  let i = -1;
  let endLine = 0;
  let result = [];

  while (i < codeTwo.length) {
    if (lineNo + i >= codeTwo.length) break;

    let line = codeTwo[lineNo + i].trim();

    if (!line || line.startsWith('#')) {
      i++;
      continue;
    }

    if (line.includes("{")) depth++;
    if (line.includes("}")) {
      depth--;
      if (depth === 0) {
        endLine = i;
        break;
      }
    }

    if (line.startsWith('"') && line.endsWith('"')) {
      let mtwo = line.match(/"(.+?)"/);
      result.push(`console.log("${mtwo[1]}")`);
      i++;
      continue;
    }

    if (line.startsWith("'") && line.endsWith("'")) {
      let mtwo = line.match(/'(.+?)'/);
      result.push(`console.log('${mtwo[1]}')`);
      i++;
      continue;
    }

    let m = line.match(/(.+?)\s+share\s+in\s+(.+)/);
    if (m) {
      let mtwo = m[2].trim().match(/show\s+Input\((.*)?\)/);
      if (mtwo) {
        const prompt = mtwo[1] ? mtwo[1] : '';
        const varName = m[1].trim();
        if (state) state.addVariable(varName, 'let');

        if (qcount === 0) {
          result.push(
            `if (!global.__pazzle_rl) {\n` +
            `  const __rl_mod = require('readline');\n` +
            `  global.__pazzle_rl = __rl_mod.createInterface({ input: process.stdin, output: null, terminal: false });\n` +
            `  global.__pazzle_queue = [];\n` +
            `  global.__pazzle_lines = [];\n` +
            `  global.__pazzle_rl.on('line', (l) => {\n` +
            `    if (global.__pazzle_queue.length > 0) {\n` +
            `      global.__pazzle_queue.shift()(l);\n` +
            `    } else {\n` +
            `      global.__pazzle_lines.push(l);\n` +
            `    }\n` +
            `  });\n` +
            `}\n` +
            `function __pazzleAsk(prompt) {\n` +
            `  return new Promise((resolve) => {\n` +
            `    if (global.__pazzle_lines.length > 0) {\n` +
            `      resolve(global.__pazzle_lines.shift());\n` +
            `    } else {\n` +
            `      if (prompt) process.stdout.write(prompt);\n` +
            `      global.__pazzle_queue.push(resolve);\n` +
            `    }\n` +
            `  });\n` +
            `}`
          );
        }
        qcount++;
        result.push(`let ${varName} = await __pazzleAsk(${JSON.stringify(prompt)});`);
        i++;
        continue;
      }
      if (state) state.addVariable(m[1].trim(), 'let');
      result.push(`jsonArea['${m[1]}'] = ${m[2]}`);
      i++;
      continue;
    }

    m = line.match(/(.+?)\s*=\s*(.+)/);
    if (m) {
      result.push(line);
      i++;
      continue;
    }

    m = line.match(/(.+?)\s*\(\s*(.+?)\s*\)/);
    if (m) {
      const classS = new parseSimpleClass();
      const colored = classS.color(line);
      if (colored) result.push(colored);
      i++;
      continue;
    }

    i++;
  }

  return { i: endLine + 1, code: result.join('\n') };
}