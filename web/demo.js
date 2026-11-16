(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const participants = [
    '林晓雨', '陈思远', '王梓轩', '张若彤', '李慕辰', '周予安',
    '赵清和', '吴星遥', '郑书瑶', '孙景行', '何佳宁', '高允熙',
    '梁知夏', '宋云舟', '唐语桐', '许明澈', '韩沐阳', '冯清妍',
    '曹浩然', '蒋南絮', '沈亦辰', '叶欣然', '陆景明', '苏晚晴'
  ].map((name, index) => ({
    id: `NO.${String(index + 1).padStart(3, '0')}`,
    name,
    tag: index % 8,
    department: ['市场品牌中心', '产品研发中心', '客户成功部', '战略发展部', '创意设计部', '人力资源部', '财务管理部', '供应链中心'][index % 8]
  }));

  const themes = {
    newyear: {
      name: '新岁启幕', kicker: 'NEW YEAR CELEBRATION', title: ['新岁启幕', '好运连连'],
      subtitle: '2027 元旦迎新盛典 · 幸运抽奖', date: '2027.01.01', place: '新年庆典主会场', color: '#690f18',
      rounds: ['第一轮 · 鸿运开场', '第二轮 · 福气满堂', '第三轮 · 新岁压轴'],
      prizes: [{ name: '新春鸿运奖', count: 3 }, { name: '锦鲤福运奖', count: 2 }, { name: '新岁特等奖', count: 1 }]
    },
    annual: {
      name: '星耀之夜', kicker: 'ANNUAL GALA · SHINING TOGETHER', title: ['星耀之夜', '共赴璀璨'],
      subtitle: '2026 公司年度盛典 · 感恩每一位同行者', date: '2026.12.28', place: '星耀国际宴会厅', color: '#08121d',
      rounds: ['第一轮 · 星光初绽', '第二轮 · 卓越同行', '第三轮 · 璀璨加冕'],
      prizes: [{ name: '年度星耀奖', count: 3 }, { name: '卓越同行奖', count: 2 }, { name: '年度璀璨大奖', count: 1 }]
    },
    tech: {
      name: '未来共振', kicker: 'FUTURE IN SYNC · BEYOND LIMITS', title: ['未来共振', '智启新程'],
      subtitle: '2027 科技创新年会 · 探索无限可能', date: '2027.01.16', place: '未来科技发布中心', color: '#061a22',
      rounds: ['ROUND 01 · 灵感唤醒', 'ROUND 02 · 先锋连接', 'ROUND 03 · 突破边界'],
      prizes: [{ name: '未来创想奖', count: 3 }, { name: '数字先锋奖', count: 2 }, { name: '年度突破奖', count: 1 }]
    },
    garden: {
      name: '鎏光花园', kicker: 'APPRECIATION GALA · WITH GRATITUDE', title: ['鎏光花园', '感恩同行'],
      subtitle: '2027 客户答谢会 · 把美好赠予珍贵的你', date: '2027.02.06', place: '云境艺术中心', color: '#e9e2d2',
      rounds: ['第一章 · 知遇之礼', '第二章 · 相伴之礼', '第三章 · 至臻之礼'],
      prizes: [{ name: '挚友相伴奖', count: 3 }, { name: '鎏光臻选奖', count: 2 }, { name: '感恩至臻奖', count: 1 }]
    },
    geospace: {
      name: '时空智绘', kicker: 'GEOSTAR · SMART GEOSPATIAL EXPO', title: ['智绘时空', '共见未来'],
      subtitle: '吉奥时空信息股份有限公司 · 展览互动幸运抽奖', date: '2026.11.13', place: '时空信息主题展区', color: '#081c33',
      audience: ['参会代表', '生态伙伴', '特邀嘉宾', '行业专家', '媒体朋友', '合作伙伴', '学界同仁', '展商朋友'],
      rounds: ['第一轮 · 星启时空', '第二轮 · 云联万象', '第三轮 · 智见未来'],
      prizes: [{ name: '时空同行奖', count: 3 }, { name: '智绘幸运奖', count: 2 }, { name: '星耀压轴大奖', count: 1 }]
    }
  };

  const state = {
    theme: 'newyear', round: 0, phase: 'idle', awarded: new Set(), history: [],
    rollingTimer: 0, timers: new Set(), session: 0
  };
  let toastTimer = 0;

  function setPhase(phase) {
    state.phase = phase;
    document.body.dataset.phase = phase;
    document.querySelector('.draw-stage').classList.toggle('is-busy', phase === 'rolling' || phase === 'revealing');
  }

  function later(callback, delay) {
    const session = state.session;
    const timer = window.setTimeout(() => {
      state.timers.delete(timer);
      if (session === state.session) callback();
    }, delay);
    state.timers.add(timer);
    return timer;
  }

  function clearTimers() {
    window.clearInterval(state.rollingTimer);
    state.rollingTimer = 0;
    state.timers.forEach((timer) => window.clearTimeout(timer));
    state.timers.clear();
    state.session += 1;
  }

  function toast(message) {
    window.clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').classList.add('show');
    toastTimer = window.setTimeout(() => $('toast').classList.remove('show'), 1800);
  }

  function samplePeople(count, source = participants) {
    const pool = [...source];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  function audienceOf(person) {
    const theme = themes[state.theme];
    return theme.audience ? theme.audience[person.tag] : person.department;
  }

  function makeCard(person, index, mode) {
    return ScreenKit.makeCard(person ? { ...person, department: audienceOf(person) } : null, index, mode);
  }

  function renderPlaceholders() {
    const prize = themes[state.theme].prizes[state.round];
    const zone = $('winner-zone');
    zone.dataset.count = String(prize.count);
    zone.setAttribute('aria-live', 'off');
    zone.replaceChildren(...Array.from({ length: prize.count }, (_, index) => makeCard(null, index, 'placeholder')));
  }

  function updateRollingCards(people) {
    const zone = $('winner-zone');
    if (zone.children.length !== people.length || !zone.firstElementChild?.classList.contains('is-rolling')) {
      zone.dataset.count = String(people.length);
      zone.replaceChildren(...people.map((person, index) => makeCard(person, index, 'rolling')));
      return;
    }
    [...zone.children].forEach((card, index) => {
      const person = people[index];
      card.querySelector('.candidate-avatar').textContent = person.name.slice(0, 1);
      card.querySelector('.candidate-name').textContent = person.name;
      card.querySelector('.candidate-department').textContent = audienceOf(person);
      card.querySelector('.candidate-id').textContent = person.id;
    });
  }

  function updatePrize() {
    const theme = themes[state.theme];
    const prize = theme.prizes[state.round];
    $('round-index').textContent = String(state.round + 1).padStart(2, '0');
    $('round-label').textContent = theme.rounds[state.round];
    $('prize-name').textContent = prize.name;
    $('prize-count').textContent = prize.count;
  }

  function setButton(label, disabled = false) {
    $('draw-button-text').textContent = label;
    $('draw-button').disabled = disabled;
  }

  function setStatus(message) {
    $('status-text').textContent = message;
  }

  function startDrawing() {
    if (state.phase !== 'idle') return;
    const prize = themes[state.theme].prizes[state.round];
    setPhase('rolling');
    $('winner-zone').setAttribute('aria-live', 'off');
    setButton('立即揭晓');
    setStatus(`正在从 ${participants.length - state.awarded.size} 位候选人中滚动抽取，点击按钮定格幸运`);
    updateRollingCards(samplePeople(prize.count));
    state.rollingTimer = window.setInterval(() => updateRollingCards(samplePeople(prize.count)), 85);
    later(finishDrawing, 6500);
  }

  function finishDrawing() {
    if (state.phase !== 'rolling') return;
    window.clearInterval(state.rollingTimer);
    state.rollingTimer = 0;
    setPhase('revealing');
    setButton('幸运揭晓中', true);
    setStatus('聚光收束，幸运即将定格');
    const prize = themes[state.theme].prizes[state.round];
    const eligible = participants.filter((person) => !state.awarded.has(person.id));
    const winners = samplePeople(prize.count, eligible);
    [0, 170, 390].forEach((delay) => later(() => updateRollingCards(samplePeople(prize.count)), delay));
    later(() => revealWinners(winners), 900);
  }

  function revealWinners(winners) {
    const theme = themes[state.theme];
    const prize = theme.prizes[state.round];
    setPhase('result');
    winners.forEach((person) => state.awarded.add(person.id));
    state.history.unshift({ prize: prize.name, round: theme.rounds[state.round], winners });
    const zone = $('winner-zone');
    zone.dataset.count = String(winners.length);
    zone.setAttribute('aria-live', 'polite');
    zone.replaceChildren(...winners.map((person, index) => makeCard(person, index, 'winner')));
    setStatus(`恭喜 ${winners.map((person) => person.name).join('、')} 获得${prize.name}`);
    setButton(state.round === theme.prizes.length - 1 ? '重新演示' : '抽取下一奖项');
    renderHistory();
    atmosphere.celebrate();
  }

  function renderHistory() {
    const total = state.history.reduce((sum, group) => sum + group.winners.length, 0);
    $('winner-total').textContent = String(total).padStart(2, '0');
    const list = $('history-list');
    if (!state.history.length) {
      list.innerHTML = '<div class="history-empty"><span class="empty-emblem"><i></i></span><strong>虚位以待</strong><p>每一次揭晓，都值得被铭记</p></div>';
      return;
    }
    list.replaceChildren(...state.history.map((group) => {
      const section = document.createElement('section');
      section.className = 'history-group';
      const head = document.createElement('div');
      head.className = 'history-group-head';
      const title = document.createElement('strong');
      title.textContent = group.prize;
      const round = document.createElement('span');
      round.textContent = group.round.split(' · ')[0];
      head.append(title, round);
      section.append(head);
      group.winners.forEach((person) => {
        const row = document.createElement('div');
        row.className = 'history-person';
        const avatar = document.createElement('span');
        avatar.textContent = person.name.slice(0, 1);
        const copy = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = person.name;
        const department = document.createElement('small');
        department.textContent = `${audienceOf(person)} · ${person.id}`;
        copy.append(name, department);
        row.append(avatar, copy);
        section.append(row);
      });
      return section;
    }));
  }

  function resetDemo(showToast = false) {
    clearTimers();
    state.round = 0;
    state.awarded.clear();
    state.history = [];
    setPhase('idle');
    updatePrize();
    renderPlaceholders();
    renderHistory();
    setButton('开始抽奖');
    setStatus('幸运已就绪，等待开启');
    atmosphere.setTheme(state.theme);
    if (showToast) toast('本轮演示已重置，中奖名录已清空');
  }

  function switchTheme(themeId) {
    if (!themes[themeId]) return;
    const changed = state.theme !== themeId;
    state.theme = themeId;
    const theme = themes[themeId];
    document.body.dataset.theme = themeId;
    const isGeospace = themeId === 'geospace';
    $('brand-logo').hidden = !isGeospace;
    document.querySelector('.brand-gem').hidden = isGeospace;
    document.querySelector('.brand-text').hidden = isGeospace;
    document.querySelector('meta[name="theme-color"]').content = theme.color;
    $('event-kicker').innerHTML = `<span></span> ${theme.kicker} <span></span>`;
    $('event-title').innerHTML = `${theme.title[0]} <em>·</em> ${theme.title[1]}`;
    $('event-subtitle').textContent = theme.subtitle;
    $('event-date').textContent = theme.date;
    $('event-place').textContent = theme.place;
    document.querySelectorAll('.theme-card').forEach((button) => {
      const active = button.dataset.themeValue === themeId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.title = `${theme.name} · 动态抽奖演示`;
    resetDemo(false);
    if (changed) toast(`已切换至「${theme.name}」主题`);
  }

  function handleDraw() {
    if (state.phase === 'idle') startDrawing();
    else if (state.phase === 'rolling') finishDrawing();
    else if (state.phase === 'result') {
      if (state.round === themes[state.theme].prizes.length - 1) resetDemo(true);
      else {
        clearTimers();
        state.round += 1;
        setPhase('idle');
        updatePrize();
        startDrawing();
      }
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('当前浏览器不支持全屏，可使用浏览器全屏快捷键');
    } catch {
      toast('未能进入全屏，请使用浏览器全屏快捷键');
    }
  }

  ScreenKit.renderScenes(document.querySelector('.scene'));
  const atmosphere = new ScreenKit.Atmosphere($('atmosphere'));
  $('participant-count').textContent = participants.length;
  document.querySelectorAll('.theme-card').forEach((button) => button.addEventListener('click', () => switchTheme(button.dataset.themeValue)));
  $('draw-button').addEventListener('click', handleDraw);
  $('reset-button').addEventListener('click', () => resetDemo(true));
  $('fullscreen-button').addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? '退出全屏' : '全屏展示';
    $('fullscreen-button').setAttribute('aria-label', label);
    $('fullscreen-button').title = `${label}（F）`;
  });
  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.code === 'Space') { event.preventDefault(); handleDraw(); }
    else if (event.key.toLowerCase() === 'r') resetDemo(true);
    else if (event.key.toLowerCase() === 'f') toggleFullscreen();
    else if (['1', '2', '3', '4', '5'].includes(event.key)) switchTheme(Object.keys(themes)[Number(event.key) - 1]);
  });

  const urlTheme = new URLSearchParams(window.location.search).get('theme');
  switchTheme(urlTheme && themes[urlTheme] ? urlTheme : 'newyear');
})();
