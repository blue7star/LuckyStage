const $ = (id) => document.getElementById(id);
const h = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const id = () => Math.random().toString(36).slice(2, 12);
let current = null;
let events = [];
let people = [];
let results = [];
let importRows = [];
let activeTab = 'basic';
let codeUrl = '';

async function api(method, endpoint, data) {
  const response = await fetch(`/api${endpoint}`, { method, credentials: 'same-origin',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `请求失败（${response.status}）`);
  return result;
}

function flash(message, error = false) {
  const el = $('flash');
  el.textContent = message;
  el.className = `flash${error ? ' error' : ''}`;
  window.clearTimeout(flash.timer);
  flash.timer = window.setTimeout(() => el.classList.add('hidden'), 7000);
}

function setTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tabs button').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
  document.querySelectorAll('.tab-pane').forEach((pane) => pane.classList.toggle('hidden', pane.id !== `tab-${tab}`));
}

function defaultConfig() {
  return { title: '新活动', date: '', description: '', registrationMode: 'both', registrationOpen: true,
    fields: [{ key: 'name', label: '姓名', type: 'text', required: true },
      { key: 'phone', label: '手机号', type: 'tel', required: true },
      { key: 'department', label: '部门', type: 'text', required: false }],
    uniqueField: 'phone', displayField: 'name',
    rounds: [{ id: id(), name: '第一轮', allowPreviousWinners: false,
      prizes: [{ id: id(), name: '一等奖', count: 1 }] }],
    theme: { preset: 'newyear', primary: '#f4ce7b', background: '#690f18', banner: '', backdrop: '', logo: '' } };
}

function renderEvents() {
  $('event-list').innerHTML = events.map((event) => `<button class="event-item ${current?.id === event.id ? 'active' : ''}" data-event="${h(event.id)}"><strong>${h(event.title)}</strong><small>${event.participantCount} 人参与 · ${h(event.date || '未设置时间')}</small></button>`).join('');
}

function renderFields() {
  $('fields-list').innerHTML = current.fields.map((field, index) => `<div class="field-row" data-index="${index}">
    <input class="field-key" value="${h(field.key)}" placeholder="如 employeeId" aria-label="字段标识">
    <input class="field-label" value="${h(field.label)}" placeholder="如 工号" aria-label="显示名称">
    <select class="field-type" aria-label="字段类型"><option value="text" ${field.type === 'text' ? 'selected' : ''}>文本</option><option value="tel" ${field.type === 'tel' ? 'selected' : ''}>手机号</option><option value="number" ${field.type === 'number' ? 'selected' : ''}>数字</option></select>
    <input class="field-required" type="checkbox" ${field.required ? 'checked' : ''} aria-label="必填">
    <button class="remove-field" type="button" aria-label="移除字段">×</button></div>`).join('');
  const choices = current.fields.map((field) => `<option value="${h(field.key)}">${h(field.label)}（${h(field.key)}）</option>`).join('');
  $('unique-field').innerHTML = choices;
  $('display-field').innerHTML = choices;
  $('unique-field').value = current.uniqueField;
  $('display-field').value = current.displayField;
}

function renderRounds() {
  $('rounds-list').innerHTML = current.rounds.map((round, roundIndex) => `<div class="round-card" data-round-index="${roundIndex}" data-round-id="${h(round.id)}">
    <div class="round-head"><input class="round-name" value="${h(round.name)}" aria-label="轮次名称"><label><input class="allow-repeat" type="checkbox" ${round.allowPreviousWinners ? 'checked' : ''}>允许前轮中奖者再次参与</label><button class="remove-round" type="button">移除轮次</button></div>
    <div class="prize-list">${round.prizes.map((prize, prizeIndex) => `<div class="prize-row" data-prize-index="${prizeIndex}" data-prize-id="${h(prize.id)}"><input class="prize-name" value="${h(prize.name)}" aria-label="奖项名称"><input class="prize-count" type="number" min="1" max="500" value="${prize.count}" aria-label="中奖人数"><button class="remove-prize" type="button" aria-label="移除奖项">×</button></div>`).join('')}</div>
    <button class="add-prize secondary" type="button">＋ 添加奖项</button></div>`).join('');
}

