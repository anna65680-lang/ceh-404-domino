(function () {
  'use strict';

  const data = window.GAME_DATA;
  const app = document.getElementById('app');
  if (!data || !app) throw new Error('Не удалось загрузить данные игры.');

  const initialState = () => ({
    scene: 'S00',
    name: '',
    passIssued: false,
    questions01: [],
    questions03: [],
    hypothesis: null,
    selected: [],
    goal: null
  });
  let state = initialState();

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function button(label, action, value, secondary) {
    return '<button type="button" class="' + (secondary ? 'secondary' : '') +
      '" data-action="' + escapeHTML(action) + '"' +
      (value === undefined ? '' : ' data-value="' + escapeHTML(value) + '"') +
      '>' + escapeHTML(label) + '</button>';
  }
  function scene(id, title, content) {
    return '<section class="panel scene" data-scene="' + id + '">' +
      '<div class="muted">ГЛАВА 1 · ' + id + '</div><h1>' + escapeHTML(title) + '</h1>' + content +
      '</section>';
  }
  function paragraph(text) { return '<p>' + escapeHTML(text) + '</p>'; }
  function notice(text) { return '<div class="notice">' + text + '</div>'; }
  function portrait(file, alt) {
    return '<img class="portrait" src="assets/characters/' + encodeURIComponent(file) +
      '" alt="' + escapeHTML(alt) + '" onerror="this.style.display=\'none\'">';
  }
  function total() {
    return data.investments.reduce(function (sum, item) {
      return sum + (state.selected.includes(item.id) ? item.cost : 0);
    }, 0);
  }
  const questions01 = [
    ['С чего начать?', 'Начните с производственного отчёта: отделяйте факты от предположений.'],
    ['Какие проблемы сейчас самые серьёзные?', 'Есть потери времени, ожидание между операциями и вопросы качества; причины ещё нужно проверить.'],
    ['Какие решения уже предлагают?', 'Предложения разные: модернизация оборудования, улучшение процессов и контроль затрат.']
  ];
  const facts = [
    'Производственный цикл: 9–16 дней',
    'Загрузка ключевого оборудования: 68%',
    'Простои: 9%',
    'Средняя переналадка: 70 минут',
    'Незавершённое производство между токарной и шлифовальной операциями: 2,5 дня',
    '60% выявленных дефектов обнаруживают на финальном контроле (знаменатель доли требует уточнения)',
    'Поиск инструмента: 12 минут за смену',
    'Поставки: раз в неделю; два случая отсутствия запаса за прошлый месяц'
  ];
  const hypotheses = [
    ['Нужно срочно купить новый станок', 'Загрузка 68% сама по себе не доказывает нехватку мощности.'],
    ['Есть признаки потерь и ограничений, но данных недостаточно для окончательного вывода', 'Необходимо определить доминирующее ограничение и причины потерь.'],
    ['Главная проблема — качество', 'Качество важно, но нельзя игнорировать ожидание между операциями.']
  ];
  const positions = [
    ['Андрей: оборудование', 'Андрей предлагает рассмотреть модернизацию, но сначала следует проверить, где реальное ограничение.'],
    ['Марина: бюджет', 'Марина напоминает о лимите инвестиций, рисках и сроках окупаемости решений.'],
    ['Ирина: потери', 'Ирина обращает внимание на переналадки, простои, ожидание и организацию рабочих мест.']
  ];
  const goals = [
    'Увеличить производственные возможности',
    'Сократить производственные потери',
    'Повысить качество и устойчивость производства'
  ];

  function render() {
    let body = '';

    if (state.scene === 'S00') {
      body = paragraph('Первый рабочий день на предприятии. Для начала получите пропуск.');
      if (!state.passIssued) {
        body += '<label>Ваше имя<br><input id="playerName" maxlength="40" placeholder="Введите имя" value="' +
          escapeHTML(state.name) + '"></label><div>' +
          button('Получить пропуск', 'pass') + '</div>';
      } else {
        body += notice('<strong>ПРОПУСК · ЦЕХ 404</strong><br>Сотрудник: ' +
          escapeHTML(state.name) + '<br>Статус: допущен к вводному заданию');
        body += button('Приступить к работе', 'next', 'S01');
      }
    } else if (state.scene === 'S01') {
      body = portrait('irina_neutral.png', 'Ирина Соколова') +
        paragraph('Ирина Соколова: ' + state.name +
          ', изучите положение дел и подготовьте обоснованную рекомендацию инвесткомитету.');
      questions01.forEach(function (item, i) {
        body += '<div>' + button(item[0], 'q01', i, true) +
          (state.questions01.includes(i) ? '<span class="badge">Просмотрено</span>' : '') + '</div>';
      });
      state.questions01.forEach(function (i) {
        body += notice('<b>' + escapeHTML(questions01[i][0]) + '</b>' + paragraph(questions01[i][1]));
      });
      body += button('Перейти к отчёту', 'next', 'S02');
    } else if (state.scene === 'S02') {
      body = paragraph('Исходные показатели учебного кейса; не являются отраслевыми нормативами.') +
        '<ul>' + facts.map(function (fact) { return '<li>' + escapeHTML(fact) + '</li>'; }).join('') +
        '</ul><h2>Ваш предварительный вывод</h2>';
      hypotheses.forEach(function (item, i) {
        body += '<div>' + button(item[0], 'hyp', i, true) + '</div>';
      });
      if (state.hypothesis !== null) {
        body += notice('<b>Ирина:</b> ' + escapeHTML(hypotheses[state.hypothesis][1]));
        body += button('Продолжить', 'next', 'S03');
      }
    } else if (state.scene === 'S03') {
      body = paragraph('Выслушайте профессиональные позиции. Порядок свободный.');
      positions.forEach(function (item, i) {
        body += '<div>' + button(item[0], 'q03', i, true) +
          (state.questions03.includes(i) ? '<span class="badge">Просмотрено</span>' : '') + '</div>';
      });
      state.questions03.forEach(function (i) {
        body += notice('<b>' + escapeHTML(positions[i][0]) + '</b>' + paragraph(positions[i][1]));
      });
      body += button('Перейти к инвестициям', 'next', 'S04');
    } else if (state.scene === 'S04') {
      const spent = total(), rest = data.budget - spent;
      body = paragraph('Выберите мероприятия в пределах 100 млн условных единиц. Нулевая капитальная стоимость не означает отсутствие текущих расходов.');
      body += '<div class="row"><div class="stat">Бюджет: <b>' + data.budget +
        '</b></div><div class="stat">Выбрано: <b>' + spent +
        '</b></div><div class="stat' + (rest < 0 ? ' danger' : '') +
        '">Осталось: <b>' + rest + '</b></div></div><div class="cards">';
      data.investments.forEach(function (item) {
        const active = state.selected.includes(item.id);
        body += '<article class="card' + (active ? ' selected' : '') + '"><h3>' +
          escapeHTML(item.id + '. ' + item.title) + '</h3><p class="badge">' +
          item.cost + ' млн</p>' + paragraph(item.note) +
          button(active ? 'Убрать' : 'Выбрать', 'toggle', item.id, true) + '</article>';
      });
      body += '</div><h2>Основная цель</h2>';
      goals.forEach(function (goal, i) {
        body += '<div>' + button((state.goal === i ? '✓ ' : '') + goal, 'goal', i, true) + '</div>';
      });
      body += button('Проверить портфель', 'evaluate') + '<div id="feedback"></div>';
    } else if (state.scene === 'S05') {
      body = notice('Сцены S05–S08 пока не реализованы: требуется согласованный сценарий, правила последствий и тесты. Это ещё не завершённый План Б.');
      body += button('Вернуться к инвестициям', 'next', 'S04', true);
      body += button('Начать заново', 'restart', undefined, true);
    }
    app.innerHTML = scene(state.scene, ({
      S00: 'Добро пожаловать в ЦЕХ 404',
      S01: 'Первый рабочий день',
      S02: 'Производственный отчёт',
      S03: 'Мнения руководителей',
      S04: 'Выбор инвестиций',
      S05: 'Продолжение пока не утверждено'
    })[state.scene], body);
  }

  function evaluate() {
    const feedback = document.getElementById('feedback');
    if (!feedback) return;
    if (state.selected.length === 0) {
      feedback.innerHTML = notice('Сначала выберите хотя бы одно мероприятие.');
      return;
    }
    if (total() > data.budget) {
      feedback.innerHTML = notice('<strong>Превышение бюджета.</strong> Измените портфель.');
      return;
    }
    if (state.goal === null) {
      feedback.innerHTML = notice('Укажите основную цель инвестирования.');
      return;
    }
    feedback.innerHTML = notice('<b>Портфель подготовлен к предварительному обсуждению.</b>' +
      paragraph('Выбрано: ' + state.selected.join(', ') + '. Расходы: ' + total() + ' млн.') +
      paragraph('Автоматическая экспертная оценка согласованности цели и портфеля пока не утверждена. Это не подтверждение эффективности решений.')) +
      button('Перейти к S05 (заглушка)', 'next', 'S05');
  }

  document.addEventListener('click', function (event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const value = target.dataset.value;
    if (action === 'pass') {
      const input = document.getElementById('playerName');
      const name = input ? input.value.trim() : '';
      if (!name) { alert('Введите имя.'); return; }
      state.name = name;
      state.passIssued = true;
    } else if (action === 'next') {
      state.scene = value;
    } else if (action === 'restart') {
      state = initialState();
    } else if (action === 'q01') {
      const i = Number(value);
      if (!state.questions01.includes(i)) state.questions01.push(i);
    } else if (action === 'q03') {
      const i = Number(value);
      if (!state.questions03.includes(i)) state.questions03.push(i);
    } else if (action === 'hyp') {
      state.hypothesis = Number(value);
    } else if (action === 'toggle') {
      state.selected = state.selected.includes(value)
        ? state.selected.filter(function (id) { return id !== value; })
        : state.selected.concat(value);
    } else if (action === 'goal') {
      state.goal = Number(value);
    } else if (action === 'evaluate') {
      evaluate();
      return;
    }
    render();
  });
  render();
})();