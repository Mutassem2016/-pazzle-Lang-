# 🧩 Pazzle Language Documentation
**Version 14.1** — A transpiled scripting language that compiles to JavaScript.

---

## Table of Contents
1. [Overview](#overview)
2. [Comments](#comments)
3. [Variables](#variables)
4. [Constants](#constants)
5. [Printing](#printing)
6. [Variable Operations](#variable-operations)
7. [Functions](#functions)
8. [Conditionals](#conditionals)
9. [Loops](#loops)
10. [Match Statements](#match-statements)
11. [Regular Expressions](#regular-expressions)
12. [File System](#file-system)
13. [DOM Manipulation](#dom-manipulation)
14. [Navigation](#navigation)
15. [Linking to HTML](#linking-to-html)
16. [Run Command](#run-command)

---

## Overview

Pazzle is a custom scripting language that compiles into JavaScript. You write `.pazzle` files and run them with the Pazzle parser, which generates a `.js` file and executes it automatically.

```
pazzle myfile.pazzle
```

---

## Comments

Lines starting with `#` are comments and are ignored by the parser.

```
# This is a comment
make x = 10  # inline comments are NOT supported — use full-line only
```

---

## Variables

Use `make` to declare a mutable variable.

```
make name = "Alice"
make score = 0
make total = 100
```

To get a DOM element by ID:
```
make btn = get myButton
```
> Compiles to: `let btn = document.getElementById("myButton");`

---

## Constants

Use `stop` to declare a constant (cannot be reassigned).

```
stop PI = 3.14159
stop MAX = 100
```

To get a DOM element as a constant:
```
stop header = get pageHeader
```

---

## Printing

```
local.My's.web.txtar(print("Hello, World!"))
local.My's.web.txtar(print(name))
local.My's.web.txtar(print(score + 10))
```

> Compiles to `console.log(...)`.

---

## Variable Operations

Use the syntax `variable:operation(value)` to modify variables.

### Arithmetic
| Pazzle | Effect |
|--------|--------|
| `x:add(5)` | `x += 5` |
| `x:subtract(3)` | `x -= 3` |
| `x:multiply(2)` | `x *= 2` |
| `x:divide(4)` | `x /= 4` |
| `x:mod(3)` | `x %= 3` |
| `x:power(2)` | `x **= 2` |
| `x:set(10)` | `x = 10` |
| `x:increment()` | `x++` |
| `x:decrement()` | `x--` |
| `x:toggle()` | `x = !x` |

### Conditional Assignment
| Pazzle | Effect |
|--------|--------|
| `x:IfEmpty(0)` | Sets x to 0 if it's empty/null/0/false |
| `x:SetMax(100)` | Caps x at 100 |
| `x:SetMin(0)` | Ensures x is at least 0 |

### DOM Assignment
| Pazzle | Effect |
|--------|--------|
| `x:To(element)` | `element.innerText = x` |
| `x:From(element)` | `x = element.innerText` |
| `x:ToHTML(element)` | `element.innerHTML = x` |
| `x:FromHTML(element)` | `x = element.innerHTML` |
| `x:ToValue(element)` | `element.value = x` |
| `x:FromValue(element)` | `x = element.value` |

### Transfer
```
x:take(source, 5)
```
> Moves 5 from `source` to `x`. Compiles to: `x += 5; source -= 5;`

### Multiple Variables
You can apply an operation to multiple variables at once:
```
a, b, c:set(0)
```

---

## Functions

Define functions with `catch`, close with `}`.

```
catch greet {
  local.My's.web.txtar(print("Hello!"))
}
```

Call a function:
```
call greet()
```

Functions support: `make`, `stop`, `return`, `call`, `print`, variable operations, `write`, and `if`.

```
catch add {
  make result = 5
  result:add(3)
  return result
}
```

---

## Conditionals

```
if(x > 10){
  local.My's.web.txtar(print("Big"))
}else if(x === 5){
  local.My's.web.txtar(print("Five"))
}else{
  local.My's.web.txtar(print("Small"))
}
```

Comparisons also support natural language:
```
if(x equals 10){ ... }
if(x not equals 0){ ... }
if(x greater than 5){ ... }
if(x less than 100){ ... }
```

---

## Loops

### Interval Loop (repeats every N seconds)
```
loop_to.end.time({3}[{
  local.My's.web.txtar(print("tick"))
}]
```
> Runs every 3 seconds. Compiles to `setInterval(...)`.

### For Loop
```
for i from 1 to 10 {
  local.My's.web.txtar(print(i))
}
```

With a custom step:
```
for i from 0 to 100 step 5 {
  local.My's.web.txtar(print(i))
}
```

---

## Match Statements

Like a switch/case:
```
match color {
  "red" {
    local.My's.web.txtar(print("Stop!"))
  }
  "green" {
    local.My's.web.txtar(print("Go!"))
  }
}
```

> **Note:** `color` must be declared with `make` before using `match`.

---

## Regular Expressions

```
myString = RE((word) (num)) to(firstName, age){
  local.My's.web.txtar(print(firstName))
  local.My's.web.txtar(print(age))
}
```

### Built-in Patterns
| Pattern | Matches |
|---------|---------|
| `(num)` | One or more digits |
| `(word)` | One or more word characters |
| `(any)` | Any characters (greedy) |
| `(letter)` | A single letter |
| `(digit)` | A single digit |
| `(numCL)` | Digits (lazy) |
| `(wordCL)` | Word chars (lazy) |
| `(anyCL)` | Any chars (lazy) |
| `(dot)` | A literal `.` |
| `(_)` | Optional whitespace |
| `(\|)` | A literal `\|` |
| `b(` | A literal `(` |
| `b)` | A literal `)` |

---

## File System

First, enable file system support:
```
fs
```

### Read a file
```
read("data.txt")
```

### Write to a file
```
write("output.txt", myVariable)
```

---

## DOM Manipulation

Create an HTML element:
```
local.Make = local.web || front-end ||.| loop_to.find(element("myDiv")&hasType("div")).make_it on Equal("container")
```
> Creates a `<div>` element named `myDiv` with class `container`.

---

## Navigation

Add this once to enable the `goTo` function:
```
sc
```

Then use it in your linked HTML/JS:
```javascript
goTo("https://example.com");
```

---

## Linking to HTML

Inject the compiled Pazzle JS into an HTML file's `<script>` tag:
```
link index index.html
```

> The HTML file must already have `<script>` and `</script>` tags. The parser will replace the content between them with the compiled code.

---

## Run Command

Execute inline Pazzle commands separated by semicolons:
```
run x:add(1); local.My's.web.txtar(print(x))
```

> Supports: print, variable operations, call, write, read, if, for, and match.

---

## Full Example

```pazzle
fs
make score = 0
make name = "Player"
stop MAX = 100

catch updateScore {
  score:add(10)
  score:SetMax(MAX)
}

call updateScore()

if(score equals 100){
  local.My's.web.txtar(print("Max score reached!"))
}else{
  local.My's.web.txtar(print(score))
}

for i from 1 to 5 {
  local.My's.web.txtar(print(i))
}

write("score.txt", score)
```

---

*Pazzle Parser v14.1 — Fixed Edition*