function renderAssets() {
  for (const key of ['banner', 'backdrop', 'logo']) {
    const el = $(`${key}-preview`);
    el.classList.toggle('hidden', !current.theme[key]);
    if (current.theme[key]) el.src = current.theme[key];
  }
}

function renderThemePreview() {
  const title = $('event-title').value || '活动名称';
  const primary = $('theme-primary').value;
  const background = $('theme-background').value;
  const assets = current.theme;
  $('mini-preview-title').textContent = title;
  $('screen-preview-title').textContent = title;
  $('mini-preview-hero').style.background = assets.banner ? `linear-gradient(#0003,#0007),url("${assets.banner}") center/cover` : `linear-gradient(135deg,${primary},${background})`;
  $('screen-preview').style.background = assets.backdrop ? `linear-gradient(#0008,#0009),url("${assets.backdrop}") center/cover` : `radial-gradient(circle at center,${primary}55,${background} 70%)`;
  $('mini-preview-button').style.backgroundColor = primary;
  for (const prefix of ['mini', 'screen']) {
    const image = $(`${prefix}-preview-logo`);
    image.style.display = assets.logo ? 'block' : 'none';
    if (assets.logo) image.src = assets.logo;
  }
}

function renderPeople() {
  $('people-head').innerHTML = `<tr>${current.fields.map((field) => `<th>${h(field.label)}</th>`).join('')}<th>来源</th><th>登记时间</th></tr>`;
  $('people-body').innerHTML = people.map((person) => `<tr>${current.fields.map((field) => `<td>${h(person.values[field.key])}</td>`).join('')}<td>${person.source === 'scan' ? '扫码' : '导入'}</td><td>${h(new Date(person.createdAt).toLocaleString('zh-CN'))}</td></tr>`).join('') || `<tr><td colspan="${current.fields.length + 2}" class="muted">还没有参与者</td></tr>`;
}

function renderDraws() {
  $('draw-list').innerHTML = current.rounds.map((round) => `<div class="draw-card"><h3>${h(round.name)}</h3><p>${round.allowPreviousWinners ? '前轮中奖者可再次参与' : '排除前轮中奖者'}</p>
    ${round.prizes.map((prize) => {
      const result = results.find((item) => item.roundId === round.id && item.prizeId === prize.id);
      return `<div class="draw-prize"><div><strong>${h(prize.name)} · ${prize.count} 人</strong><div class="winner-tags">${result ? result.winners.map((winner) => `<span>${h(winner.display)}</span>`).join('') : '<span>尚未抽取</span>'}</div></div><button class="${result ? 'secondary' : 'primary'} draw-button" data-round="${h(round.id)}" data-prize="${h(prize.id)}" type="button" ${result ? 'disabled' : ''}>${result ? '已抽取' : '开始抽奖'}</button></div>`;
    }).join('')}</div>`).join('');
  $('stat-drawn').textContent = results.length;
}

function renderEditor() {
  $('empty').classList.add('hidden');
  $('editor').classList.remove('hidden');
  $('save-event').classList.remove('hidden');
  $('live-link').classList.remove('hidden');
  $('page-title').textContent = current.title;
  $('stat-id').textContent = current.id;
  $('stat-people').textContent = events.find((event) => event.id === current.id)?.participantCount ?? people.length;
  $('event-title').value = current.title;
  $('event-date').value = current.date;
  $('registration-mode').value = current.registrationMode;
  $('registration-open').checked = current.registrationOpen;
  $('event-description').value = current.description;
  $('theme-preset').value = current.theme.preset;
  $('theme-primary').value = current.theme.primary;
  $('theme-background').value = current.theme.background;
  $('live-link').href = `/live?id=${encodeURIComponent(current.id)}`;
  $('draw-live-link').href = $('live-link').href;
  const eventUrl = `${location.origin}/event?id=${encodeURIComponent(current.id)}`;
  $('event-link-text').value = eventUrl;
  $('event-link').href = eventUrl;
  $('result-link').href = `${location.origin}/results?id=${encodeURIComponent(current.id)}`;
  $('local-link-note').classList.toggle('hidden', !['localhost', '127.0.0.1', '::1'].includes(location.hostname));
  renderFields(); renderRounds(); renderAssets(); renderThemePreview(); renderPeople(); renderDraws(); renderEvents(); setTab(activeTab);
  if (codeUrl) URL.revokeObjectURL(codeUrl);
  codeUrl = '';
  $('code-image').classList.add('hidden');
  $('download-code').classList.add('hidden');
}

