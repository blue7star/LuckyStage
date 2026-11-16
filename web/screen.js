(() => {
  'use strict';

  const SCREEN_THEME_IDS = ['newyear', 'annual', 'tech', 'garden', 'geospace'];

  const SCENES_HTML = `
    <div class="scene-newyear">
      <div class="year-watermark">2027</div>
      <div class="cloud cloud-one"></div><div class="cloud cloud-two"></div>
      <div class="lantern lantern-one"><i></i><b></b><span></span></div>
      <div class="lantern lantern-two"><i></i><b></b><span></span></div>
      <div class="firework-ring ring-one"></div><div class="firework-ring ring-two"></div>
    </div>
    <div class="scene-annual">
      <div class="deco-sun"></div><div class="beam beam-one"></div><div class="beam beam-two"></div><div class="beam beam-three"></div>
      <div class="stage-arc arc-one"></div><div class="stage-arc arc-two"></div><div class="stage-arc arc-three"></div>
      <div class="annual-watermark">ANNUAL<br>GALA</div>
    </div>
    <div class="scene-tech">
      <div class="tech-grid"></div><div class="orbit orbit-one"><i></i></div><div class="orbit orbit-two"><i></i></div><div class="orbit orbit-three"></div>
      <div class="tech-code code-one">01101 / FUTURE / 2027</div><div class="tech-code code-two">SYSTEM.READY — 88.06</div>
    </div>
    <div class="scene-garden">
      <div class="garden-halo"></div><div class="garden-arch arch-one"></div><div class="garden-arch arch-two"></div>
      <svg class="botanical botanical-one" viewBox="0 0 240 420" fill="none"><path d="M28 410C45 301 87 210 181 93M74 277C42 254 27 222 25 180M112 210C150 204 180 179 203 141M53 337C89 331 119 308 141 273M150 149C128 119 124 84 136 46"/><path d="M25 180C65 184 82 207 74 277C40 254 23 222 25 180ZM203 141C164 132 137 151 112 210C158 203 187 179 203 141ZM141 273C101 268 71 289 53 337C96 331 124 309 141 273ZM136 46C166 76 169 109 150 149C125 119 121 84 136 46Z"/></svg>
      <svg class="botanical botanical-two" viewBox="0 0 240 420" fill="none"><path d="M28 410C45 301 87 210 181 93M74 277C42 254 27 222 25 180M112 210C150 204 180 179 203 141M53 337C89 331 119 308 141 273M150 149C128 119 124 84 136 46"/><path d="M25 180C65 184 82 207 74 277C40 254 23 222 25 180ZM203 141C164 132 137 151 112 210C158 203 187 179 203 141ZM141 273C101 268 71 289 53 337C96 331 124 309 141 273ZM136 46C166 76 169 109 150 149C125 119 121 84 136 46Z"/></svg>
    </div>
    <div class="scene-geospace">
      <div class="geo-graticule"></div>
      <svg class="geo-globe" viewBox="0 0 400 400" fill="none">
        <circle class="globe-rim" cx="200" cy="200" r="150"/>
        <ellipse class="globe-lat" cx="200" cy="200" rx="150" ry="46"/>
        <ellipse class="globe-lat" cx="200" cy="132" rx="134" ry="38"/>
        <ellipse class="globe-lat" cx="200" cy="268" rx="134" ry="38"/>
        <ellipse class="globe-lat" cx="200" cy="82" rx="104" ry="28"/>
        <ellipse class="globe-lat" cx="200" cy="318" rx="104" ry="28"/>
        <ellipse class="globe-mer mer-one" cx="200" cy="200" rx="46" ry="150"/>
        <ellipse class="globe-mer mer-two" cx="200" cy="200" rx="92" ry="150"/>
        <ellipse class="globe-mer mer-three" cx="200" cy="200" rx="132" ry="150"/>
        <line class="globe-mer" x1="200" y1="50" x2="200" y2="350"/>
        <circle class="globe-node node-a" cx="128" cy="140" r="3.4"/>
        <circle class="globe-node node-b" cx="262" cy="212" r="3.4"/>
        <circle class="globe-node node-c" cx="182" cy="296" r="3.4"/>
        <path class="globe-link" d="M128 140Q205 150 262 212M262 212Q220 268 182 296"/>
      </svg>
      <div class="geo-scanline"></div>
      <div class="geo-orbit orbit-a"><b></b></div>
      <div class="geo-drone drone-one">
        <svg viewBox="0 0 72 34" fill="none"><path d="M26 20h20l5 8H21z"/><path d="M14 12h14M44 12h14M22 20l-4-8M50 20l4-8"/><path class="rotor" d="M6 10h16"/><path class="rotor rotor-b" d="M50 10h16"/><path d="M28 28v4M44 28v4"/></svg>
        <i class="drone-beam"></i>
      </div>
      <div class="geo-drone drone-two">
        <svg viewBox="0 0 72 34" fill="none"><path d="M26 20h20l5 8H21z"/><path d="M14 12h14M44 12h14M22 20l-4-8M50 20l4-8"/><path class="rotor" d="M6 10h16"/><path class="rotor rotor-b" d="M50 10h16"/><path d="M28 28v4M44 28v4"/></svg>
        <i class="drone-beam"></i>
      </div>
      <div class="geo-watermark">GEOSTAR<br>GEOSPATIAL</div>
    </div>`;

  function renderScenes(container) {
    if (!container) return;
    container.innerHTML = SCENES_HTML;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function makeCard(person, index, mode) {
    const card = document.createElement('div');
    card.className = `winner-card is-${mode}`;
    card.style.setProperty('--card-delay', `${index * 120}ms`);
    const placeholder = mode === 'placeholder';
    const rawName = placeholder ? '幸运席位' : String((person && person.name) || '参与者');
    const rawDept = placeholder ? '等待揭晓' : String((person && (person.department || person.prize)) || '幸运嘉宾');
    const rawId = placeholder ? 'READY TO SHINE' : String((person && person.id) || '');
    const name = escapeHtml(rawName);
    const initial = placeholder ? '+' : escapeHtml(rawName.slice(0, 1));
    card.innerHTML = `<div class="winner-card-inner">
      <span class="card-corner">LUCKY MOMENT</span><span class="card-rank">${String(index + 1).padStart(2, '0')}</span>
      <span class="candidate-avatar">${initial}</span>
      <strong class="candidate-name">${name}</strong>
      <span class="candidate-department">${escapeHtml(rawDept)}</span>${rawId ? `<span class="candidate-id">${escapeHtml(rawId)}</span>` : ''}<i class="card-ribbon"></i>
    </div>`;
    return card;
  }

  class Atmosphere {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.theme = 'newyear';
      this.ambient = [];
      this.effects = [];
      this.width = 0;
      this.height = 0;
      this.last = 0;
      this.running = false;
      this.fireworkClock = 0;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.tick = this.tick.bind(this);
      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop();
        else this.start();
      });
      this.reducedMotion.addEventListener('change', () => this.setTheme(this.theme));
      this.resize();
      this.start();
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      this.canvas.width = Math.round(this.width * ratio);
      this.canvas.height = Math.round(this.height * ratio);
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.seedAmbient();
    }

    setTheme(theme) {
      this.theme = theme;
      this.effects = [];
      this.fireworkClock = 0;
      this.seedAmbient();
      this.stop();
      this.start();
    }

    seedAmbient() {
      const count = this.reducedMotion.matches ? 0 : (this.width < 800 ? 24 : 46);
      this.ambient = Array.from({ length: count }, () => ({
        x: Math.random() * this.width, y: Math.random() * this.height,
        vx: (Math.random() - .5) * 9, vy: 4 + Math.random() * 13,
        size: 1 + Math.random() * 2.4, phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * 1.2,
        tone: Math.random()
      }));
    }

    start() {
      if (this.running || this.reducedMotion.matches || document.hidden) {
        if (this.reducedMotion.matches) this.ctx.clearRect(0, 0, this.width, this.height);
        return;
      }
      this.running = true;
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.frame);
    }

    addEffect(effect) {
      if (this.effects.length > 240) this.effects.splice(0, this.effects.length - 220);
      this.effects.push({ rotation: 0, spin: 0, gravity: 20, shape: 'dot', ...effect, maxLife: effect.life });
    }

    firework(x = this.width * (.15 + Math.random() * .7), y = this.height * (.12 + Math.random() * .32), amount = 34) {
      for (let i = 0; i < amount; i += 1) {
        const angle = (Math.PI * 2 * i) / amount + Math.random() * .08;
        const speed = 45 + Math.random() * 105;
        this.addEffect({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1.2 + Math.random() * .8, size: 1 + Math.random() * 2, color: i % 3 ? '#f6d58a' : '#fff4cf', gravity: 22, shape: 'spark' });
      }
    }

    celebrate() {
      if (this.reducedMotion.matches) return;
      if (this.theme === 'newyear') {
        this.firework(this.width * .32, this.height * .28, 44);
        this.firework(this.width * .68, this.height * .25, 44);
        window.setTimeout(() => this.firework(this.width * .5, this.height * .18, 50), 280);
      }
      const colors = this.theme === 'tech' ? ['#62e3d5', '#b4fff4', '#2d8f9c'] :
        this.theme === 'garden' ? ['#9b763d', '#e7cf9f', '#6f927b', '#f4ead2'] :
        this.theme === 'geospace' ? ['#4da3ff', '#8ec8ff', '#cfe6ff', '#2f6fd0'] : ['#f4d895', '#d8b66e', '#fff0c2'];
      const amount = this.width < 800 ? 48 : 90;
      for (let i = 0; i < amount; i += 1) {
        const angle = -Math.PI * (.12 + Math.random() * .76);
        const speed = 90 + Math.random() * 210;
        this.addEffect({ x: this.width * .5 + (Math.random() - .5) * 160, y: this.height * .48,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.8 + Math.random() * 1.4,
          size: 2 + Math.random() * 4, color: colors[i % colors.length], gravity: 150,
          rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * 8, shape: this.theme === 'garden' ? 'petal' : 'rect' });
      }
    }

    updateAmbient(dt, now) {
      const ctx = this.ctx;
      const colors = {
        newyear: ['246,213,138', '255,240,194'], annual: ['216,182,110', '244,216,149'],
        tech: ['98,227,213', '87,156,174'], garden: ['114,143,118', '169,134,76'],
        geospace: ['77,163,255', '142,200,255']
      }[this.theme];
      this.ambient.forEach((p, index) => {
        if (this.theme === 'garden') {
          p.y += p.vy * dt;
          p.x += (p.vx + Math.sin(now * .0008 + p.phase) * 9) * dt;
          p.rotation += p.spin * dt;
          if (p.y > this.height + 15) { p.y = -15; p.x = Math.random() * this.width; }
          if (p.x < -20) p.x = this.width + 20;
          if (p.x > this.width + 20) p.x = -20;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = `rgba(${p.tone > .5 ? colors[0] : colors[1]},${.13 + p.tone * .16})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 2.4, p.size * 1.15, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          const direction = this.theme === 'tech' ? 1 : -1;
          p.y += p.vy * dt * direction * .45;
          p.x += (p.vx + Math.sin(now * .0006 + p.phase) * 3) * dt;
          if (p.y < -10) p.y = this.height + 10;
          if (p.y > this.height + 10) p.y = -10;
          if (p.x < -10) p.x = this.width + 10;
          if (p.x > this.width + 10) p.x = -10;
          const alpha = .12 + (Math.sin(now * .0015 + p.phase) + 1) * .16;
          ctx.fillStyle = `rgba(${p.tone > .45 ? colors[0] : colors[1]},${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (this.theme === 'tech' ? .65 : 1), 0, Math.PI * 2);
          ctx.fill();
        }
        if ((this.theme === 'tech' || this.theme === 'geospace') && index % 2 === 0) {
          const lineColor = this.theme === 'tech' ? '98,227,213' : '77,163,255';
          for (let j = index + 1; j < Math.min(index + 8, this.ambient.length); j += 1) {
            const other = this.ambient[j];
            const distance = Math.hypot(p.x - other.x, p.y - other.y);
            if (distance < 115) {
              ctx.strokeStyle = `rgba(${lineColor},${(1 - distance / 115) * .09})`;
              ctx.lineWidth = .5;
              ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(other.x, other.y); ctx.stroke();
            }
          }
        }
      });
    }

    updateEffects(dt) {
      const ctx = this.ctx;
      this.effects = this.effects.filter((p) => {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
        const alpha = Math.min(1, p.life / Math.min(.45, p.maxLife));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'rect') ctx.fillRect(-p.size, -p.size * .45, p.size * 2, p.size * .9);
        else if (p.shape === 'petal') { ctx.beginPath(); ctx.ellipse(0, 0, p.size * 1.5, p.size * .7, 0, 0, Math.PI * 2); ctx.fill(); }
        else {
          if (p.shape === 'spark') { ctx.shadowColor = p.color; ctx.shadowBlur = 8; }
          ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        return p.y < this.height + 60 && p.x > -80 && p.x < this.width + 80;
      });
    }

    tick(now) {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, .034);
      this.last = now;
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.updateAmbient(dt, now);
      if (this.theme === 'newyear') {
        this.fireworkClock += dt;
        if (this.fireworkClock > 3.2) { this.fireworkClock = 0; this.firework(); }
      }
      this.updateEffects(dt);
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  window.ScreenKit = { SCREEN_THEME_IDS, renderScenes, makeCard, Atmosphere };
})();
