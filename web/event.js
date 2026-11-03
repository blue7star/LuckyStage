const $ = (id) => document.getElementById(id);
const eventId = new URLSearchParams(location.search).get('id') || '';
const page = document.body.dataset.page;
let eventConfig;

async function publicApi(path, options) {
  const response = await fetch(`/api/public/events/${eventId}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`);
  return data;
}

function showLoadError(message) {
  $('load-error').textContent = message;
  $('load-error').classList.remove('hidden');
  $('event-content').classList.add('hidden');
}

function applyEvent(event) {
  eventConfig = event;
  document.title = `${page === 'results' ? '中奖结果' : '活动报名'} · ${event.title}`;
  document.documentElement.style.setProperty('--primary', event.theme.primary);
  document.documentElement.style.setProperty('--background', event.theme.background);
  document.body.dataset.preset = event.theme.preset;
  $('event-title').textContent = event.title;
  if (event.date) {
    $('event-date').textContent = `活动时间 · ${event.date.replace('T', ' ')}`;
    $('event-date').classList.remove('hidden');
  }
  if (event.theme.banner) {
    $('hero').style.backgroundImage = `linear-gradient(0deg, #091329b0, #09132920), url("${event.theme.banner}")`;
    $('hero').style.backgroundSize = 'cover';
    $('hero').style.backgroundPosition = 'center';
  }
  if (event.theme.logo) {
    $('event-logo').src = event.theme.logo;
    $('event-logo').classList.remove('hidden');
  }
  $('event-content').classList.remove('hidden');
  $('load-error').classList.add('hidden');
}

function showStatus(kind, title, detail) {
  const box = $('registration-status');
  box.className = `registration-status ${kind}`;
  box.replaceChildren();
  const heading = document.createElement('strong');
  heading.textContent = title;
  box.append(heading, document.createTextNode(detail));
}

function renderRegistration(event) {
  $('participant-count').textContent = `${event.participantCount} 人已参与`;
  $('results-link').href = `/results?id=${encodeURIComponent(event.id)}`;
  if (event.description) {
    $('event-description').textContent = event.description;
    $('event-description').classList.remove('hidden');
  }
  const canRegister = event.registrationOpen && ['scan', 'both'].includes(event.registrationMode);
  if (!canRegister) {
    $('registration-form').classList.add('hidden');
    showStatus('info', '报名暂未开放', event.registrationMode === 'import'
      ? '本场活动使用预导入名单，请联系组织者确认参与资格。'
      : '请关注活动通知，或稍后再来查看。');
    return;
  }
  const fields = $('fields');
  for (const field of event.fields) {
    const label = document.createElement('label');
    label.className = 'field-label';
    label.textContent = field.label;
    if (field.required) {
      const star = document.createElement('span');
      star.className = 'required';
      star.textContent = '*';
      label.append(star);
    }
    const input = document.createElement('input');
    input.className = 'field-input';
    input.name = field.key;
    input.type = field.type === 'tel' ? 'tel' : 'text';
    if (field.type === 'number') input.inputMode = 'decimal';
    if (field.type === 'tel') input.inputMode = 'tel';
    input.maxLength = 120;
    input.required = field.required;
    input.placeholder = `请输入${field.label}`;
    input.autocomplete = 'off';
    label.append(input);
    fields.append(label);
  }
}

async function submitRegistration(submitEvent) {
  submitEvent.preventDefault();
  const button = $('submit-button');
  if (button.disabled) return;
  const values = Object.fromEntries(eventConfig.fields.map((field) =>
    [field.key, document.querySelector(`[name="${field.key}"]`).value.trim()]));
  button.disabled = true;
  button.firstChild.textContent = '正在提交 '; 
  try {
    const result = await publicApi('/register', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) });
    $('registration-form').classList.add('hidden');
    if (result.status === 'already_registered') {
      showStatus('info', '该信息已在参与名单中', '无需重复提交。若这不是您的信息，请联系活动组织者。');
    } else {
      showStatus('success', '报名成功', '信息已登记，您可以返回活动页查看中奖结果。');
    }
  } catch (error) {
    showStatus('error', '提交失败', error.message);
  } finally {
    button.disabled = false;
    button.firstChild.textContent = '确认报名 ';
  }
}

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

async function renderResults() {
  const container = $('results');
  container.replaceChildren();
  try {
    const data = await publicApi('/results');
    eventConfig.rounds.forEach((round, index) => {
      const card = make('section', 'round-card');
      const head = make('div', 'round-head');
      head.append(make('span', 'round-index', String(index + 1)), make('h3', '', round.name));
      card.append(head);
      round.prizes.forEach((prize) => {
        const result = data.results.find((item) => item.roundId === round.id && item.prizeId === prize.id);
        const block = make('div', 'prize');
        const title = make('div', 'prize-title');
        title.append(make('strong', '', prize.name), make('span', '', `${prize.count} 人`));
        block.append(title);
        if (result?.winners.length) {
          const winners = make('div', 'winners');
          result.winners.forEach((winner) => winners.append(make('span', 'winner', winner.display)));
          block.append(winners);
        } else {
          block.append(make('p', 'pending', '等待开奖'));
        }
        card.append(block);
      });
      container.append(card);
    });
  } catch (error) {
    container.append(make('div', 'result-error', error.message));
  }
}

async function start() {
  if (!/^[a-f0-9]{16}$/.test(eventId)) return showLoadError('活动链接无效，请向组织者获取正确的链接或二维码。');
  try {
    const event = await publicApi('');
    applyEvent(event);
    if (page === 'results') {
      $('event-link').href = `/event?id=${encodeURIComponent(event.id)}`;
      $('refresh-results').addEventListener('click', renderResults);
      await renderResults();
    } else {
      renderRegistration(event);
      $('registration-form').addEventListener('submit', submitRegistration);
    }
  } catch (error) { showLoadError(error.message); }
}

start();