function collectDraft() {
  if (!current) return null;
  const fields = [...document.querySelectorAll('.field-row')].map((row) => ({
    key: row.querySelector('.field-key').value.trim(), label: row.querySelector('.field-label').value.trim(),
    type: row.querySelector('.field-type').value, required: row.querySelector('.field-required').checked }));
  const rounds = [...document.querySelectorAll('.round-card')].map((card) => ({
    id: card.dataset.roundId, name: card.querySelector('.round-name').value.trim(),
    allowPreviousWinners: card.querySelector('.allow-repeat').checked,
    prizes: [...card.querySelectorAll('.prize-row')].map((row) => ({ id: row.dataset.prizeId,
      name: row.querySelector('.prize-name').value.trim(), count: Number(row.querySelector('.prize-count').value) })) }));
  return { ...current, title: $('event-title').value.trim(), date: $('event-date').value,
    description: $('event-description').value.trim(), registrationMode: $('registration-mode').value,
    registrationOpen: $('registration-open').checked, fields, uniqueField: $('unique-field').value,
    displayField: $('display-field').value, rounds,
    theme: { ...current.theme, preset: $('theme-preset').value, primary: $('theme-primary').value,
      background: $('theme-background').value } };
}

async function loadEvents() {
  events = (await api('GET', '/admin/events')).events;
  renderEvents();
}

async function selectEvent(eventId) {
  const [event, participantResult, drawResult] = await Promise.all([
    api('GET', `/admin/events/${eventId}`), api('GET', `/admin/events/${eventId}/participants`),
    api('GET', `/admin/events/${eventId}/results`)]);
  current = event;
  people = participantResult.participants;
  results = drawResult.results;
  importRows = [];
  $('csv-file').value = '';
  $('import-csv').disabled = true;
  $('csv-preview').textContent = 'CSV 首行写字段标识或显示名称。';
  renderEditor();
}

async function createEvent() {
  try {
    const event = await api('POST', '/admin/events', defaultConfig());
    await loadEvents();
    await selectEvent(event.id);
    flash('活动已创建。现在可以编辑设置。');
  } catch (error) { flash(error.message, true); }
}

async function saveEvent() {
  try {
    const draft = collectDraft();
    current = await api('PUT', `/admin/events/${current.id}`, draft);
    await loadEvents();
    renderEditor();
    flash('活动设置已保存');
    return true;
  } catch (error) { flash(error.message, true); return false; }
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') { cell += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index++;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error('CSV 引号未闭合');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

async function readCsv(file) {
  importRows = [];
  $('import-csv').disabled = true;
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) throw new Error('CSV 文件不得超过 2 MB');
  const rows = parseCsv(await file.text());
  if (rows.length < 2) throw new Error('CSV 至少需要表头和一行数据');
  const header = rows.shift().map((value) => value.trim());
  const indexes = current.fields.map((field) => header.findIndex((value) => value === field.key || value === field.label));
  const missing = current.fields.filter((field, index) => field.required && indexes[index] < 0);
  if (missing.length) throw new Error(`CSV 缺少必填列：${missing.map((field) => field.label).join('、')}`);
  importRows = rows.map((cells) => Object.fromEntries(current.fields.map((field, index) => [field.key, indexes[index] < 0 ? '' : cells[indexes[index]] || ''])));
  if (importRows.length > 5000) throw new Error('一次最多导入 5000 行');
  $('csv-preview').textContent = `已读取 ${importRows.length} 行；缺失或重复值会在导入时列出。`;
  $('import-csv').disabled = false;
}

