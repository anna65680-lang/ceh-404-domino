/* Автономные логические smoke-тесты для Node.js. Для самой игры Node.js НЕ нужен.
   Запуск: node tests/smoke.test.js из корня проекта.
   Проверки с моделью DOM не заменяют реального браузерного тестирования. */
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const source=name=>fs.readFileSync(path.join(root,name),"utf8");
const files=["data.js","scenario.js","logic.js","app.js"];
const checks=[];
function test(name,fn) {
  try {fn();checks.push({name,passed:true});console.log("✓ "+name);}
  catch(error) {checks.push({name,passed:false});console.error("✗ "+name+" — "+error.message);}
}
const win={alert(){},confirm(){return true;},scrollTo(){}};
const app={innerHTML:"",listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},contains(){return true;}};
const store=new Map();
const localStorage={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,String(val)),removeItem:key=>store.delete(key)};
const doc={title:"",getElementById(id) {
  if(id==="app")return app;
  if(id==="playerName")return {value:"Ваня"};
  if(id==="riskConsent")return {checked:true};
  return null;
}};
const ctx=vm.createContext({window:win,document:doc,localStorage,console});
for(const name of files)vm.runInContext(source(name),ctx,{filename:name});
const click=(action,id)=>app.listeners.click({target:{closest:()=>({dataset:{action,id}})}});
const state=()=>win.__CEH404_TEST__.getState();
test("Вход S00",()=>assert.equal(state().scene,"S00"));
click("pass");
test("Пропуск сохраняет имя",()=>assert.equal(state().playerName,"Ваня"));
click("next","S01");
test("Точный текст поручения S01",()=>assert.match(app.innerHTML,/предложений больше, чем денег/));
for(const id of ["offers","start","problems"])click("ask01",id);
test("Три вопроса S01 в произвольном порядке",()=>assert.equal(state().askedS01.length,3));
click("next","S02");
test("Девять исходных показателей",()=>assert.equal((app.innerHTML.match(/class="report-item"/g)||[]).length,9));
for(const id of ["machine","insufficient","quality"])click("hypothesis",id);
test("Сохраняется выбранная гипотеза S02",()=>assert.equal(state().initialHypothesis,"quality"));
click("next","S03");
for(const id of ["marina","irina","andrey"])click("ask03",id);
test("Три профессиональные позиции и вопросы S03",()=>{
  assert.equal(state().askedS03.length,3);
  assert.equal((app.innerHTML.match(/class="speaker"/g)||[]).length,3);
});
click("next","S04");
test("Тринадцать инвестиционных карточек",()=>assert.equal((app.innerHTML.match(/class="investment /g)||[]).length,13));
for(const id of ["A","F"])click("toggle",id);
test("A+F=80",()=>assert.equal(win.CEH_LOGIC.budget(state().selectedInvestments).spent,80));
click("toggle","D");
test("A+F+D=100",()=>assert.equal(win.CEH_LOGIC.budget(state().selectedInvestments).remaining,0));
click("toggle","C");
test("A+F+D+C=115 и превышение",()=>assert.equal(win.CEH_LOGIC.budget(state().selectedInvestments).overBudget,true));
click("goal","capacity");
click("evaluate");
test("Превышение бюджета сообщается игроку",()=>assert.match(app.innerHTML,/Бюджет превышен/));
click("submitPortfolio");
test("Превышение блокирует S05",()=>assert.equal(state().scene,"S04"));
click("toggle","C");
click("evaluate");
test("Есть объяснение по обоснованию и условиям",()=>assert.match(app.innerHTML,/Предварительная экспертиза портфеля/));
click("submitPortfolio");
test("Портфель с подтверждением проходит на S05",()=>assert.equal(state().scene,"S05"));
click("committee","conditions");
click("next","S06");
test("Появилась ситуация очереди",()=>assert.match(app.innerHTML,/очередь деталей/));
for(const id of ["route","changeover","downtime"])click("investigate",id);
test("Все три источника S06 изучены",()=>assert.equal(state().investigatedTopics.length,3));
click("next","S07");
click("second","largebatch");
test("S07 показывает компромисс укрупнения партий",()=>assert.match(app.innerHTML,/незавершённое производство/));
click("next","S08");
test("Итоги главы с собственными решениями",()=>{
  assert.equal(state().scene,"S08");
  assert.match(app.innerHTML,/Профессиональный вывод/);
  assert.match(app.innerHTML,/Ваня/);
});
click("goBack","S04");
test("Возврат к S04",()=>assert.equal(state().scene,"S04"));
click("reset");
test("Новая игра очищает выборы",()=>assert.equal(state().selectedInvestments.length,0));
test("Сохранение доступно",()=>assert.ok(store.has("ceh404.chapter1.v2")));
test("L и M дают 0 капитальных затрат, но имеют риски",()=>{
  const b=win.CEH_LOGIC.budget(["L","M"]);
  assert.equal(b.spent,0);
  assert.match(win.CEH_INVESTMENTS.initiatives.find(x=>x.id==="M").risks,/оплат/i);
});
test("Противоречие F+L распознаётся",()=>{
  const s=win.CEH_LOGIC.initialState();
  s.selectedInvestments=["F","L"];s.rationale="losses";
  assert.ok(win.CEH_LOGIC.reviewPortfolio(s).notes.some(x=>x.includes("SMED")));
});
test("Новые сцены явно помечены как предложения",()=>{
  assert.match(win.CEH_SCENARIO.status.S05,/НЕ УТВЕРЖДЕНО/);
  assert.match(win.CEH_SCENARIO.status.S08,/НЕ УТВЕРЖДЕНО/);
});
test("Утверждённые изображения в реестре существуют в каталоге assets",()=>{
  const registry=JSON.parse(source("assets/manifest.json"));
  for(const [id,item] of Object.entries(registry.assets)){
    if(item.status!=="approved")continue;
    assert.match(item.path,/^assets\/(backgrounds|characters|icons)\//,id);
    assert.ok(fs.existsSync(path.join(root,item.path)),id+" → "+item.path);
  }
});
click("pass");
click("next","S01");
test("Портрет Ирины виден по реальному пути даже без загрузки JSON",()=>{
  assert.match(app.innerHTML,/CH1-IMG-013_irina_neutral\.png/);
});
test("Фоны S00 и S01 имеют реальные пути в CSS",()=>{
  const css=source("style.css");
  assert.match(css,/CH1-IMG-002_entrance\.png/);
  assert.match(css,/CH1-IMG-005_technology_office\.webp/);
});
test("S01 показывает отдельную видимую иллюстрацию из assets",()=>{
  assert.match(app.innerHTML,/class="scene-illustration"/);
  assert.match(app.innerHTML,/src="assets\/backgrounds\/CH1-IMG-005_technology_office\.webp"/);
});
click("reset");
test("S00 показывает изображение входной зоны, не только CSS-фон",()=>{
  assert.match(app.innerHTML,/class="scene-illustration"/);
  assert.match(app.innerHTML,/src="assets\/backgrounds\/CH1-IMG-002_entrance\.png"/);
});
const passed=checks.filter(x=>x.passed).length;
console.log("\n"+passed+"/"+checks.length+" проверок пройдено");
if(passed!==checks.length)process.exitCode=1;
