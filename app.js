/* Отображение сцен. Текст и правила находятся отдельно: scenario.js / data.js / logic.js. */
(function () {
  "use strict";
  const script=window.CEH_SCENARIO;
  const data=window.CEH_INVESTMENTS;
  const logic=window.CEH_LOGIC;
  const app=document.getElementById("app");
  if(!script||!data||!logic||!app) throw new Error("Не загружены игровые данные.");
  const storageKey="ceh404.chapter1.v2";
  let game=load();
  const view={reviewShown:false,openedItem:null};

  function load() {
    try {const raw=localStorage.getItem(storageKey);return raw?logic.validateState(JSON.parse(raw)):logic.initialState();}
    catch (_) {return logic.initialState();}
  }
  function save() {try {localStorage.setItem(storageKey,JSON.stringify(game));} catch (_) {}}
  function esc(value) {return String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function p(value,cls="") {return '<p'+(cls?' class="'+cls+'"':'')+'>'+esc(value)+'</p>';}
  function button(label,action,id,cls="") {
    return '<button type="button" class="btn '+esc(cls)+'" data-action="'+esc(action)+'"'+
      (id===undefined?'':' data-id="'+esc(id)+'"')+'>'+esc(label)+'</button>';
  }
  function note(html,type="") {return '<div class="notice '+esc(type)+'">'+html+'</div>';}
  /* Единый выбор ассета. Пока реестр загружается или файла нет,
     игровая логика и интерфейс продолжают работать со старой графикой. */
  let assetRegistry=null;
  /* Утверждённые файлы, фактически существующие в main.
     Показываются и при недоступном manifest.json. */
  const bundledAssets={
    bg_entrance:"assets/backgrounds/CH1-IMG-002_entrance.png",
    bg_technologist_office:"assets/backgrounds/CH1-IMG-005_technology_office.webp",
    bg_main_screen:"assets/backgrounds/CH1-IMG-001_main_screen.webp",
    irina_neutral:"assets/characters/CH1-IMG-013_irina_neutral.png",
    irina_friendly:"assets/characters/CH1-IMG-015_irina_friendly.png",
    irina_focused:"assets/characters/CH1-IMG-016_irina_focused.png",
    andrey_neutral:"assets/characters/CH1-IMG-012_andrey_neutral.png",
    marina_neutral:"assets/characters/CH1-IMG-011_marina_neutral.png"
  };
  const sceneBackgroundIds={
    S00:"bg_entrance",
    S01:"bg_technologist_office",S02:"bg_technologist_office",
    S03:"bg_meeting_room",S05:"bg_meeting_room",
    S04:"bg_workshop",S06:"bg_workshop",S07:"bg_workshop"
  };
  function assetPath(id,fallback) {
    const item=assetRegistry&&assetRegistry.assets&&assetRegistry.assets[id];
    const path=item&&typeof item.path==="string"?item.path:"";
    return /^assets\/(characters|backgrounds|icons)\/[A-Za-z0-9_./-]+$/.test(path)&&!path.includes("..")
      ?path:(bundledAssets[id]||fallback);
  }
  function applySceneBackground() {
    if(typeof Image!=="function")return;
    const scene=app.querySelector&&app.querySelector(".scene[data-scene]");
    if(!scene)return;
    const id=sceneBackgroundIds[game.scene];
    if(!id)return;
    const fallback="assets/backgrounds/"+id+".webp";
    const chosen=assetPath(id,fallback);
    if(chosen===fallback)return;
    const picture=new Image();
    picture.onload=()=>{
      if(!scene.isConnected)return;
      scene.style.setProperty("--registry-scene-image",'url("'+chosen+'")');
    };
    picture.onerror=()=>{};
    picture.src=chosen;
  }
  function avatar(characterKey) {
    const c=script.characters[characterKey];
    if(!c)return '';
    const fallback="assets/characters/"+c.portrait;
    const id=characterKey+"_"+(c.emotion||"neutral");
    const image=assetPath(id,fallback);
    return '<div class="character"><div class="character-art"><img alt="" loading="lazy" src="'+esc(image)+
      '" onerror="this.hidden=true"></div><div><strong>'+esc(c.name)+'</strong><small>'+esc(c.role)+'</small></div></div>';
  }
  function speech(key,text) {return '<div class="speech">'+avatar(key)+'<div class="speech-text">'+p(text)+'</div></div>';}
  function row(label,value) {return '<div class="metric"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';}
  function progress() {
    const current=Number(game.scene.slice(1));
    return '<nav class="progress" aria-label="Прогресс главы">'+
      Array.from({length:9},(_,i)=>'<span class="'+(i===current?'active':i<current?'passed':'')+
      '" title="Сцена S0'+i+'">S0'+i+'</span>').join('')+'</nav>';
  }
  /* Видимая иллюстрация — обычный <img>, а не почти незаметная CSS-подложка.
     Показываем только реально добавленные в проект файлы. */
  function sceneIllustration(id) {
    const assetId=sceneBackgroundIds[id];
    if(!assetId||!bundledAssets[assetId])return "";
    const image=assetPath(assetId,bundledAssets[assetId]);
    const labels={
      S00:"Входная зона предприятия",
      S01:"Технологический отдел",S02:"Технологический отдел"
    };
    return '<figure class="scene-illustration">'+
      '<img src="'+esc(image)+'" alt="'+esc(labels[id]||"Иллюстрация сцены")+
      '" loading="eager" decoding="async" onerror="this.parentElement.classList.add(\'image-missing\')">'+
      '<figcaption>Изображение сцены не загрузилось: '+esc(image)+'</figcaption></figure>';
  }
  function sceneShell(id,inner) {
    return '<div class="scene-head"><div class="scene-meta"><span>ГЛАВА 1 · '+esc(id)+
      '</span><span class="status '+(Number(id.slice(1))>=5?'draft':'')+'">'+esc(script.status[id]||"")+
      '</span></div><h1>'+esc(script[id].heading)+'</h1>'+
      '<p class="location">'+esc(script[id].location||script.S00.label)+'</p></div>'+
      '<section class="panel scene" data-scene="'+esc(id)+'">'+sceneIllustration(id)+inner+'</section>';
  }
  function actions(label,id="") {
    return '<div class="actions">'+button(label,"next",id,"primary")+
      button("Начать заново","reset",undefined,"muted")+'</div>';
  }
  function renderS00() {
    let html='<div class="intro-grid"><div><div class="eyebrow">ДОПУСК НА ПРЕДПРИЯТИЕ</div>'+
      '<h2>Ваше первое рабочее задание</h2>'+p(script.S00.caption);
    if(!game.passIssued) {
      html+='<label class="input-label" for="playerName">Имя для пропуска</label>'+
        '<input id="playerName" name="playerName" maxlength="40" autocomplete="given-name" placeholder="Введите имя">'+
        '<div class="actions">'+button("Получить пропуск","pass",undefined,"primary")+'</div>';
    } else {
      html+=note('<div class="badge-label">ПРОПУСК · ЦЕХ 404</div>'+
        '<strong class="badge-name">'+esc(game.playerName)+'</strong><br>Техник-технолог · вводное задание');
      html+=actions("Приступить к работе","S01");
    }
    return html+'</div><div class="pass-illustration" aria-hidden="true">404<span>ПРОИЗВОДСТВО · РЕШЕНИЯ · ПОСЛЕДСТВИЯ</span></div></div>';
  }
  function renderS01() {
    const s=script.S01;
    let html=speech("irina",s.intro.replace("[Имя]",game.playerName));
    html+='<h2>О чём вы хотите спросить?</h2>'+p("Все три вопроса можно задать в любом порядке.","hint");
    html+='<div class="choice-list">';
    s.questions.forEach((q,i)=>{
      const done=game.askedS01.includes(q.id);
      html+=button((done?"✓ ":"")+(i+1)+". "+q.label,"ask01",q.id,"option"+(done?" done":""));
    });
    html+='</div>';
    if(game.askedS01.length) {
      html+='<div class="conversation"><h3>Разговор с Ириной</h3>';
      game.askedS01.forEach(id=>{
        const q=s.questions.find(x=>x.id===id);
        if(q)html+='<div class="dialogue-line"><b>Вы:</b> '+esc(q.label)+'</div>'+
          '<div class="dialogue-line response"><b>Ирина:</b> '+esc(q.answer)+'</div>';
      });
      html+='</div>';
    }
    html+='<div class="actions">'+button("Изучить производственные данные","next","S02","primary")+'</div>';
    return html;
  }
  function renderS02() {
    const s=script.S02;
    let html=note("Учебный отчёт. Цифры условные; методика части показателей требует проверки.","soft");
    html+='<div class="report-grid">'+s.data.map(x=>
      '<article class="report-item"><span>'+esc(x.label)+'</span><strong>'+esc(x.value)+'</strong>'+
      '<small>'+esc(x.note)+'</small></article>').join('')+'</div>';
    html+=speech("irina",s.intro)+'<h2>Первоначальный вывод</h2>';
    html+='<div class="choice-list">'+s.hypotheses.map((h,i)=>
      button((i+1)+". "+h.label,"hypothesis",h.id,
        "option"+(game.initialHypothesis===h.id?" selected":""))).join('')+'</div>';
    if(game.initialHypothesis) {
      const selected=s.hypotheses.find(h=>h.id===game.initialHypothesis);
      html+=note('<strong>Ирина:</strong> '+esc(selected.reply),"feedback");
      html+='<div class="actions">'+button("Продолжить к профессиональным позициям","next","S03","primary")+'</div>';
    }
    return html;
  }
  function renderS03() {
    const s=script.S03;
    let html=p(s.intro);
    html+='<div class="speaker-grid">';
    s.people.forEach(person=>{
      html+='<section class="speaker">'+avatar(person.id)+p(person.speech)+
      button((game.askedS03.includes(person.id)?"✓ ":"")+person.question,"ask03",person.id,
      "option"+(game.askedS03.includes(person.id)?" done":""))+'</section>';
    });
    html+='</div>';
    if(game.askedS03.length) {
      html+='<div class="conversation"><h3>Дополнительные вопросы</h3>';
      game.askedS03.forEach(id=>{
        const x=s.people.find(y=>y.id===id);
        if(x)html+='<div class="dialogue-line"><b>Вы:</b> '+esc(x.question)+'</div>'+
          '<div class="dialogue-line response"><b>'+esc(script.characters[id].name)+':</b> '+esc(x.reply)+
          (x.draftReply?'<small>Поясняющий ответ — проектная формулировка</small>':'')+'</div>';
      });
      html+='</div>';
    }
    html+='<div class="actions">'+button("Перейти к инвестициям","next","S04","primary")+'</div>';
    return html;
  }
  function initiativeCard(item) {
    const selected=game.selectedInvestments.includes(item.id);
    const opened=view.openedItem===item.id;
    return '<article class="investment '+(selected?'picked':'')+'">'+
      '<div class="investment-head"><span class="code">'+esc(item.id)+'</span><span class="price">'+item.cost+
      ' <small>млн</small></span></div><h3>'+esc(item.title)+'</h3><p class="focus">'+esc(item.focus)+'</p>'+
      '<p class="short-desc">'+esc(item.secondary)+'</p>'+
      '<div class="investment-buttons">'+button(selected?"✓ В портфеле · убрать":"Добавить в портфель","toggle",item.id,
        selected?"remove":"primary")+
      button(opened?"Скрыть детали":"Условия и риски","details",item.id,"ghost")+'</div>'+
      (opened?'<div class="investment-detail"><b>Условия полезности:</b>'+p(item.conditions)+
        '<b>Риски:</b>'+p(item.risks)+'<b>Не гарантирует:</b>'+p(item.noGuarantee)+
        '<b>Горизонт эффекта:</b>'+p(item.horizon)+'<b>Эксплуатационные расходы:</b>'+p(item.ongoing)+
        '<small>Основание: '+esc(item.evidence)+'</small></div>':'')+
      '</article>';
  }
  function reviewHTML() {
    const result=logic.reviewPortfolio(game);
    let html='<div class="review"><h3>Предварительная экспертиза портфеля</h3>'+
      p("Это качественная проверка аргументации, а не готовый экономический расчёт.","hint")+
      '<div class="review-columns"><div><h4>Что говорит сопоставление с целью</h4><ul>'+
      result.messages.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></div>'+
      '<div><h4>Условия, противоречия и риски</h4><ul>'+
      (result.notes.length?result.notes.map(t=>'<li>'+esc(t)+'</li>').join(''):'<li>Специальные конфликты в выбранном портфеле не выделены; это не гарантия отсутствия рисков.</li>')+
      '</ul></div></div>';
    if(result.valid) {
      html+=note('Вы можете изменить портфель или продолжить, понимая, что часть связей остаётся условной.','soft')+
        '<label class="checkline"><input type="checkbox" id="riskConsent" '+(game.reviewAccepted?'checked':'')+
        '> Я ознакомился(-ась) с условиями и рисками и могу обосновать свой выбор</label>'+
        '<div class="actions">'+button("Подготовить предложение для инвесткомитета","submitPortfolio",undefined,
        "primary")+'</div>';
    } else {
      html+=note('Переход закрыт до выбора портфеля, основной цели и соблюдения бюджета.','warning');
    }
    return html+'</div>';
  }
  function renderS04() {
    const s=script.S04, b=logic.budget(game.selectedInvestments);
    let html=p(s.intro)+note('Суммы условные. Для L и M нулевая стоимость в бюджете НЕ означает отсутствия дополнительных затрат.','soft');
    html+='<div class="budget-strip" aria-label="Инвестиционный бюджет">'+row("Бюджет",data.budget+" млн")+
      row("Выбрано",b.spent+" млн")+row("Осталось",b.remaining+" млн")+
      row("Инициатив в портфеле",String(b.selectedCount))+'</div>';
    if(b.overBudget) html+=note('Бюджет превышен на '+Math.abs(b.remaining)+
      ' млн условных единиц. Вы можете изменить выбор, но не подтвердить его.','warning');
    html+='<h2>Доступные инициативы A–M</h2><div class="investment-grid">'+
      data.initiatives.map(initiativeCard).join('')+'</div>';
    html+='<h2>Как вы обосновываете программу?</h2>'+
      '<div class="choice-list rationale">'+s.goals.map((g,i)=>
      '<div class="goal-option">'+button((game.rationale===g.id?"✓ ":"")+(i+1)+". "+g.label,"goal",g.id,
        "option"+(game.rationale===g.id?" selected":""))+'<small>'+esc(g.brief)+'</small></div>').join('')+'</div>';
    html+='<div class="actions">'+button("Проверить аргументацию","evaluate",undefined,"primary")+'</div>';
    if(view.reviewShown)html+=reviewHTML();
    return html;
  }
  function renderS05() {
    const s=script.S05, result=logic.reviewPortfolio(game);
    let html=note("Сцены S05–S08 — авторский проектный вариант для демонстрации. События и последствия ещё не утверждены командой.","warning");
    html+=p(s.intro)+'<div class="summary-box"><h3>Предложение для комитета</h3>'+
      row("Выбрано",result.selected.join(", "))+row("Расходы",result.budget.spent+" / "+data.budget+" млн")+
      row("Цель",result.goal)+'</div>';
    logic.committeeComments(game).forEach(({speaker,text})=>{
      const c=Object.keys(script.characters).find(k=>script.characters[k].name===speaker);
      html+=speech(c,text);
    });
    html+='<h2>'+esc(s.question)+'</h2><div class="choice-list">'+s.options.map(x=>
      button((game.committeeDecision===x.id?"✓ ":"")+x.label,"committee",x.id,
        "option"+(game.committeeDecision===x.id?" selected":""))).join('')+'</div>';
    if(game.committeeDecision) {
      const responses={
        conditions:"Комитет получает честное описание допущений и перечня данных, которые предстоит проверить.",
        confidence:"Марина возражает: обещать гарантированный эффект без подтверждения условий нельзя.",
        stage:"Комитет обсуждает поэтапное внедрение с контрольными наблюдениями."
      };
      html+=note(esc(responses[game.committeeDecision]),"feedback");
      html+='<div class="actions">'+button("Перейти к производственной ситуации","next","S06","primary")+'</div>';
    }
    return html;
  }
  function renderS06() {
    const s=script.S06;
    let html=note("ПРОИЗВОДСТВЕННАЯ СИТУАЦИЯ · причина очереди не установлена заранее","soft")+p(s.intro);
    html+='<h2>Изучить доступные сведения</h2><div class="choice-list">'+s.documents.map(x=>
      button((game.investigatedTopics.includes(x.id)?"✓ ":"")+x.title,"investigate",x.id,
        "option"+(game.investigatedTopics.includes(x.id)?" done":""))).join('')+'</div>';
    if(game.investigatedTopics.length) {
      html+='<div class="conversation">';
      game.investigatedTopics.forEach(id=>{
        const x=s.documents.find(d=>d.id===id);
        html+='<h3>'+esc(x.title)+'</h3>'+p(x.body)+note(esc(x.meaning),"soft");
      });
      html+='</div>';
    }
    html+='<h2>Как мог повлиять ваш портфель?</h2><ul>'+
      logic.productionNotes(game).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
    if(game.investigatedTopics.length)html+='<div class="actions">'+button("Принять второе решение","next","S07","primary")+'</div>';
    else html+=note('Для продолжения изучите хотя бы одну справку. Остальные доступны в любом порядке.','soft');
    return html;
  }
  function renderS07() {
    const s=script.S07;
    let html=p(s.intro)+note('Ни один вариант не гарантирует результата. Учитываются условия его применения и последствия.','soft');
    html+='<div class="decision-grid">'+s.options.map((x,i)=>
      '<div class="decision"><h3>Вариант '+(i+1)+'</h3>'+p(x.label)+
        '<p class="hint">'+esc(x.rationale)+'</p>'+
        button(game.secondDecision===x.id?"✓ Выбрано":"Выбрать решение","second",x.id,
          game.secondDecision===x.id?"selected":"primary")+'</div>').join('')+'</div>';
    if(game.secondDecision) {
      html+='<h2>Последствия и условия</h2><ul>'+
        logic.secondDecisionNotes(game).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
      html+='<div class="actions">'+button("Посмотреть итог главы","next","S08","primary")+'</div>';
    }
    return html;
  }
  function renderS08() {
    const s=script.S08;
    const result=logic.reviewPortfolio(game);
    const h=script.S02.hypotheses.find(x=>x.id===game.initialHypothesis);
    const option=script.S07.options.find(x=>x.id===game.secondDecision);
    let html=note('ПРОЕКТНЫЙ ИТОГ: результаты качественные, не подтверждённые производственные прогнозы.','warning')+
      p(s.intro);
    html+='<div class="summary-box"><h2>Ваш маршрут</h2>'+
      row("Техник-технолог",game.playerName)+
      row("Первоначальная гипотеза",h?h.label:"Не выбрана")+
      row("Инвестиционный портфель",result.selected.join(", "))+row("Инвестиции",result.budget.spent+" млн из 100")+
      row("Основная цель",result.goal)+row("Изучено справок",game.investigatedTopics.length+" из 3")+
      row("Второе решение",option?option.label:"Не принято")+'</div>';
    html+='<h2>Что ваш портфель потенциально меняет</h2><ul>'+
      logic.productionNotes(game).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
    html+='<h2>Последствия второго решения</h2><ul>'+
      logic.secondDecisionNotes(game).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
    html+='<h2>Профессиональный вывод</h2><ol>'+
      s.lessons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol>';
    html+=note('Пройдена демонстрационная версия первой главы. Для конкурсной приёмки требуются согласование S05–S08, проверка данных и полноценное браузерное тестирование.','soft');
    html+='<div class="actions">'+button("Вернуться к инвестициям","goBack","S04","ghost")+
      button("Пройти заново","reset",undefined,"primary")+'</div>';
    return html;
  }
  function render() {
    const map={S00:renderS00,S01:renderS01,S02:renderS02,S03:renderS03,S04:renderS04,
      S05:renderS05,S06:renderS06,S07:renderS07,S08:renderS08};
    const renderer=map[game.scene]||renderS00;
    document.title=script.title+" · "+game.scene;
    app.innerHTML='<div class="game-top">'+progress()+
      '<span class="save-label">Прогресс сохраняется в этом браузере</span></div>'+
      sceneShell(game.scene,renderer())+
      '<div class="bottom-line"><span>Решения → условия → последствия</span>'+
      '<span>План Б · '+esc(script.version)+'</span></div>';
    applySceneBackground();
    save();
  }
  function sceneAdvance(target) {
    const allowed={S00:["S01"],S01:["S02"],S02:["S03"],S03:["S04"],
      S04:["S05"],S05:["S06"],S06:["S07"],S07:["S08"]};
    if(!(allowed[game.scene]||[]).includes(target))return;
    if(game.scene==="S00"&&!game.passIssued)return;
    if(game.scene==="S02"&&!game.initialHypothesis)return;
    if(game.scene==="S04"&&(!logic.eligible(game)||!game.reviewAccepted))return;
    if(game.scene==="S05"&&!game.committeeDecision)return;
    if(game.scene==="S06"&&!game.investigatedTopics.length)return;
    if(game.scene==="S07"&&!game.secondDecision)return;
    game.scene=target;
    view.reviewShown=false;
    view.openedItem=null;
    render();
    if(typeof window.scrollTo==="function")window.scrollTo(0,0);
  }
  function updateChoice(action,id) {
    if(action==="pass"&&game.scene==="S00") {
      const el=document.getElementById("playerName");
      const name=logic.sanitizeName(el?el.value:"");
      if(!name){window.alert("Введите имя для пропуска.");return false;}
      game.playerName=name;game.passIssued=true;
    } else if(action==="ask01"&&game.scene==="S01") {
      if(!script.S01.questions.some(x=>x.id===id))return false;
      if(!game.askedS01.includes(id))game.askedS01.push(id);
    } else if(action==="hypothesis"&&game.scene==="S02") {
      if(!script.S02.hypotheses.some(x=>x.id===id))return false;
      game.initialHypothesis=id;
    } else if(action==="ask03"&&game.scene==="S03") {
      if(!script.S03.people.some(x=>x.id===id))return false;
      if(!game.askedS03.includes(id))game.askedS03.push(id);
    } else if(action==="toggle"&&game.scene==="S04") {
      if(!data.initiatives.some(x=>x.id===id))return false;
      game.selectedInvestments=game.selectedInvestments.includes(id)?
        game.selectedInvestments.filter(x=>x!==id):game.selectedInvestments.concat(id);
      game.reviewAccepted=false;view.reviewShown=false;
    } else if(action==="details"&&game.scene==="S04") {
      view.openedItem=view.openedItem===id?null:id;
    } else if(action==="goal"&&game.scene==="S04") {
      if(!script.S04.goals.some(x=>x.id===id))return false;
      game.rationale=id;game.reviewAccepted=false;view.reviewShown=false;
    } else if(action==="committee"&&game.scene==="S05") {
      if(!script.S05.options.some(x=>x.id===id))return false;
      game.committeeDecision=id;
    } else if(action==="investigate"&&game.scene==="S06") {
      if(!script.S06.documents.some(x=>x.id===id))return false;
      if(!game.investigatedTopics.includes(id))game.investigatedTopics.push(id);
    } else if(action==="second"&&game.scene==="S07") {
      if(!script.S07.options.some(x=>x.id===id))return false;
      game.secondDecision=id;
    } else return false;
    return true;
  }
  app.addEventListener("click",event=>{
    const target=event.target.closest("[data-action]");
    if(!target||!app.contains(target))return;
    const action=target.dataset.action, id=target.dataset.id;
    if(action==="next") {sceneAdvance(id);return;}
    if(action==="reset") {
      if(typeof window.confirm==="function"&&!window.confirm("Начать игру заново? Прежние решения будут сброшены."))return;
      game=logic.initialState();view.reviewShown=false;view.openedItem=null;render();return;
    }
    if(action==="goBack"&&game.scene==="S08"&&id==="S04") {
      game.scene="S04";game.reviewAccepted=false;view.reviewShown=false;render();return;
    }
    if(action==="evaluate"&&game.scene==="S04") {view.reviewShown=true;render();return;}
    if(action==="submitPortfolio"&&game.scene==="S04") {
      if(!logic.eligible(game)) {view.reviewShown=true;render();return;}
      const checkbox=document.getElementById("riskConsent");
      game.reviewAccepted=!!(checkbox&&checkbox.checked);
      if(!game.reviewAccepted){window.alert("Перед передачей комитету ознакомьтесь с условиями и рисками.");return;}
      sceneAdvance("S05");return;
    }
    if(updateChoice(action,id))render();
  });
  app.addEventListener("keydown",event=>{
    if(event.key==="Enter"&&event.target&&event.target.id==="playerName") {
      event.preventDefault();
      if(updateChoice("pass"))render();
    }
  });
  render();
  /* На https и localhost берём актуальный JSON из проекта.
     При открытии через file:// браузер может запретить fetch;
     тогда игра использует совместимые старые пути и остаётся игровой. */
  if(typeof fetch==="function") {
    fetch("assets/manifest.json").then(response=>{
      if(!response.ok)throw new Error("Реестр не найден");
      return response.json();
    }).then(registry=>{
      if(!registry||!registry.assets||typeof registry.assets!=="object")return;
      assetRegistry=registry;
      render();
    }).catch(()=>{});
  }
  /* Только для автоматических тестов, не является игровым API. */
  window.__CEH404_TEST__={getState:()=>JSON.parse(JSON.stringify(game)),getScene:()=>game.scene};
})();