async function uploadAsset(key, file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) throw new Error('图片不得超过 2 MB');
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
  const response = await api('POST', '/admin/uploads', { type: file.type, base64 });
  current = collectDraft();
  current.theme[key] = response.path;
  renderEditor();
  flash('图片已上传；请点击右上角“保存设置”应用到活动。');
}

async function showCode() {
  try {
    const response = await fetch(`/api/admin/events/${current.id}/code?origin=${encodeURIComponent(location.origin)}`, { credentials: 'same-origin' });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || '获取二维码失败');
    }
    if (codeUrl) URL.revokeObjectURL(codeUrl);
    codeUrl = URL.createObjectURL(await response.blob());
    $('code-image').src = codeUrl;
    $('code-image').classList.remove('hidden');
    $('download-code').href = codeUrl;
    $('download-code').classList.remove('hidden');
  } catch (error) { flash(error.message, true); }
}

async function draw(roundId, prizeId) {
  const round = current.rounds.find((item) => item.id === roundId);
  const prize = round?.prizes.find((item) => item.id === prizeId);
  if (!prize || !window.confirm(`确认抽取 ${round.name} · ${prize.name}（${prize.count} 人）？结果将立即保存。`)) return;
  if (!await saveEvent()) return;
  try {
    const result = await api('POST', `/admin/events/${current.id}/draw`, { roundId, prizeId });
    results = (await api('GET', `/admin/events/${current.id}/results`)).results;
    renderDraws();
    flash(`${result.prizeName} 已抽出：${result.winners.map((item) => item.display).join('、')}`);
  } catch (error) { flash(error.message, true); }
}

