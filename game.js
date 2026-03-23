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

// Characters
const CHARACTERS = [
  { name: '쥐', emoji: '🐭' },
  { name: '소', emoji: '🐮' },
  { name: '호랑이', emoji: '🐯' },
  { name: '토끼', emoji: '🐰' },
  { name: '용', emoji: '🐲' },
  { name: '뱀', emoji: '🐍' },
  { name: '말', emoji: '🐴' },
  { name: '양', emoji: '🐑' },
  { name: '원숭이', emoji: '🐵' },
  { name: '닭', emoji: '🐔' },
  { name: '개', emoji: '🐶' },
  { name: '돼지', emoji: '🐷' },
  // 통계학 특화 캐릭터
  { name: '우상향', emoji: '📈' },
  { name: '정규분포', emoji: '🔔' },
  { name: '확률론', emoji: '🎲' },
  { name: '통계학도', emoji: '🤓' }
];

const MAX_LIVES          = 3;
const BASE_CMD_TIME      = 3000;
const MIN_CMD_TIME       = 900;
const SPEED_FACTOR       = 0.94;

// ===========================
// STATE
// ===========================
let gs = {
  mode:         null,
  character:    '🐰',
  myLives:      MAX_LIVES,
  oppLives:     MAX_LIVES,
  round:        0,
  score:        0,
  cmd:          null,
  pendingReqs:  [],
  cmdTime:      BASE_CMD_TIME,
  cmdTimeoutId: null,
  timerRafId:   null,
  flagState:    { blue: 'middle', white: 'middle' },
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

  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!gs.active) return;
      handleAction(btn.dataset.flag, btn.dataset.action);
    });
  });

  const roomDisplay = $('room-code-display');
  if(roomDisplay) {
    roomDisplay.parentElement.addEventListener('click', () => {
      const id = roomDisplay.dataset.fullId;
      if (!id) return;
      navigator.clipboard.writeText(id).then(() => toast('코드가 복사되었습니다!')).catch(() => {});
    });
  }

  renderCharacterSelect();
});

// ===========================
// CHARACTER SELECTION
// ===========================
function renderCharacterSelect() {
  const container = $('character-select');
  if(!container) return;
  container.innerHTML = '';

  CHARACTERS.forEach(z => {
    const btn = el('button', 'w-10 h-10 text-2xl flex items-center justify-center rounded-xl transition-all ' + (gs.character === z.emoji ? 'bg-white/20 ring-2 ring-blue-500 scale-110' : 'grayscale opacity-60 hover:opacity-100 hover:grayscale-0 hover:bg-white/10'));
    btn.textContent = z.emoji;
    btn.title = z.name;
    btn.onclick = () => selectCharacter(z.emoji);
    container.appendChild(btn);
  });
}

function selectCharacter(emoji) {
  gs = { ...gs, character: emoji };
  $('preview-emoji').textContent = emoji;
  $('game-emoji').textContent = emoji;
  renderCharacterSelect();
}

// ===========================
// SINGLE PLAYER
// ===========================
function startSingle() {
  gs = { ...gs, mode: 'single' };
  $('hud-opponent').classList.add('opacity-0');
  $('vs-badge').classList.add('opacity-0');
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
    flagState:   { blue: 'middle', white: 'middle' },
    active:      false,
    cmd:         null,
    pendingReqs: [],
  };
  renderHearts('hearts-me',  MAX_LIVES);
  if (gs.mode === 'multi') renderHearts('hearts-opp', MAX_LIVES);
  $('round-display').textContent = 'ROUND 1';
  $('score-display').textContent = 'SCORE 0';
  $('command-text').textContent  = '준비...';
  $('command-text').className    = 'text-3xl sm:text-4xl font-black tracking-tight'; // reset
  updateFlagVisuals();

  // Reset Timer Bar
  const timerBar = $('command-timer');
  timerBar.style.width = '100%';
  timerBar.style.backgroundColor = '#3B82F6';
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
  
  // Only select commands that require a state change.
  const validCmds = COMMANDS.filter(c => c.req.some(r => gs.flagState[r.flag] !== r.act));
  const cmd       = validCmds.length > 0 
    ? validCmds[Math.floor(Math.random() * validCmds.length)]
    : COMMANDS[0];

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
  const ctext = $('command-text');
  ctext.textContent = text;
  ctext.classList.remove('cmd-wrong', 'cmd-correct');
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = 'ko-KR';
  u.rate   = 1.0 + (BASE_CMD_TIME - gs.cmdTime) / BASE_CMD_TIME * 0.5;
  u.pitch  = 1.2;
  window.speechSynthesis.speak(u);
}

