/* Чистая игровая логика. Никаких баллов навыков, XP или выдуманных процентов эффективности. */
(function () {
  "use strict";
  const DATA = window.CEH_INVESTMENTS;
  const SCRIPT = window.CEH_SCENARIO;
  if (!DATA || !SCRIPT) throw Error("Нет сценарных данных или матрицы.");

  const goalFields = {capacity:"goalA",losses:"goalB",quality:"goalC"};
  const goalNames = Object.fromEntries(SCRIPT.S04.goals.map(g=>[g.id,g.label]));
  const byId = Object.fromEntries(DATA.initiatives.map(item=>[item.id,item]));
  const unique = values => [...new Set(values.filter(id=>Object.prototype.hasOwnProperty.call(byId,id)))];

  function initialState() {
    return {
      version:2, scene:"S00", playerName:"", passIssued:false,
      askedS01:[], initialHypothesis:null, askedS03:[],
      selectedInvestments:[], rationale:null, reviewAccepted:false,
      committeeDecision:null, investigatedTopics:[], secondDecision:null
    };
  }
  function sanitizeName(value) {
    return String(value||"").replace(/[<>\u0000-\u001f]/g,"").replace(/\s+/g," ").trim().slice(0,40);
  }
  function budget(selected) {
    const ids=unique(selected||[]);
    const spent=ids.reduce((sum,id)=>sum+byId[id].cost,0);
    return {spent,remaining:DATA.budget-spent,overBudget:spent>DATA.budget,selectedCount:ids.length};
  }
  function eligible(state) {
    const b=budget(state.selectedInvestments);
    return b.selectedCount>0 && !b.overBudget && !!goalFields[state.rationale];
  }
  function reviewPortfolio(state) {
    const selected=unique(state.selectedInvestments||[]);
    const b=budget(selected);
    const field=goalFields[state.rationale];
    const direct=selected.filter(id=>field && /^Прямая/i.test(byId[id][field]));
    const supporting=selected.filter(id=>field && !direct.includes(id) &&
      !/(?:спорно|риск)/i.test(byId[id][field]));
    const debated=selected.filter(id=>field && /(?:спорно|риск)/i.test(byId[id][field]));
    const notes=[];
    const add=t=>{if(!notes.includes(t))notes.push(t);};
    if(selected.includes("A"))add("Покупка станка имеет смысл при подтверждённом ограничении мощности нужной операции. Загрузка 68% этого сама по себе не доказывает.");
    if(selected.includes("G"))add("Для TPM нужно выяснить причины 9% простоев: доля неисправностей пока неизвестна.");
    if(selected.includes("E"))add("Усиление финального контроля повышает возможности проверки, но не устраняет причины дефектов.");
    if(selected.includes("K"))add("Данных о дефиците квалификации нет; обучение и допуски требуют проверки.");
    if(selected.includes("I"))add("Частые поставки помогут только при надёжном снабжении; в отчёте есть случаи отсутствия материалов.");
    if(selected.includes("L"))add("Увеличение партий может снизить частоту переналадок, но способно увеличить очередь и срок цикла.");
    if(selected.includes("M"))add("Дополнительные смены имеют расходы и правовые ограничения. Их нельзя считать бесплатными или автоматически обязательными.");
    if(selected.includes("F") && selected.includes("L"))add("Сочетание SMED и укрупнения партий требует объяснения: первое снижает необходимость больших партий ради экономии переналадок.");
    if(selected.includes("B") && selected.includes("I"))add("Буферный склад и частые поставки — разные подходы к снабжению; их выгоды нельзя просто складывать.");
    if(selected.includes("D") && selected.includes("E"))add("Раннее выявление дефектов и дополнительный финальный контроль решают разные задачи, их эффекты не равнозначны.");
    if(selected.includes("K") && selected.includes("M"))add("Дополнительные смены не отменяют требований к квалификации, допускам и режиму труда.");
    const messages=[];
    if(!b.selectedCount)messages.push("Выберите хотя бы одно мероприятие.");
    if(b.overBudget)messages.push("Бюджет превышен на "+Math.abs(b.remaining)+" млн усл. ед. Уберите или замените мероприятия.");
    if(!field)messages.push("Выберите основную цель инвестирования.");
    if(field && b.selectedCount) {
      if(direct.length)messages.push("В портфеле есть меры, напрямую связанные с целью при выполнении оговорённых условий: "+direct.join(", ")+".");
      else messages.push("Прямое соответствие этой цели пока не подтверждено. Объясните, почему выбранные меры помогут именно ей.");
      if(debated.length)messages.push("Есть спорные или рискованные для этой цели инициативы: "+debated.join(", ")+".");
      if(supporting.length)messages.push("У части мер связь с целью косвенная или условная: "+supporting.join(", ")+".");
    }
    return {
      valid:eligible(state), budget:b, selected, goal:goalNames[state.rationale]||"",
      direct, supporting, debated, messages, notes, status:"ПРЕДЛОЖЕНО · качественная оценка, не утверждённый алгоритм"
    };
  }
  function committeeComments(state) {
    const selected=unique(state.selectedInvestments);
    const amount=budget(selected).spent;
    const manufacturing=selected.includes("A")
      ? "В портфеле есть новый станок. Но подтверждено ли ограничение мощности именно на нужной операции?"
      : selected.includes("F")
        ? "Вижу работу с переналадками. Важно показать, где они действительно сдерживают поток."
        : "Как ваши меры повлияют на выпуск, если главная причина задержек пока неизвестна?";
    const finance="Из условных 100 млн распределено "+amount+". Не забудьте эксплуатационные затраты и сроки внедрения.";
    const process=selected.includes("C")||selected.includes("F")||selected.includes("J")
      ? "Портфель затрагивает организационные потери. Для эффекта нужны исходные измерения и дисциплина внедрения."
      : "Проверьте, какие наблюдаемые потери выбранные меры устраняют, а какие остаются.";
    return [{speaker:"Андрей Громов",text:manufacturing},{speaker:"Марина Власова",text:finance},{speaker:"Ирина Соколова",text:process}];
  }
  function productionNotes(state) {
    const ids=unique(state.selectedInvestments);
    const output=["Очередь перед шлифованием обнаружена. Первопричина по исходным данным не определена."];
    if(ids.includes("F"))output.push("SMED мог бы сократить потери переналадки, если эти переналадки действительно ограничивают участок.");
    if(ids.includes("A"))output.push("Новый станок не гарантирует сокращение очереди без подтверждения нужной операции и времени ввода.");
    if(ids.includes("J"))output.push("Электронная доска может помочь видеть очередь, но не заменяет устранение её причины.");
    if(ids.includes("G"))output.push("TPM может повлиять на технические простои, если они являются значимой причиной задержки.");
    if(ids.includes("L"))output.push("Укрупнение партий может увеличить ожидание деталей между операциями.");
    if(ids.includes("B")||ids.includes("I"))output.push("Изменения снабжения не следует считать решением очереди без проверки наличия материалов.");
    if(ids.includes("D")||ids.includes("E"))output.push("Контроль качества важен, но сам по себе не подтверждает увеличение мощности шлифования.");
    if(!ids.some(id=>["F","A","J","G","L","B","I","D","E"].includes(id)))output.push("Выбранные мероприятия не дают основания заранее назвать причину очереди. Нужны данные по участку.");
    return output;
  }
  function secondDecisionNotes(state) {
    const docs=state.investigatedTopics||[];
    const ids=unique(state.selectedInvestments||[]);
    switch(state.secondDecision) {
      case "diagnose":
        return [
          "Вы не приписываете очереди заранее определённую причину и предлагаете сверить маршрут, простои и график.",
          "Это требует времени и участия мастера или диспетчера, но уменьшает риск нецелевых затрат.",
          docs.length<3?"Вы изучили не все доступные материалы; перед реальной корректировкой плана их стоит проверить.":"Вы просмотрели все три справки. Они обозначают вопросы для диагностики, а не доказывают одну причину."
        ];
      case "largebatch":
        return [
          "Более крупная партия может сократить частоту переналадок при определённой номенклатуре.",
          "Но исходный отчёт уже показывает 2,5 дня ожидания между операциями: накопление НЗП может ухудшить ситуацию.",
          ids.includes("F")?"В портфеле есть SMED. Стоит объяснить, зачем дополнительно укрупнять партии, если переналадки планируется сокращать.":"До такого решения нужно проверить долю переналадок в ограничении потока."
        ];
      case "extra":
        return [
          "Дополнительная смена может временно увеличить доступное время только при наличии материалов, оборудования и подготовленных работников.",
          "Потребуются расходы, соблюдение режима труда и отдыха, законное оформление и контроль безопасности.",
          ids.includes("M")?"Сходная мера уже есть в портфеле. Капитальная стоимость 0 не отменяет её фактических расходов.":"Это новая оперативная мера, не входящая в первоначальный бюджет капитальных вложений; её расходы отдельно не оценены."
        ];
      default:
        return ["Второе решение пока не принято."];
    }
  }
  function validateState(candidate) {
    if(!candidate || candidate.version!==2) return initialState();
    const copy=initialState();
    if(typeof candidate.playerName==="string")copy.playerName=sanitizeName(candidate.playerName);
    copy.passIssued=!!candidate.passIssued && !!copy.playerName;
    const scenes=Object.keys(SCRIPT.status);
    copy.scene=scenes.includes(candidate.scene)?candidate.scene:"S00";
    copy.askedS01=Array.isArray(candidate.askedS01)?candidate.askedS01.filter(id=>SCRIPT.S01.questions.some(q=>q.id===id)):[];
    copy.askedS03=Array.isArray(candidate.askedS03)?candidate.askedS03.filter(id=>SCRIPT.S03.people.some(q=>q.id===id)):[];
    copy.initialHypothesis=SCRIPT.S02.hypotheses.some(x=>x.id===candidate.initialHypothesis)?candidate.initialHypothesis:null;
    copy.selectedInvestments=unique(Array.isArray(candidate.selectedInvestments)?candidate.selectedInvestments:[]);
    copy.rationale=goalFields[candidate.rationale]?candidate.rationale:null;
    copy.reviewAccepted=!!candidate.reviewAccepted;
    copy.committeeDecision=SCRIPT.S05.options.some(x=>x.id===candidate.committeeDecision)?candidate.committeeDecision:null;
    copy.investigatedTopics=Array.isArray(candidate.investigatedTopics)?candidate.investigatedTopics.filter(id=>SCRIPT.S06.documents.some(x=>x.id===id)):[];
    copy.secondDecision=SCRIPT.S07.options.some(x=>x.id===candidate.secondDecision)?candidate.secondDecision:null;
    return copy;
  }
  window.CEH_LOGIC={initialState,sanitizeName,budget,eligible,reviewPortfolio,committeeComments,productionNotes,secondDecisionNotes,validateState};
})();