function wireEvents() {
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('POST', '/admin/login', { password: $('password').value });
      $('password').value = '';
      $('login').classList.add('hidden'); $('app').classList.remove('hidden');
      await loadEvents();
      if (events.length) await selectEvent(events[0].id);
    } catch (error) { $('login-error').textContent = error.message; }
  });
  $('logout').addEventListener('click', async () => { await api('POST', '/admin/logout'); location.reload(); });
  $('new-event').addEventListener('click', createEvent);
  $('empty-create').addEventListener('click', createEvent);
  $('event-list').addEventListener('click', (event) => { const target = event.target.closest('[data-event]'); if (target) selectEvent(target.dataset.event).catch((error) => flash(error.message, true)); });
  $('save-event').addEventListener('click', saveEvent);
  $('theme-preset').addEventListener('change', (event) => {
    const colors = { newyear: ['#f4ce7b', '#690f18'], annual: ['#d8b66e', '#08121d'], tech: ['#62e3d5', '#061a22'], garden: ['#9b763d', '#e9e2d2'], geospace: ['#4da3ff', '#081c33'] };
    [$('theme-primary').value, $('theme-background').value] = colors[event.target.value];
    renderThemePreview();
    flash('已应用预设配色；可继续上传素材，完成后点击保存设置。');
  });
  for (const input of ['event-title', 'theme-primary', 'theme-background']) $(input).addEventListener('input', () => { if (current) renderThemePreview(); });
  document.querySelector('.tabs').addEventListener('click', (event) => { if (event.target.dataset.tab) setTab(event.target.dataset.tab); });
  $('add-field').addEventListener('click', () => { current = collectDraft(); current.fields.push({ key: `field${current.fields.length + 1}`, label: '新字段', type: 'text', required: false }); renderEditor(); });
  $('fields-list').addEventListener('click', (event) => { if (!event.target.classList.contains('remove-field')) return; const index = Number(event.target.closest('.field-row').dataset.index); current = collectDraft(); current.fields.splice(index, 1); if (!current.fields.length) current.fields.push({ key: 'name', label: '姓名', type: 'text', required: true }); if (!current.fields.some((field) => field.key === current.uniqueField)) current.uniqueField = current.fields[0].key; if (!current.fields.some((field) => field.key === current.displayField)) current.displayField = current.fields[0].key; renderEditor(); });
  $('fields-list').addEventListener('input', (event) => {
    if (!event.target.matches('.field-key,.field-label')) return;
    const unique = $('unique-field').value;
    const display = $('display-field').value;
    const fields = [...document.querySelectorAll('.field-row')].map((row) => ({
      key: row.querySelector('.field-key').value.trim(), label: row.querySelector('.field-label').value.trim() }));
    const choices = fields.map((field) => `<option value="${h(field.key)}">${h(field.label)}（${h(field.key)}）</option>`).join('');
    $('unique-field').innerHTML = choices;
    $('display-field').innerHTML = choices;
    $('unique-field').value = fields.some((field) => field.key === unique) ? unique : fields[0]?.key || '';
    $('display-field').value = fields.some((field) => field.key === display) ? display : fields[0]?.key || '';
  });
  $('add-round').addEventListener('click', () => { current = collectDraft(); current.rounds.push({ id: id(), name: `第${current.rounds.length + 1}轮`, allowPreviousWinners: false, prizes: [{ id: id(), name: '新奖项', count: 1 }] }); renderEditor(); });
  $('rounds-list').addEventListener('click', (event) => { const card = event.target.closest('.round-card'); if (!card) return; const index = Number(card.dataset.roundIndex); current = collectDraft(); if (event.target.classList.contains('remove-round')) { if (current.rounds.length === 1) return flash('至少保留一轮', true); current.rounds.splice(index, 1); } else if (event.target.classList.contains('add-prize')) current.rounds[index].prizes.push({ id: id(), name: '新奖项', count: 1 }); else if (event.target.classList.contains('remove-prize')) { if (current.rounds[index].prizes.length === 1) return flash('每轮至少保留一个奖项', true); current.rounds[index].prizes.splice(Number(event.target.closest('.prize-row').dataset.prizeIndex), 1); } else return; renderEditor(); });
  $('csv-file').addEventListener('change', async (event) => { try { await readCsv(event.target.files[0]); } catch (error) { $('csv-preview').textContent = error.message; flash(error.message, true); } });
  $('import-csv').addEventListener('click', async () => { if (!importRows.length) return; if (!await saveEvent()) return; try { const report = await api('POST', `/admin/events/${current.id}/import`, { rows: importRows }); await loadEvents(); await selectEvent(current.id); setTab('participants'); flash(`导入完成：新增 ${report.inserted}，重复 ${report.duplicates}，无效 ${report.invalid}${report.errors.length ? '；前几条错误：' + report.errors.map((error) => `第${error.row}行 ${error.message}`).join('；') : ''}`); } catch (error) { flash(error.message, true); } });
  $('refresh-people').addEventListener('click', async () => { try { await loadEvents(); await selectEvent(current.id); setTab('participants'); } catch (error) { flash(error.message, true); } });
  $('load-code').addEventListener('click', showCode);
  $('copy-event-link').addEventListener('click', async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText($('event-link-text').value);
      else {
        $('event-link-text').select();
        if (!document.execCommand('copy')) throw new Error('复制失败');
      }
      flash('报名链接已复制');
    } catch { flash('复制失败，请选中报名链接后手动复制。', true); }
  });
  for (const key of ['banner', 'backdrop', 'logo']) $(`${key}-file`).addEventListener('change', async (event) => { try { await uploadAsset(key, event.target.files[0]); } catch (error) { flash(error.message, true); } });
  document.querySelectorAll('.remove-asset').forEach((button) => button.addEventListener('click', () => { current = collectDraft(); current.theme[button.dataset.asset] = ''; renderEditor(); flash('素材已移除；请保存设置。'); }));
  $('draw-list').addEventListener('click', (event) => { const button = event.target.closest('.draw-button'); if (button && !button.disabled) draw(button.dataset.round, button.dataset.prize); });
}

wireEvents();
api('GET', '/admin/me').then(async () => {
  $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  await loadEvents();
  if (events.length) await selectEvent(events[0].id);
}).catch(() => {});
