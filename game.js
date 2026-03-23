'use strict';

// ===========================
// COMMANDS
// ===========================
const COMMANDS = [
  { text: '청기 올려!',                   req: [{ flag: 'blue',  act: 'up'   }] },
  { text: '청기 내려!',                   req: [{ flag: 'blue',  act: 'down' }] },
  { text: '백기 올려!',                   req: [{ flag: 'white', act: 'up'   }] },
  { text: '백기 내려!',                   req: [{ flag: 'white', act: 'down' }] },
  { text: '청기 올리지 말고 백기 올려!',  req: [{ flag: 'white', act: 'up'   }], forbidden: [{ flag: 'blue',  act: 'up'   }] },
  { text: '백기 올리지 말고 청기 올려!',  req: [{ flag: 'blue',  act: 'up'   }], forbidden: [{ flag: 'white', act: 'up'   }] },
  { text: '청기 내리지 말고 백기 내려!',  req: [{ flag: 'white', act: 'down' }], forbidden: [{ flag: 'blue',  act: 'down' }] },
  { text: '백기 내리지 말고 청기 내려!',  req: [{ flag: 'blue',  act: 'down' }], forbidden: [{ flag: 'white', act: 'down' }] },
  { text: '청기 올리지 말고 백기 내려!',  req: [{ flag: 'white', act: 'down' }], forbidden: [{ flag: 'blue',  act: 'up'   }] },
  { text: '백기 올리지 말고 청기 내려!',  req: [{ flag: 'blue',  act: 'down' }], forbidden: [{ flag: 'white', act: 'up'   }] },
  { text: '청기 내리지 말고 백기 올려!',  req: [{ flag: 'white', act: 'up'   }], forbidden: [{ flag: 'blue',  act: 'down' }] },
  { text: '백기 내리지 말고 청기 올려!',  req: [{ flag: 'blue',  act: 'up'   }], forbidden: [{ flag: 'white', act: 'down' }] },
];

const MAX_LIVES          = 3;
const BASE_CMD_TIME      = 3000;
const MIN_CMD_TIME       = 900;
const SPEED_FACTOR       = 0.94;

// ===========================
// STATE (immutable pattern — always reassign, never mutate nested)
// ===========================
let gs = {
  mode:         null,   // 'single' | 'multi'
  myLives:      MAX_LIVES,
  oppLives:     MAX_LIVES,
  round:        0,
  score:        0,
  cmd:          null,
  pendingReqs:  [],
  cmdTime:      BASE_CMD_TIME,
  cmdTimeoutId: null,
  timerRafId:   null,
  flagState:    { blue: 'down', white: 'down' },
  active:       false,
  peer:         null,
  conn:         null,
  isHost:       false,
};

// ===========================
// HELPERS
// ===========================
const $  = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function toast(msg) {
  const t = el('div', 'toast', msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ===========================
// INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  $('btn-single').onclick      = startSingle;
  $('btn-multi').onclick       = () => showScreen('screen-lobby');
  $('lobby-back').onclick      = () => showScreen('screen-home');
  $('btn-create').onclick      = createRoom;
  $('btn-join').onclick        = joinRoom;
  $('waiting-cancel').onclick  = cancelWaiting;
  $('btn-retry').onclick       = retryGame;
  $('btn-home').onclick        = goHome;

  document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!gs.active) return;
      handleAction(btn.dataset.flag, btn.dataset.action);
    });
  });

  // Copy peer ID on click
  $('room-code-display').addEventListener('click', () => {
    const id = $('room-code-display').dataset.fullId;
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => toast('클립보드에 복사됨!')).catch(() => {});
  });

  initHomeDecoration();
});

// ===========================
// SINGLE PLAYER
// ===========================
function startSingle() {
  gs = { ...gs, mode: 'single' };
  $('hud-opponent').style.display = 'none';
  $('vs-badge').style.display     = 'none';
  initGame();
  showScreen('screen-game');
  startCountdown(beginLoop);
}

