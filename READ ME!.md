markdown
<div align="center">

# 🧩 Pazzle

**لغة برمجة نصية حديثة مبنية فوق Node.js**

سهلة التعلم — قوية في التعبير — تُترجم إلى JavaScript وتُشغَّل مباشرةً

*Pazzle Parser v15.7*

</div>

---

## 📖 ما هي Pazzle؟

**Pazzle** هي لغة برمجة نصية (Scripting Language) مبنية فوق **Node.js**. تكتب ملفات بامتداد `.pazzle`، فيقوم الـ Parser بترجمتها إلى **JavaScript** ثم تشغيلها تلقائيًا.

اللغة مصمَّمة لتكون:

- 🎯 **بسيطة**: كل سطر = جملة واحدة، صياغة قريبة من اللغة الطبيعية
- ⚡ **سريعة البدء**: بدون إعدادات معقّدة، اكتب وشغّل
- 🧰 **غنية**: دوال، كلاسات، Regex، Terminal، لوحة مفاتيح، ملفات، مصفوفات
- 🔧 **قابلة للتوسّع**: يمكن إضافة عمليات مخصصة من داخل الكود نفسه

---

## 📚 الفهرس

- [التثبيت والتشغيل](#-التثبيت-والتشغيل)
- [أوامر CLI](#-أوامر-cli)
- [بنية المشروع](#-بنية-المشروع)
- [ملف الإعدادات set.json](#-ملف-الإعدادات-setjson)
- [التعليقات](#-التعليقات)
- [المتغيرات والثوابت](#-المتغيرات-والثوابت)
- [الطباعة](#-الطباعة)
- [الشروط](#-الشروط)
- [الحلقات](#-الحلقات)
- [الدوال](#-الدوال)
- [المصفوفات](#-المصفوفات)
- [محرر المتغيرات](#-محرر-المتغيرات)
- [الدوال المدمجة](#-الدوال-المدمجة)
- [التعبيرات النمطية Regex](#-التعبيرات-النمطية-regex)
- [Match](#-match)
- [الأنواع Classes](#-الأنواع-classes)
- [Terminal](#-terminal)
- [لوحة المفاتيح](#-لوحة-المفاتيح)
- [الملفات](#-الملفات)
- [المدخلات](#-المدخلات)
- [النمط المبسط simple](#-النمط-المبسط--new-lang-simple)
- [include](#-include)
- [أوامر متفرقة](#-أوامر-متفرقة)
- [أمثلة كاملة](#-أمثلة-كاملة)
- [الإصدارات](#-الإصدارات)
- [المساهمة](#-المساهمة)
- [الترخيص](#-الترخيص)

---

## 🚀 التثبيت والتشغيل

### المتطلبات

- **Node.js** (v14+)

### التشغيل

```bash
# تشغيل ملف واحد
pazzle hello.pazzle

# تشغيل كل ملفات .pazzle في المجلد الحالي
pazzle .

# وضع المراقبة (watch mode)
pazzle -w

# المساعدة
pazzle --help

# الإصدار
pazzle -v
```
كيف يعمل؟
يقرأ ملف <name>.pazzle

يُترجمه إلى <name>.js في نفس المجلد

يشغّل الملف الناتج تلقائيًا عبر Node

💡 إذا احتوى الكود على await (مثل استخدام Input)، يُغلَّف الملف الناتج بالكامل داخل async IIFE تلقائيًا، مع إغلاق readline في النهاية.

🖥️ أوامر CLI
الأمر	الوظيفة
pazzle <file.pazzle>	ترجمة وتشغيل ملف واحد
pazzle . أو pazzle -all	ترجمة كل ملفات .pazzle
pazzle -w	وضع المراقبة
pazzle -v / --version	عرض الإصدار
pazzle --help / -h	المساعدة
pazzle -comma change -v <n>	تغيير الإصدار مؤقتًا
أي وسائط إضافية بعد اسم الملف تُخزَّن وتُستخدم في Input(...):

```bash
pazzle app.pazzle Ahmed 25 admin
```
🗂️ بنية المشروع
text
my-project/
├── app.pazzle          ← الكود
├── helpers.pazzle      ← ملف قابل للـ include (v16+)
├── set.json            ← الإعدادات
└── app.js              ←الملف المُترجم (لا تحرّره يدويًا)
⚙️ ملف الإعدادات set.json
يوضع بجانب ملف .pazzle:

```json
{
  "version": 16,
  "info": true,
  "warnings": true
}
```
الحقل	معناه	الافتراضي
version	إصدار المشروع (يفعّل ميزات مثل include)	15.7
info	رسائل المعلومات [Pazzle Info]	true
warnings	رسائل التحذير [Pazzle Warning]	true
التحكم المحلي أثناء التشغيل:

```pazzle
hide info
hide warn
hide error
show info
```
💬 التعليقات
```pazzle
# تعليق سطر واحد

---
تعليق متعدد الأسطر
كل ما بين الـ --- يُتجاهل
---
```
📦 المتغيرات والثوابت
الإعلان
```pazzle
make name = "Ahmed"     # متغير (let)
make age  = 25
make arr  = [1, 2, 3]

stop PI = 3.14          # ثابت (const)
```
قراءة عنصر من DOM
```pazzle
make title = get myTitle   # → document.getElementById("myTitle")
```
🖨️ الطباعة
الصيغة العامة:

```pazzle
local.txtar(<نوع>(<قيمة>))
النوع	الوظيفة
print(x)	طباعة + سطر جديد
link(x)	طباعة بدون سطر جديد
reprint(x)	إرجاع المؤشر لبداية السطر ثم طباعة
Up(n)	تحريك المؤشر لأعلى n سطر
printUp(n,x)	تحريك لأعلى ثم طباعة
down(n)	تحريك لأسفل
printDown(n,x)تحريك لأسفل ثم طباعة
``` 
أمثلة:

```pazzle
local.txtar(print("Hello, World"))
local.txtar(link("Loading..."))
local.txtar(reprint("50%"))
local.txtar(Up(2))
local.txtar(printUp(1, "Done"))
local.txtar(print("Value: " + x))
```
🔀 الشروط
```pazzle
if(age greater than 18){
  local.txtar(print("Adult"))
}else if(age equals 18){
  local.txtar(print("Exactly 18"))
}else{
  local.txtar(print("Minor"))
}
```
الكلمات المفتاحية:

بازل	JavaScript
equals	===
not equals	!==
greater than	>
less than	<
المعاملات العادية (==, !=, >, <, &&, ||) مدعومة أيضًا.

🔁 الحلقات
For loop
```pazzle
for i from 1 to 10 {
  local.txtar(print(i))
}

for i from 0 to 100 step 5 {
  local.txtar(print(i))
}
While loop
pazzle
make x = 0
while(x less than 5){
  local.txtar(print(x))
  x: add(1)
}
Interval loop (كل N ثانية)
pazzle
loop_to.end.time({1}[{
  local.txtar(print("every second"))
}]
```
القيمة بين {} = عدد الثواني (يقبل الكسور)

التحكم
```pazzle
for i from 0 to 10 {
  if(i equals 5){ break }
  if(i equals 3){ continue }
  local.txtar(print(i))
}
```
🔧 الدوال
التعريف
```pazzle
catch greet(name) {
  local.txtar(print("Hello " + name))
}

catch add(a, b) {
  return a + b
}
الاستدعاء
pazzle
call greet("Ahmed")
call add(3, 5)
ما يمكن استخدامه داخل الدوال
pazzle
catch demo(a, b) {
  make x = 10
  stop Y = 20

  runJS: console.log("raw js")

  if(x greater than 5){ ... }
  for i from 0 to 3 { ... }
  while(x less than 20){ ... }

  call helper(x)

  write("out.txt", "data")

  x: add(1)
  math.floor(3.7) >> n

  return x
}
```
📚 المصفوفات
التعريف
```pazzle
make nums  = [1, 2, 3]
make empty = []
make grid  = [[1,2], [3,4]]
```
العمليات
الصيغة: <array>: <op>(args)

العملية	التأثير
push(x)	إضافة عنصر
pop() >> v	إزالة وحفظ آخر عنصر
shift() >> v	إزالة وحفظ أول عنصر
unshift(x)	إضافة في البداية
reverse()	عكس
sort()	ترتيب
clear()	تفريغ
remove(i)	إزالة عنصر بفهرس
get(i) >> v	قراءة عنصر
set(i, x)	تعديل عنصر
slice(a, b) >> v	تقطيع
includes(x) >> b	بحث
indexOf(x) >> i	فهرس
join(sep) >> s	دمج
length >> n	الطول
أمثلة:

```pazzle
make nums = [1, 2, 3]

nums: push(4)
nums: get(0) >> first
nums: set(0, 100)
nums: length >> len
nums: pop() >> last
nums: reverse()
nums: sort()
nums: join(",") >> str
nums: clear()
```
دوال إضافية:

```pazzle
arr.new(rows, cols, value) >> grid
arr.fill(nums, 0)
arr.every(nums) >> allFalsy
```
✏️ محرر المتغيرات
الصيغة: <var>: <op>(<value>)

عمليات حسابية
```pazzle
age: add(1)
age: subtract(2)
age: multiply(3)
age: divide(2)
age: mod(5)
age: power(2)
age: set(100)
age: increment
age: decrement
```
عمليات منطقية
```pazzle
flag: toggle
```
عمليات حدّية
```pazzle
x: IfEmpty(0)
x: SetMax(100)
x: SetMin(0)
```
نقل بين متغيرين
```pazzle
a: take(b, 5)      # a += 5 ; b -= 5
```
عمليات DOM
```pazzle
el: To(value)
el: From(value)
el: ToHTML(value)
el: FromHTML(value)
el: ToValue(value)
el: FromValue(value)
```
عمليات متعددة في وقت واحد
```pazzle
a, b, c: add(1)
```
إضافة عملية مخصصة
```pazzle
Add Variable property (double, var *= 2;)
```
# بعدها:
```x: double(0)```
🧮 الدوال المدمجة
Math
```pazzle
math.floor(3.7)   >> n
math.ceil(3.1)    >> n
math.round(3.5)   >> n
math.min(4, 9)    >> n
math.max(4, 9)    >> n
math.abs(-5)      >> n
math.random()     >> n
math.sqrt(16)     >> n
String
pazzle
str.length("hello")     >> n     # 5
str.pad("5", 3, "0")    >> n     # "005"
str.repeat("ab", 3)     >> n     # "ababab"
```
🔍 التعبيرات النمطية Regex
الصيغة
```pazzle
<text> = RE(<pattern>) to(<var1>, <var2>, ...) {
  # كود يُنفَّذ عند النجاح
}
```
مثال
```pazzle
make text = "Ahmed_25"

text = RE((word)(_)(num)) to(name, space, number) {
  local.txtar(print("Name: " + name))
  local.txtar(print("Age: " + number))
}
```
رموز النمط
الرمز	المعنى
(num)	أرقام \d+
(word)	كلمات \w+
(any)	أي شيء .+
(letter)	حرف [a-zA-Z]
(digit)	رقم واحد \d
(numCL) / (wordCL) / (anyCL)	نسخ كسولة
(_)	مسافات اختيارية \s*
(dot)	نقطة \.
(|)	أنبوب |
b( / b)	أقواس حرفية
🎯 Match
بديل switch:

```pazzle
match name {
  "Ahmed" {
    local.txtar(print("Hi Ahmed"))
  }
  "Sara" {
    local.txtar(print("Hi Sara"))
  }
  _ {
    local.txtar(print("Unknown"))
  }
}
```
_ = الحالة الافتراضية. break يُضاف تلقائيًا.

🏗️ الأنواع Classes
تعريف بسيط
```pazzle
type Person {
  name = ""
  age = 0

  greet(msg) {
    local.txtar(print(msg))
  }
}

make p = new Person("Ali", 30)
p: greet("Hello")
الوراثة
pazzle
type Employee from Person {
  parent(name, age)
  salary = 0

  work() {
    local.txtar(print("working"))
  }
}

make e = new Employee("Sara", 28)
e: work
```
parent(args) = استدعاء super(...)

الخصائص تصبح this.* تلقائيًا

دوال العضو يمكنها الوصول للخصائص مباشرة

🖥️ Terminal
أوامر عامة
```pazzle
term.cls                 # مسح الشاشة
term.home                # العودة لأعلى
term.hide.cursor
term.show.cursor
term.reset
term.exit

term.move(col, row, text)
term.write("no newline")
term.writeln("with newline")

term.setup.keys          # تفعيل لوحة المفاتيح
⌨️ لوحة المفاتيح
pazzle
term.setup.keys

onKey(space) {
  local.txtar(print("Space pressed"))
}

onKey(up) {
  local.txtar(print("Up arrow"))
}

onKey(a) {
  local.txtar(print("A pressed"))
}
```
أسماء المفاتيح: حروف (a..z)، أرقام، up, down, left, right, space, enter, escape, tab, backspace, delete.

📁 الملفات
التفعيل
```pazzle
fs
الكتابة
pazzle
write("data.txt", "Hello World")
write("log.txt", msg)
القراءة
pazzle
read("data.txt")
# النتيجة في: data_txt_inner
local.txtar(print(data_txt_inner))
```
قاعدة التسمية: اسم الملف مع تحويل . إلى _ + _inner.

مثال: read("config.json") → config_json_inner.

⌨️ المدخلات
الأنواع
الصيغة	النتيجة
```async x = Input(1)	الوسيط الأول (string)
async all = Inputs	كل الوسائط مدموجة
async x = Input By non-string(1)	الوسيط الأول كقيمة خام
async x = Input By all(1)	{ no, string }
async x = get json (key)	من <filename>.json
```
مثال
```bash
pazzle app.pazzle Ahmed 25
pazzle
async name = Input(1)               # "Ahmed"
async age  = Input By non-string(2) # 25
```
✨ النمط المبسط — New LANG simple
نمط يشبه اللغات الطبيعية للمبتدئين:

```pazzle
New LANG simple {
  "Hello World"
  name share in show Input(What's your name?)
  print("Hi " + name)
  red(Error!)
  green(Success!)
}
```
القواعد
السطر	المعنى
"text" أو 'text'	طباعة
var share in show Input(prompt)	قراءة إدخال
var share in show <expr>	تخزين
name = value	إسناد
red(text), green(text), yellow(text)	طباعة ملوّنة
blue(text), purple(text), cyan(text)	طباعة ملوّنة
📎 include
يتطلب "version": 16 أو أعلى.

```pazzle
include helpers
```
يبحث عن helpers.pazzle في نفس المجلد ويستبدل السطر بمحتواه.

🛠️ أوامر متفرقة
run — عدة أوامر بسطر واحد
pazzle
run local.txtar(print("a")); local.txtar(print("b"))
link — ربط ملف HTML
pazzle
link index my_page.html
sc — دالة goTo
pazzle
sc
# يُنشئ: function goTo(to){ window.location.href = to; }
local.Make — إنشاء عنصر DOM
pazzle
local.Make = local.web || front-end || . || loop_to.find(element("myDiv")&hasType("div")).make_it on Equal("container")
app:rerun* — تشغيل سكربت خارجي
pazzle
app:rerun*(script.py)
runJS: — JavaScript خام
pazzle
runJS: console.log("raw js here")
auto:start*() / auto:end*()
يولّد متغير auto بقيمة عشوائية متغيرة كل 10ms.

🎨 أمثلة كاملة
مثال 1: Hello World
```pazzle
local.txtar(print("Hello, World!"))
```
مثال 2: حاسبة بسيطة
```pazzle
make a = 10
make b = 5

a: add(b)
local.txtar(print("Sum: " + a))

a: multiply(2)
local.txtar(print("Double: " + a))
مثال 3: برنامج ترحيب تفاعلي
pazzle
# set.json: { "version": 16 }

async name = Input(1)

catch greet(n) {
  local.txtar(print("👋 Hello, " + n))
}

call greet(name)

for i from 1 to 3 {
  local.txtar(print("Count: " + i))
}
```
مثال 4: كلاس ومصفوفة
```pazzle
type Student {
  name = ""
  grades = []

  addGrade(g) {
    grades: push(g)
  }

  average() {
    make sum = 0
    for i from 0 to grades:length {
      sum: add(grades:get(i))
    }
    return sum / grades:length
  }
}

make s = new Student("Ahmed")
s: addGrade(90)
s: addGrade(85)
s: addGrade(95)

local.txtar(print("Average: " + s:average()))
مثال 5: Terminal + لوحة مفاتيح
pazzle
term.cls
term.hide.cursor
term.setup.keys

make count = 0

loop_to.end.time({0.1}[{
  if(global.__pazzle_keys.space){
    count: add(1)
    term.move(1, 1, "Count: " + count)
  }
}]
```
🏷️ الإصدارات
الميزة	v15	v16
الميزات الأساسية	✅	✅
include	❌	✅
تحديد الإصدار:

الافتراضي: 15.7

من set.json: { "version": 16 }

من CLI: pazzle -comma change -v 16

🤝 المساهمة
المساهمات مرحّب بها! للأخطاء والاقتراحات، افتح Issue أو أرسل Pull Request.

قبل الإرسال، تأكد من:

✅ اختبار الكود على ملفات .pazzle حقيقية

✅ إضافة أمثلة على الميزات الجديدة

✅ عدم كسر التوافق مع الإصدارات السابقة

المشروع مفتوح المصدر كاملاً!
<div align="center">
صُنعت بـ ❤️ باستخدام Node.js

⭐ إذا أعجبتك Pazzle، لا تنسَ النجمة على GitHub!

</div> 
