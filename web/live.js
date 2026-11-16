(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const eventId = new URLSearchParams(location.search).get('id');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  ScreenKit.renderScenes(document.querySelector('.scene'));
  const atmosphere = new ScreenKit.Atmosphere($('atmosphere'));
  const state = { event: null, results: [], pool: [], phase: 'idle', lastKey: '', ceremonyKey: '',
    initialized: false, timers: new Set(), session: 0, rollingTimer: 0, source: null, pollTimer: 0 };

  function safeImage(path) { return /^\/uploads\/[a-f0-9]{24}\.(png|jpg|webp)$/.test(path || '') ? path : ''; }
  function later(callback, delay) {
    const session = state.session;
    const timer = window.setTimeout(() => { state.timers.delete(timer); if (session === state.session) callback(); }, delay);
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
  async function getJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '活动加载失败');
    return data;
  }

  function applyColors(theme) {
    const bg = /^#[0-9a-f]{6}$/i.test(theme.background || '') ? theme.background : '';
    const primary = /^#[0-9a-f]{6}$/i.test(theme.primary || '') ? theme.primary : '';
    if (!bg && !primary) return;
    const style = document.body.style;
    if (bg) {
      style.setProperty('--bg', bg);
      style.setProperty('--bg-deep', `color-mix(in srgb, ${bg} 52%, #000)`);
    }
    if (primary) {
      style.setProperty('--accent', primary);
      style.setProperty('--accent-strong', `color-mix(in srgb, ${primary} 72%, #fff)`);
      style.setProperty('--line', `color-mix(in srgb, ${primary} 30%, transparent)`);
      style.setProperty('--glow', `color-mix(in srgb, ${primary} 26%, transparent)`);
    }
  }

  function applyEvent(event) {
    state.event = event;
    document.title = `${event.title} · 现场抽奖`;
    $('event-title').textContent = event.title;
    $('event-date').textContent = event.date ? event.date.replace('T', ' ') : '';
    const theme = event.theme || {};
    const preset = theme.preset || 'newyear';
    document.body.dataset.theme = preset;
    atmosphere.setTheme(preset);
    applyColors(theme);
    const customLogo = safeImage(theme.logo);
    const logo = customLogo || (preset === 'geospace' ? '/assets/geostar-logo.png' : '');
    $('event-logo').hidden = !logo;
    if (logo && $('event-logo').getAttribute('src') !== logo) $('event-logo').src = logo;
    $('brand-gem').hidden = !!logo;
  }

  function pendingOf() {
    const pairs = (state.event?.rounds || []).flatMap((round) => round.prizes.map((prize) => ({ round, prize })));
    return pairs.find(({ round, prize }) => !state.results.some((item) => item.roundId === round.id && item.prizeId === prize.id));
  }

  function setStatus(message, busy = false) {
    $('status-text').textContent = message;
    $('status-text').classList.toggle('is-busy', busy);
  }

  function markConnected(mode) { $('connection-status').textContent = mode; }

  function samplePool(count) {
    const pool = [...state.pool];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  function cardPerson(person, prizeName) {
    return { name: person.display || '参与者', department: person.department || prizeName || '', id: '' };
  }

  function updateFooter() {
    const flat = state.results.flatMap((item) => item.winners.map((winner) => ({ ...winner, prizeName: item.prizeName })));
    $('winner-total').textContent = String(flat.length).padStart(2, '0');
    $('winner-names').textContent = flat.map((winner) => winner.display).join(' · ');
  }

  function renderIdle() {
    clearTimers();
    state.phase = 'idle';
    const next = pendingOf();
    $('round-label').textContent = next ? next.round.name : '准备开始';
    $('prize-name').textContent = next ? next.prize.name : '抽奖完成';
    $('prize-count').textContent = next ? `${next.prize.count} 名幸运儿 · 静候佳音` : '';
    const zone = $('winner-zone');
    const count = next ? next.prize.count : 3;
    zone.dataset.count = String(count);
    zone.replaceChildren(...Array.from({ length: count }, (_, index) => ScreenKit.makeCard(null, index, 'placeholder')));
    setStatus(next ? '由主持人在管理台发起抽奖' : '本场抽奖已全部揭晓');
    updateFooter();
  }

  function renderResult(result) {
    state.phase = 'result';
    $('round-label').textContent = result.roundName;
    $('prize-name').textContent = result.prizeName;
    $('prize-count').textContent = '';
    const zone = $('winner-zone');
    zone.dataset.count = String(result.winners.length);
    zone.replaceChildren(...result.winners.map((winner, index) => ScreenKit.makeCard(cardPerson(winner, result.prizeName), index, 'winner')));
    setStatus(`恭喜 ${result.winners.map((winner) => winner.display).join('、')} 获得${result.prizeName}`);
    updateFooter();
  }

  function updateRolling(result) {
    const zone = $('winner-zone');
    const picks = samplePool(result.winners.length);
    if (!picks.length) return;
    if (zone.children.length !== picks.length || !zone.firstElementChild?.classList.contains('is-rolling')) {
      zone.dataset.count = String(picks.length);
      zone.replaceChildren(...picks.map((person, index) => ScreenKit.makeCard(cardPerson(person, result.prizeName), index, 'rolling')));
      return;
    }
    [...zone.children].forEach((card, index) => {
      const person = picks[index];
      card.querySelector('.candidate-avatar').textContent = person.display.slice(0, 1);
      card.querySelector('.candidate-name').textContent = person.display;
      card.querySelector('.candidate-department').textContent = person.department || result.prizeName;
    });
  }

  function runCeremony(result) {
    clearTimers();
    state.ceremonyKey = `${result.roundId}:${result.prizeId}:${result.drawnAt}`;
    $('round-label').textContent = result.roundName;
    $('prize-name').textContent = result.prizeName;
    $('prize-count').textContent = '';
    if (reducedMotion.matches || !state.pool.length) {
      renderResult(result);
      atmosphere.celebrate();
      loadPool();
      return;
    }
    state.phase = 'rolling';
    setStatus('幸运号码滚动中，请稍候', true);
    updateRolling(result);
    state.rollingTimer = window.setInterval(() => updateRolling(result), 90);
    later(() => {
      window.clearInterval(state.rollingTimer);
      state.rollingTimer = 0;
      state.phase = 'revealing';
      setStatus('聚光收束，幸运即将定格', true);
      updateRolling(result);
      later(() => updateRolling(result), 200);
      later(() => updateRolling(result), 420);
      later(() => { renderResult(result); atmosphere.celebrate(); loadPool(); }, 760);
    }, 4600);
  }

  function setResults(results, ceremony = false) {
    const latest = results.at(-1);
    const key = latest ? `${latest.roundId}:${latest.prizeId}:${latest.drawnAt}` : '';
    const isNew = !!key && key !== state.lastKey;
    const wasInit = state.initialized;
    state.results = results;
    state.lastKey = key;
    state.initialized = true;
    if (!latest) { renderIdle(); return; }
    if (isNew && ceremony && wasInit) { runCeremony(latest); return; }
    if (state.ceremonyKey === key && (state.phase === 'rolling' || state.phase === 'revealing')) return;
    renderResult(latest);
  }

  async function loadPool() {
    try {
      const data = await getJson(`/api/public/events/${eventId}/sample`);
      state.pool = data.participants || [];
    } catch {}
  }

  async function poll() {
    try {
      const [event, resultsData] = await Promise.all([
        getJson(`/api/public/events/${eventId}`), getJson(`/api/public/events/${eventId}/results`)]);
      applyEvent(event);
      if (!state.pool.length) loadPool();
      setResults(resultsData.results || [], true);
      if (!state.source || state.source.readyState !== 1) markConnected('轮询同步');
    } catch { markConnected('连接中断，自动重试中'); }
  }

  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = window.setInterval(poll, 3000);
    poll();
  }

  function connect() {
    if (!/^[a-f0-9]{16}$/.test(eventId || '')) {
      markConnected('活动链接无效');
      setStatus('请通过管理台提供的现场大屏地址打开本页');
      return;
    }
    const source = new EventSource(`/api/public/events/${eventId}/stream`);
    state.source = source;
    source.addEventListener('snapshot', (message) => {
      const data = JSON.parse(message.data);
      applyEvent(data.event);
      markConnected('实时连接');
      loadPool();
      setResults(data.results || [], false);
    });
    source.addEventListener('drawn', (message) => {
      const result = JSON.parse(message.data);
      const results = state.results.filter((item) => !(item.roundId === result.roundId && item.prizeId === result.prizeId));
      results.push(result);
      setResults(results, true);
    });
    source.addEventListener('config', (message) => { applyEvent(JSON.parse(message.data)); });
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) { markConnected('轮询同步'); startPolling(); }
      else markConnected('连接波动，重连中');
    };
  }

  connect();
})();