// ===========================
// GAME INIT
// ===========================
function initGame() {
  gs = {
    ...gs,
    myLives:     MAX_LIVES,
    oppLives:    MAX_LIVES,
    round:       0,
    score:       0,
    cmdTime:     BASE_CMD_TIME,
    flagState:   { blue: 'down', white: 'down' },
    active:      false,
    cmd:         null,
    pendingReqs: [],
  };
  renderHearts('hearts-me',  MAX_LIVES);
  if (gs.mode === 'multi') renderHearts('hearts-opp', MAX_LIVES);
  $('round-display').textContent = 'ROUND 1';
  $('score-display').textContent = 'SCORE 0';
  $('command-text').textContent  = '준비...';
  $('command-text').className    = 'command-text';
  updateFlagVisuals();

  // Build timer bar
  const timerEl = $('command-timer');
  timerEl.innerHTML = '';
  const bar = el('div', 'command-timer-bar');
  bar.style.width = '100%';
  timerEl.appendChild(bar);
}

// ===========================
// COUNTDOWN
// ===========================
function startCountdown(cb) {
  const counts = ['3', '2', '1', 'GO!'];
  let i = 0;
  function tick() {
    if (i >= counts.length) { cb(); return; }
    const overlay = el('div', 'countdown-overlay', counts[i]);
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 750);
    i++;
    setTimeout(tick, 850);
  }
  tick();
}

// ===========================
// COMMAND LOOP
// ===========================
function beginLoop() {
  gs = { ...gs, active: true };
  nextCommand();
}

function nextCommand() {
  if (!gs.active) return;

  const round   = gs.round + 1;
  const cmdTime = round > 1 ? Math.max(MIN_CMD_TIME, gs.cmdTime * SPEED_FACTOR) : gs.cmdTime;
  const cmd     = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];

  gs = { ...gs, round, cmdTime, cmd, pendingReqs: [...cmd.req] };

  $('round-display').textContent = `ROUND ${round}`;

  // Sync to peer (host only)
  if (gs.mode === 'multi' && gs.isHost && gs.conn) {
    gs.conn.send({ type: 'cmd', idx: COMMANDS.indexOf(cmd), cmdTime });
  }

  showCommand(cmd.text);
  speak(cmd.text);
  startTimer(cmdTime);

  const timeoutId = setTimeout(() => {
    if (!gs.active) return;
    if (gs.pendingReqs.length > 0) mistake();
    else correct();
  }, cmdTime);
  gs = { ...gs, cmdTimeoutId: timeoutId };
}

function showCommand(text) {
  const el = $('command-text');
  el.textContent = text;
  el.className   = 'command-text';
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = 'ko-KR';
  u.rate   = 1.0 + (BASE_CMD_TIME - gs.cmdTime) / BASE_CMD_TIME * 0.5;
  u.pitch  = 1.1;
  window.speechSynthesis.speak(u);
}

function startTimer(duration) {
  cancelAnimationFrame(gs.timerRafId);
  const bar   = $('command-timer').querySelector('.command-timer-bar');
  if (!bar) return;
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    const pct     = Math.max(0, 1 - elapsed / duration);
    bar.style.width = (pct * 100) + '%';
    bar.style.background = pct > 0.4
      ? `linear-gradient(90deg, var(--blue), var(--blue-light))`
      : `linear-gradient(90deg, var(--danger), #ff6b7a)`;
    if (pct > 0 && gs.active) gs = { ...gs, timerRafId: requestAnimationFrame(frame) };
  }
  gs = { ...gs, timerRafId: requestAnimationFrame(frame) };
}

// ===========================
// FLAG ACTIONS
// ===========================
function handleAction(flag, act) {
  const { cmd, flagState, pendingReqs } = gs;
  if (!cmd) return;

  // Forbidden check
  if (cmd.forbidden && cmd.forbidden.some(f => f.flag === flag && f.act === act)) {
    mistake(); return;
  }

  // Already in that state
  if (flagState[flag] === act) return;

  const newFlagState = { ...flagState, [flag]: act };
  gs = { ...gs, flagState: newFlagState };
  updateFlagVisuals();

  // Required check
  const idx = pendingReqs.findIndex(r => r.flag === flag && r.act === act);
  if (idx !== -1) {
    const newPending = pendingReqs.filter((_, i) => i !== idx);
    gs = { ...gs, pendingReqs: newPending };
    if (newPending.length === 0) {
      clearTimeout(gs.cmdTimeoutId);
      cancelAnimationFrame(gs.timerRafId);
      correct();
    }
  } else {
    mistake();
  }
}