function startTimer(duration) {
  cancelAnimationFrame(gs.timerRafId);
  const bar = $('command-timer');
  if (!bar) return;
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    const pct     = Math.max(0, 1 - elapsed / duration);
    bar.style.width = (pct * 100) + '%';
    bar.style.backgroundColor = pct > 0.4 ? '#3B82F6' : '#EF4444';
    if (pct > 0 && gs.active) gs = { ...gs, timerRafId: requestAnimationFrame(frame) };
  }
  gs = { ...gs, timerRafId: requestAnimationFrame(frame) };
}

// ===========================
// FLAG ACTIONS & SVG ANIMATION
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
  const armBlue  = $('arm-blue');
  const armWhite = $('arm-white');
  
  if(armBlue) {
    armBlue.classList.remove('arm-down', 'arm-up', 'arm-middle');
    armBlue.classList.add('arm-' + gs.flagState.blue);
  }
  if(armWhite) {
    armWhite.classList.remove('arm-down', 'arm-up', 'arm-middle');
    armWhite.classList.add('arm-' + gs.flagState.white);
  }
}

// ===========================
// REACTIONS
// ===========================
function triggerReaction(type) {
  const body = $('rabbit-body');
  if (!body) return;
  body.classList.remove('rabbit-shock', 'rabbit-happy');
  void body.offsetWidth; // force reflow
  body.classList.add(`rabbit-${type}`);
}

function flashCmd(cls) {
  const el = $('command-text');
  el.classList.remove('cmd-wrong', 'cmd-correct');
  void el.offsetWidth;
  el.classList.add(cls);
}

// ===========================
// CORRECT / MISTAKE
// ===========================
function correct() {
  const score = gs.score + 10 + gs.round;
  gs = { ...gs, score };
  $('score-display').textContent = `SCORE ${score}`;
  
  triggerReaction('happy');
  flashCmd('cmd-correct');
  
  setTimeout(nextCommand, 400);
}

function mistake() {
  if (!gs.active) return;
  const myLives = gs.myLives - 1;
  gs = { ...gs, myLives };
  
  renderHearts('hearts-me', myLives);
  triggerReaction('shock');
  flashCmd('cmd-wrong');
  
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

// ===========================
// HEARTS
// ===========================
function renderHearts(containerId, lives) {
  const container = $(containerId);
  if(!container) return;
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
    : `${gs.round}라운드에서 토끼가 헷갈려버렸습니다.`;

  $('result-stats').innerHTML = `
    <div class="bg-black/30 rounded-2xl p-4 border border-white/5">
      <div class="text-sm text-white/40 mb-1">최종 점수</div>
      <div class="text-3xl font-bold text-blue-400">${gs.score}</div>
    </div>
    <div class="bg-black/30 rounded-2xl p-4 border border-white/5">
      <div class="text-sm text-white/40 mb-1">최대 라운드</div>
      <div class="text-3xl font-bold text-white">${gs.round}</div>
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
    $('waiting-title').textContent           = '코드가 생성되었습니다';
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
  $('waiting-desc').textContent     = '연결을 시도하는 중입니다...';

  const peer = new Peer(undefined, { debug: 1 });
  gs = { ...gs, peer, isHost: false };

  peer.on('open', () => {
    const conn = peer.connect(hostId, { reliable: true });
    gs = { ...gs, conn };
    setupConn(conn);
    conn.on('open', () => {
      $('waiting-title').textContent = '연결 성공! 시작을 기다립니다.';
      $('waiting-desc').textContent  = '호스트가 게임을 시작할 때까지 대기해주세요';
    });
  });

  peer.on('error', err => {
    toast('연결 실패 (' + err.type + ') 코드를 확인해주세요.');
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
  $('hud-opponent').classList.remove('opacity-0');
  $('vs-badge').classList.remove('opacity-0');
  initGame();
  showScreen('screen-game');

  if (gs.isHost) {
    gs.conn.send({ type: 'start' });
    startCountdown(beginLoop);
  }
}

function startMultiClient() {
  gs = { ...gs, mode: 'multi' };
  $('hud-opponent').classList.remove('opacity-0');
  $('vs-badge').classList.remove('opacity-0');
  initGame();
  showScreen('screen-game');
  startCountdown(() => { gs = { ...gs, active: true }; });
}
