const eventId = new URLSearchParams(location.search).get('id');
const $ = (id) => document.getElementById(id);
let lastKey = '';

function safeImage(path) { return /^\/uploads\/[a-f0-9]{24}\.(png|jpg|webp)$/.test(path || '') ? path : ''; }

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '活动加载失败');
  return data;
}

async function refresh() {
  if (!/^[a-f0-9]{16}$/.test(eventId || '')) { $('connection-status').textContent = '活动链接无效'; return; }
  try {
    const [event, resultData] = await Promise.all([
      getJson(`/api/public/events/${eventId}`), getJson(`/api/public/events/${eventId}/results`)]);
    document.title = `${event.title} · 现场抽奖`;
    $('event-title').textContent = event.title;
    $('event-date').textContent = event.date ? event.date.replace('T', ' ') : '';
    $('participant-count').textContent = event.participantCount;
    document.documentElement.style.setProperty('--primary', event.theme.primary);
    document.documentElement.style.setProperty('--background', event.theme.background);
    $('stage').className = `stage preset-${event.theme.preset}`;
    const backdrop = safeImage(event.theme.backdrop);
    $('stage').style.backgroundImage = backdrop ? `linear-gradient(90deg,#08142ba8,#08142b80),url("${backdrop}")` : '';
    const logo = safeImage(event.theme.logo);
    $('event-logo').style.display = logo ? 'block' : 'none';
    if (logo) $('event-logo').src = logo;
    const results = resultData.results;
    const latest = results.at(-1);
    const pending = event.rounds.flatMap((round) => round.prizes.map((prize) => ({ round, prize })))
      .find(({ round, prize }) => !results.some((item) => item.roundId === round.id && item.prizeId === prize.id));
    $('round-name').textContent = latest?.roundName || pending?.round.name || '抽奖完成';
    $('prize-name').textContent = latest?.prizeName || pending?.prize.name || '等待抽奖';
    const key = latest ? `${latest.roundId}:${latest.prizeId}:${latest.drawnAt}` : '';
    if (key && key !== lastKey) {
      $('spotlight').animate([{ transform: 'scale(.92)', opacity: .4 }, { transform: 'scale(1)', opacity: 1 }], { duration: 650, easing: 'ease-out' });
    }
    lastKey = key;
    $('winner-display').textContent = latest ? latest.winners.map((winner) => winner.display).join(' · ') : '好运即将揭晓';
    $('draw-state').textContent = pending ? `下个奖项：${pending.round.name} · ${pending.prize.name}` : '本场抽奖已完成';
    const winnerList = $('winner-list');
    winnerList.replaceChildren();
    const flat = results.flatMap((item) => item.winners.map((winner) => ({ ...winner, prizeName: item.prizeName })));
    if (!flat.length) {
      const empty = document.createElement('p'); empty.className = 'no-winner'; empty.textContent = '等待第一位幸运者'; winnerList.append(empty);
    }
    flat.forEach((winner, index) => {
      const row = document.createElement('div'); row.className = 'winner-item';
      const medal = document.createElement('span'); medal.className = 'winner-medal'; medal.textContent = String(index + 1);
      const text = document.createElement('div'); const name = document.createElement('strong'); name.textContent = winner.display;
      const prize = document.createElement('small'); prize.textContent = winner.prizeName; text.append(name, prize); row.append(medal, text); winnerList.append(row);
    });
    $('connection-status').textContent = '活动数据已同步';
  } catch (error) { $('connection-status').textContent = error.message; }
}

refresh();
setInterval(refresh, 3000);