function updateFlagVisuals() {
  const blueCloth  = document.querySelector('#flag-blue-visual .flag-cloth');
  const whiteCloth = document.querySelector('#flag-white-visual .flag-cloth');
  blueCloth  && blueCloth.classList.toggle('flag-down',  gs.flagState.blue  === 'down');
  whiteCloth && whiteCloth.classList.toggle('flag-down', gs.flagState.white === 'down');
}

// ===========================
// CORRECT / MISTAKE
// ===========================
function correct() {
  const score = gs.score + 10 + gs.round;
  gs = { ...gs, score };
  $('score-display').textContent = `SCORE ${score}`;
  flashCmd('flash-correct');
  setTimeout(nextCommand, 350);
}

function mistake() {
  if (!gs.active) return;
  const myLives = gs.myLives - 1;
  gs = { ...gs, myLives };
  renderHearts('hearts-me', myLives);
  flashCmd('flash-wrong');
  clearTimeout(gs.cmdTimeoutId);
  cancelAnimationFrame(gs.timerRafId);

  if (gs.mode === 'multi' && gs.conn) {
    gs.conn.send({ type: 'mistake' });
    if (myLives <= 0) gs.conn.send({ type: 'game-over' });
  }

  if (myLives <= 0) {
    endGame(false);
  } else {
    setTimeout(nextCommand, 900);
  }
}

function flashCmd(cls) {
  const el = $('command-text');
  el.className = `command-text ${cls}`;
}

// ===========================
// HEARTS
// ===========================
function renderHearts(containerId, lives) {
  const container = $(containerId);
  container.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const h = el('span', 'heart' + (i >= lives ? ' lost' : ' heart-bounce'), '❤️');
    container.appendChild(h);
  }
}

// ===========================
// GAME END
// ===========================
function endGame(win, draw = false) {
  gs = { ...gs, active: false };
  clearTimeout(gs.cmdTimeoutId);
  cancelAnimationFrame(gs.timerRafId);
  window.speechSynthesis && window.speechSynthesis.cancel();

  $('result-emoji').textContent = draw ? '🤝' : win ? '🏆' : '💀';
  $('result-title').textContent = draw ? '무승부!' : win ? '승리!' : '패배...';
  $('result-sub').textContent   = win
    ? `${gs.round}라운드까지 버텼습니다!`
    : `${gs.round}라운드에서 탈락했습니다.`;

  $('result-stats').innerHTML = `
    <div class="stat-row">
      <span class="stat-label">최종 점수</span>
      <span class="stat-value">${gs.score}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">최대 라운드</span>
      <span class="stat-value">${gs.round}</span>
    </div>
  `;
  showScreen('screen-result');
}

function retryGame() {
  if (gs.mode === 'single') {
    startSingle();
  } else {
    if (gs.conn) gs.conn.close();
    if (gs.peer) gs.peer.destroy();
    gs = { ...gs, conn: null, peer: null };
    showScreen('screen-lobby');
  }
}

function goHome() {
  if (gs.conn)  gs.conn.close();
  if (gs.peer)  gs.peer.destroy();
  gs = { ...gs, conn: null, peer: null, active: false };
  showScreen('screen-home');
}

// ===========================
// PEERJS — CREATE ROOM
// ===========================
function createRoom() {
  showScreen('screen-waiting');
  $('waiting-title').textContent    = '방 생성 중...';
  $('room-code-display').textContent = '';
  $('room-code-display').removeAttribute('data-full-id');
  $('waiting-desc').textContent     = '잠시만 기다려주세요...';

  const peer = new Peer(undefined, { debug: 1 });
  gs = { ...gs, peer, isHost: true };

  peer.on('open', id => {
    $('room-code-display').textContent       = id;
    $('room-code-display').dataset.fullId    = id;
    $('waiting-title').textContent           = '방 코드 (클릭하여 복사)';
    $('waiting-desc').textContent            = '상대방에게 이 코드를 공유하세요';
  });

  peer.on('connection', conn => {
    gs = { ...gs, conn };
    setupConn(conn);
    $('waiting-title').textContent = '상대방 연결됨! 곧 시작합니다...';
    setTimeout(startMulti, 1200);
  });

  peer.on('error', err => {
    toast('연결 오류: ' + err.type);
    showScreen('screen-lobby');
  });
}

// ===========================
// PEERJS — JOIN ROOM
// ===========================
function joinRoom() {
  const hostId = $('room-code-input').value.trim();
  if (!hostId) { toast('방 코드를 입력해주세요'); return; }

  showScreen('screen-waiting');
  $('waiting-title').textContent    = '연결 중...';
  $('room-code-display').textContent = '';
  $('waiting-desc').textContent     = '상대방 방에 연결 중입니다...';

  const peer = new Peer(undefined, { debug: 1 });
  gs = { ...gs, peer, isHost: false };

  peer.on('open', () => {
    const conn = peer.connect(hostId, { reliable: true });
    gs = { ...gs, conn };
    setupConn(conn);
    conn.on('open', () => {
      $('waiting-title').textContent = '연결 성공! 호스트를 기다리는 중...';
      $('waiting-desc').textContent  = '상대방이 게임을 시작할 때까지 대기해주세요';
    });
  });

  peer.on('error', err => {
    toast('연결 실패: ' + err.type + ' — 코드를 다시 확인해주세요');
    showScreen('screen-lobby');
  });
}

function cancelWaiting() {
  if (gs.peer) { gs.peer.destroy(); gs = { ...gs, peer: null, conn: null }; }
  showScreen('screen-lobby');
}

// ===========================
// PEERJS — CONNECTION HANDLER
// ===========================
function setupConn(conn) {
  conn.on('data', data => {
    if (data.type === 'cmd' && !gs.isHost) {
      // Guest receives command from host
      const cmd = COMMANDS[data.idx];
      gs = { ...gs, cmd, pendingReqs: [...cmd.req], cmdTime: data.cmdTime };

      clearTimeout(gs.cmdTimeoutId);
      cancelAnimationFrame(gs.timerRafId);

      gs = { ...gs, round: gs.round + 1 };
      $('round-display').textContent = `ROUND ${gs.round}`;

      showCommand(cmd.text);
      speak(cmd.text);
      startTimer(data.cmdTime);

      const timeoutId = setTimeout(() => {
        if (!gs.active) return;
        if (gs.pendingReqs.length > 0) mistake();
        else correct();
      }, data.cmdTime);
      gs = { ...gs, cmdTimeoutId: timeoutId };
    }

    if (data.type === 'mistake') {
      const oppLives = gs.oppLives - 1;
      gs = { ...gs, oppLives };
      renderHearts('hearts-opp', oppLives);
    }

    if (data.type === 'game-over') {
      endGame(true);
    }

    if (data.type === 'start') {
      startMultiClient();
    }
  });

  conn.on('close', () => {
    if (gs.active) {
      toast('상대방 연결이 끊어졌습니다.');
      setTimeout(goHome, 1500);
    }
  });
}

// ===========================
// MULTI — START
// ===========================
function startMulti() {
  gs = { ...gs, mode: 'multi' };
  $('hud-opponent').style.display = '';
  $('vs-badge').style.display     = '';
  initGame();
  showScreen('screen-game');

  if (gs.isHost) {
    gs.conn.send({ type: 'start' });
    startCountdown(beginLoop);
  }
}

function startMultiClient() {
  gs = { ...gs, mode: 'multi' };
  $('hud-opponent').style.display = '';
  $('vs-badge').style.display     = '';
  initGame();
  showScreen('screen-game');
  startCountdown(() => { gs = { ...gs, active: true }; });
}

// ===========================
// HOME DECORATION (canvas particles)
// ===========================
function initHomeDecoration() {
  const screen = $('screen-home');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.12;';
  screen.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width  = screen.offsetWidth  || window.innerWidth;
    H = canvas.height = screen.offsetHeight || window.innerHeight;
  }

  function makeParticles() {
    return Array.from({ length: 40 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     Math.random() * 2.5 + 0.5,
      speed: Math.random() * 0.6 + 0.15,
      color: Math.random() > 0.5 ? '#1A6FFF' : '#F0F4FF',
      drift: (Math.random() - 0.5) * 0.3,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles = particles.map(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      const newY = p.y - p.speed;
      const newX = p.x + p.drift;
      if (newY + p.r < 0) return { ...p, y: H + p.r, x: Math.random() * W };
      return { ...p, y: newY, x: newX };
    });
    requestAnimationFrame(draw);
  }

  resize();
  particles = makeParticles();
  window.addEventListener('resize', () => { resize(); particles = makeParticles(); });
  draw();
}
