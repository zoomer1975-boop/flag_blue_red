# 청기백기 게임 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 계명대학교 통계학과 오락연구소 브랜딩의 청기백기 게임 — 싱글/1v1 온라인(PeerJS), TTS+텍스트 명령, 하트 3개제

**Architecture:** 단일 HTML 페이지에 5개 화면(홈/로비/대기/게임/결과)을 JS로 show/hide. 멀티플레이어는 PeerJS P2P로 호스트가 명령을 생성해 게스트에게 실시간 전송. 양쪽이 각자 실수 감지 후 상대에게 알림.

**Tech Stack:** Vanilla JS ES6+, CSS3 animations, Web Speech API (TTS), PeerJS CDN, Google Fonts (Pretendard)

---

## 파일 구조

```
flag_blue_red/
├── index.html
├── style.css
└── game.js
```

---

## Task 1: HTML 뼈대

**Files:**
- Create: `index.html`

**Step 1: index.html 작성 — CDN + 5개 화면 마크업**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>청기백기 — 계명대 통계학과 오락연구소</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- 화면 1: 홈 -->
  <div id="screen-home" class="screen active">
    <div class="logo">
      <div class="logo-sub">계명대학교 통계학과 오락연구소</div>
      <h1 class="logo-title">청기<span class="white">백기</span></h1>
    </div>
    <div class="mode-buttons">
      <button class="btn btn-blue" id="btn-single">🙋 싱글 플레이</button>
      <button class="btn btn-white" id="btn-multi">👥 1v1 온라인</button>
    </div>
    <div class="footer-credit">Keimyung Univ. Dept. of Statistics · Entertainment Lab</div>
  </div>

  <!-- 화면 2: 멀티 로비 -->
  <div id="screen-lobby" class="screen">
    <button class="btn-back" id="lobby-back">← 뒤로</button>
    <h2>1v1 온라인</h2>
    <div class="lobby-options">
      <button class="btn btn-blue" id="btn-create">방 만들기</button>
      <div class="divider">또는</div>
      <div class="join-row">
        <input type="text" id="room-code-input" placeholder="방 코드 입력" maxlength="20">
        <button class="btn btn-white" id="btn-join">참가</button>
      </div>
    </div>
  </div>

  <!-- 화면 3: 대기 -->
  <div id="screen-waiting" class="screen">
    <h2 id="waiting-title">방 생성 중...</h2>
    <div id="room-code-display" class="room-code"></div>
    <p id="waiting-desc">상대방에게 방 코드를 공유하세요</p>
    <div class="spinner"></div>
    <button class="btn btn-ghost" id="waiting-cancel">취소</button>
  </div>

  <!-- 화면 4: 게임 -->
  <div id="screen-game" class="screen">
    <!-- 상단: 플레이어 정보 -->
    <div class="hud">
      <div class="player-info" id="hud-me">
        <span class="player-label" id="hud-me-label">나</span>
        <div class="hearts" id="hearts-me"></div>
      </div>
      <div class="vs-badge" id="vs-badge">VS</div>
      <div class="player-info right" id="hud-opponent" style="display:none">
        <span class="player-label">상대</span>
        <div class="hearts" id="hearts-opp"></div>
      </div>
    </div>

    <!-- 명령 표시 -->
    <div class="command-area">
      <div class="command-text" id="command-text">준비...</div>
      <div class="command-timer" id="command-timer"></div>
    </div>

    <!-- 깃발 버튼 -->
    <div class="flags">
      <div class="flag-col">
        <div class="flag-visual blue" id="flag-blue-visual">
          <div class="flag-pole"></div>
          <div class="flag-cloth blue-cloth" id="flag-blue-cloth"></div>
        </div>
        <div class="flag-btns">
          <button class="flag-btn up" data-flag="blue" data-action="up" id="btn-blue-up">청기 올리기 ↑</button>
          <button class="flag-btn down" data-flag="blue" data-action="down" id="btn-blue-down">청기 내리기 ↓</button>
        </div>
      </div>
      <div class="flag-col">
        <div class="flag-visual white" id="flag-white-visual">
          <div class="flag-pole"></div>
          <div class="flag-cloth white-cloth" id="flag-white-cloth"></div>
        </div>
        <div class="flag-btns">
          <button class="flag-btn up" data-flag="white" data-action="up" id="btn-white-up">백기 올리기 ↑</button>
          <button class="flag-btn down" data-flag="white" data-action="down" id="btn-white-down">백기 내리기 ↓</button>
        </div>
      </div>
    </div>

    <!-- 라운드/점수 -->
    <div class="round-info">
      <span id="round-display">라운드 1</span>
      <span id="score-display">점수 0</span>
    </div>
  </div>

  <!-- 화면 5: 결과 -->
  <div id="screen-result" class="screen">
    <div class="result-emoji" id="result-emoji">🎉</div>
    <h2 id="result-title">승리!</h2>
    <p id="result-sub"></p>
    <div class="result-stats" id="result-stats"></div>
    <div class="result-buttons">
      <button class="btn btn-blue" id="btn-retry">다시하기</button>
      <button class="btn btn-ghost" id="btn-home">홈으로</button>
    </div>
  </div>

  <script src="game.js"></script>
</body>
</html>
```

**Step 2: 브라우저에서 index.html 열어 마크업 확인**

---

## Task 2: CSS 디자인

**Files:**
- Create: `style.css`

**디자인 토큰:**
```
배경: #0A0E1A (딥 네이비)
청기 색: #1A6FFF
백기 색: #F0F4FF
강조: #FFD700 (골드)
위험: #FF4757
성공: #2ED573
폰트: Noto Sans KR
```

**Step 1: style.css 작성**

```css
/* ===== RESET & BASE ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --blue: #1A6FFF;
  --blue-light: #4D94FF;
  --blue-dark: #0044CC;
  --white-flag: #F0F4FF;
  --gold: #FFD700;
  --danger: #FF4757;
  --success: #2ED573;
  --bg: #0A0E1A;
  --bg-card: #141826;
  --bg-card2: #1C2235;
  --text: #E8EEFF;
  --text-dim: #8892AA;
  --radius: 16px;
  --shadow-blue: 0 0 30px rgba(26,111,255,0.4);
  --shadow-gold: 0 0 20px rgba(255,215,0,0.3);
}

html, body {
  height: 100%;
  font-family: 'Noto Sans KR', sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

/* ===== SCREEN MANAGEMENT ===== */
.screen {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.screen.active {
  opacity: 1;
  pointer-events: all;
  transform: translateY(0);
}

/* ===== HOME SCREEN ===== */
.logo { text-align: center; margin-bottom: 48px; }
.logo-sub {
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--gold);
  text-transform: uppercase;
  margin-bottom: 12px;
  opacity: 0.9;
}
.logo-title {
  font-size: clamp(64px, 15vw, 96px);
  font-weight: 900;
  color: var(--blue-light);
  text-shadow: var(--shadow-blue), 0 0 60px rgba(26,111,255,0.2);
  line-height: 1;
}
.logo-title .white {
  color: var(--white-flag);
  text-shadow: 0 0 30px rgba(240,244,255,0.5);
}

.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 320px;
}

.footer-credit {
  position: fixed;
  bottom: 20px;
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 1px;
}

/* ===== BUTTONS ===== */
.btn {
  padding: 16px 32px;
  border: none;
  border-radius: var(--radius);
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 1px;
}
.btn-blue {
  background: linear-gradient(135deg, var(--blue), var(--blue-dark));
  color: #fff;
  box-shadow: var(--shadow-blue);
}
.btn-blue:hover { transform: translateY(-2px); box-shadow: 0 0 40px rgba(26,111,255,0.6); }
.btn-blue:active { transform: translateY(0); }

.btn-white {
  background: var(--white-flag);
  color: var(--bg);
  box-shadow: 0 4px 20px rgba(240,244,255,0.2);
}
.btn-white:hover { transform: translateY(-2px); background: #fff; }

.btn-ghost {
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--bg-card2);
}
.btn-ghost:hover { color: var(--text); border-color: var(--text-dim); }

.btn-back {
  position: absolute;
  top: 24px;
  left: 24px;
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 16px;
  cursor: pointer;
  font-family: 'Noto Sans KR', sans-serif;
  padding: 8px;
}
.btn-back:hover { color: var(--text); }

/* ===== LOBBY ===== */
#screen-lobby h2 { font-size: 28px; margin-bottom: 40px; }
.lobby-options {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 320px;
}
.divider {
  color: var(--text-dim);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--bg-card2);
}
.join-row { display: flex; gap: 8px; width: 100%; }
.join-row input {
  flex: 1;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--bg-card2);
  background: var(--bg-card);
  color: var(--text);
  font-size: 16px;
  font-family: 'Noto Sans KR', sans-serif;
  outline: none;
  transition: border-color 0.2s;
}
.join-row input:focus { border-color: var(--blue); }
.join-row input::placeholder { color: var(--text-dim); }
.join-row .btn { padding: 14px 20px; font-size: 15px; border-radius: 12px; }

/* ===== WAITING ===== */
#screen-waiting h2 { font-size: 24px; margin-bottom: 24px; }
.room-code {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: 8px;
  color: var(--gold);
  text-shadow: var(--shadow-gold);
  margin-bottom: 12px;
  background: var(--bg-card);
  padding: 16px 32px;
  border-radius: var(--radius);
  border: 1px solid rgba(255,215,0,0.2);
}
#waiting-desc { color: var(--text-dim); margin-bottom: 32px; font-size: 14px; }
.spinner {
  width: 40px; height: 40px;
  border: 3px solid var(--bg-card2);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 32px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== GAME SCREEN ===== */
#screen-game {
  justify-content: space-between;
  padding: 16px 20px 24px;
  gap: 0;
}

/* HUD */
.hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 480px;
  padding: 12px 16px;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--bg-card2);
}
.player-info { display: flex; flex-direction: column; gap: 4px; }
.player-info.right { align-items: flex-end; }
.player-label { font-size: 11px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; }
.hearts { display: flex; gap: 4px; font-size: 20px; }
.heart { transition: all 0.3s ease; }
.heart.lost { filter: grayscale(1); opacity: 0.3; transform: scale(0.8); }
.vs-badge {
  font-size: 13px;
  font-weight: 900;
  color: var(--text-dim);
  letter-spacing: 2px;
}

/* COMMAND AREA */
.command-area {
  text-align: center;
  flex-shrink: 0;
}
.command-text {
  font-size: clamp(28px, 7vw, 44px);
  font-weight: 900;
  color: var(--text);
  min-height: 60px;
  letter-spacing: 2px;
  transition: all 0.15s ease;
  text-shadow: 0 0 20px rgba(232,238,255,0.2);
}
.command-text.flash-correct { color: var(--success); text-shadow: 0 0 20px rgba(46,213,115,0.5); }
.command-text.flash-wrong { color: var(--danger); text-shadow: 0 0 20px rgba(255,71,87,0.5); animation: shake 0.3s ease; }
.command-text.highlight-blue { color: var(--blue-light); }
.command-text.highlight-white { color: var(--white-flag); }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  75% { transform: translateX(8px); }
}

.command-timer {
  height: 4px;
  background: var(--bg-card2);
  border-radius: 2px;
  margin-top: 12px;
  overflow: hidden;
  width: 200px;
  margin: 12px auto 0;
}
.command-timer::after {
  content: '';
  display: block;
  height: 100%;
  background: var(--blue);
  border-radius: 2px;
  transition: width linear;
}

/* FLAGS */
.flags {
  display: flex;
  gap: 24px;
  justify-content: center;
  align-items: flex-end;
  width: 100%;
  max-width: 480px;
}
.flag-col { display: flex; flex-direction: column; align-items: center; gap: 12px; flex: 1; }

/* Flag Visual */
.flag-visual {
  position: relative;
  width: 80px;
  height: 100px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.flag-pole {
  width: 4px;
  height: 90px;
  background: linear-gradient(to bottom, #888, #555);
  border-radius: 2px;
  position: absolute;
  bottom: 0;
}
.flag-cloth {
  position: absolute;
  top: 0;
  left: 50%;
  width: 52px;
  height: 40px;
  border-radius: 4px;
  transform-origin: left center;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.blue-cloth { background: linear-gradient(135deg, var(--blue), var(--blue-dark)); box-shadow: 0 0 16px rgba(26,111,255,0.5); top: 0; }
.white-cloth { background: linear-gradient(135deg, #fff, #d0d8f0); box-shadow: 0 0 16px rgba(240,244,255,0.4); top: 0; }
.flag-cloth.down { top: 50px; transform: rotate(90deg) translateX(-4px); }

/* Flag Buttons */
.flag-btns { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.flag-btn {
  padding: 14px 8px;
  border: none;
  border-radius: 12px;
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  letter-spacing: 0.5px;
}
.flag-btn.up[data-flag="blue"] { background: linear-gradient(135deg, var(--blue), var(--blue-dark)); color: #fff; box-shadow: 0 4px 16px rgba(26,111,255,0.3); }
.flag-btn.down[data-flag="blue"] { background: var(--bg-card2); color: var(--blue-light); border: 1px solid var(--blue-dark); }
.flag-btn.up[data-flag="white"] { background: linear-gradient(135deg, #fff, #d0d8f0); color: var(--bg); box-shadow: 0 4px 16px rgba(240,244,255,0.2); }
.flag-btn.down[data-flag="white"] { background: var(--bg-card2); color: var(--white-flag); border: 1px solid #3a4060; }
.flag-btn:hover { transform: translateY(-2px); }
.flag-btn:active { transform: scale(0.97); }
.flag-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* ROUND INFO */
.round-info {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--text-dim);
  letter-spacing: 1px;
}

/* ===== RESULT SCREEN ===== */
.result-emoji { font-size: 72px; margin-bottom: 16px; }
#result-title { font-size: 42px; font-weight: 900; margin-bottom: 12px; }
#result-sub { color: var(--text-dim); margin-bottom: 24px; font-size: 16px; }
.result-stats {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 20px 32px;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 240px;
  border: 1px solid var(--bg-card2);
}
.stat-row { display: flex; justify-content: space-between; gap: 32px; font-size: 15px; }
.stat-label { color: var(--text-dim); }
.stat-value { font-weight: 700; color: var(--gold); }
.result-buttons { display: flex; gap: 12px; }

/* ===== ANIMATIONS ===== */
@keyframes bounce-in {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
.heart-bounce { animation: bounce-in 0.4s ease; }

/* ===== COUNTDOWN OVERLAY ===== */
.countdown-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10,14,26,0.85);
  z-index: 100;
  font-size: 120px;
  font-weight: 900;
  color: var(--blue-light);
  text-shadow: var(--shadow-blue);
  animation: count-pop 0.8s ease;
}
@keyframes count-pop {
  0% { transform: scale(1.5); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: scale(0.8); opacity: 0; }
}

/* ===== RESPONSIVE ===== */
@media (max-height: 700px) {
  .flag-visual { height: 70px; }
  .flag-pole { height: 64px; }
  .command-text { font-size: 26px; }
}
```

**Step 2: 홈 화면 디자인 확인**

---

## Task 3: 게임 로직 (싱글 플레이)

**Files:**
- Create: `game.js`

**Step 1: 화면 전환 + 명령 생성 + 싱글 게임 루프 작성**

```javascript
// ===========================
// CONSTANTS
// ===========================
const COMMANDS = [
  { text: '청기 올려!',                  actions: [{ flag: 'blue',  action: 'up'   }] },
  { text: '청기 내려!',                  actions: [{ flag: 'blue',  action: 'down' }] },
  { text: '백기 올려!',                  actions: [{ flag: 'white', action: 'up'   }] },
  { text: '백기 내려!',                  actions: [{ flag: 'white', action: 'down' }] },
  { text: '청기 올리지 말고 백기 올려!', actions: [{ flag: 'white', action: 'up'   }], forbidden: [{ flag: 'blue', action: 'up' }] },
  { text: '백기 올리지 말고 청기 올려!', actions: [{ flag: 'blue',  action: 'up'   }], forbidden: [{ flag: 'white', action: 'up' }] },
  { text: '청기 내리지 말고 백기 내려!', actions: [{ flag: 'white', action: 'down' }], forbidden: [{ flag: 'blue', action: 'down' }] },
  { text: '백기 내리지 말고 청기 내려!', actions: [{ flag: 'blue',  action: 'down' }], forbidden: [{ flag: 'white', action: 'down' }] },
  { text: '청기 올리지 말고 백기 내려!', actions: [{ flag: 'white', action: 'down' }], forbidden: [{ flag: 'blue', action: 'up' }] },
  { text: '백기 올리지 말고 청기 내려!', actions: [{ flag: 'blue',  action: 'down' }], forbidden: [{ flag: 'white', action: 'up' }] },
];

const MAX_LIVES = 3;
const BASE_COMMAND_TIME = 3000; // ms
const MIN_COMMAND_TIME  = 1000;
const SPEED_FACTOR      = 0.95; // 라운드마다 5% 빨라짐

// ===========================
// STATE
// ===========================
let state = {
  mode: null,            // 'single' | 'multi'
  myLives: MAX_LIVES,
  oppLives: MAX_LIVES,
  round: 0,
  score: 0,
  currentCmd: null,
  cmdTimeout: null,
  cmdInterval: null,
  flagState: { blue: 'down', white: 'down' },  // 현재 깃발 상태
  pendingActions: [],    // 아직 안 한 required actions
  forbiddenDone: false,  // forbidden action 했는지
  cmdTime: BASE_COMMAND_TIME,
  isGameActive: false,
  // PeerJS
  peer: null,
  conn: null,
  isHost: false,
};

// ===========================
// SCREEN MANAGEMENT
// ===========================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===========================
// DOM REFS
// ===========================
const $ = id => document.getElementById(id);

// ===========================
// INIT
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  $('btn-single').onclick = startSingle;
  $('btn-multi').onclick  = () => showScreen('screen-lobby');
  $('lobby-back').onclick = () => showScreen('screen-home');
  $('btn-create').onclick = createRoom;
  $('btn-join').onclick   = joinRoom;
  $('waiting-cancel').onclick = cancelWaiting;
  $('btn-retry').onclick  = retryGame;
  $('btn-home').onclick   = () => showScreen('screen-home');

  document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.isGameActive) return;
      handleFlagAction(btn.dataset.flag, btn.dataset.action);
    });
  });
});

// ===========================
// SINGLE PLAYER
// ===========================
function startSingle() {
  state.mode = 'single';
  $('hud-opponent').style.display = 'none';
  $('vs-badge').style.display = 'none';
  initGame();
  showScreen('screen-game');
  startCountdown(() => beginCommandLoop());
}

// ===========================
// GAME INIT
// ===========================
function initGame() {
  state.myLives   = MAX_LIVES;
  state.oppLives  = MAX_LIVES;
  state.round     = 0;
  state.score     = 0;
  state.cmdTime   = BASE_COMMAND_TIME;
  state.flagState = { blue: 'down', white: 'down' };
  state.isGameActive = false;
  renderHearts('hearts-me', state.myLives);
  if (state.mode === 'multi') renderHearts('hearts-opp', state.oppLives);
  $('round-display').textContent = '라운드 1';
  $('score-display').textContent = '점수 0';
  $('command-text').textContent  = '준비...';
  updateFlagVisuals();
}

// ===========================
// COUNTDOWN
// ===========================
function startCountdown(cb) {
  let count = 3;
  function tick() {
    if (count === 0) { cb(); return; }
    showCountdownOverlay(count === 3 ? '3' : count === 2 ? '2' : '1');
    count--;
    setTimeout(tick, 900);
  }
  tick();
}
function showCountdownOverlay(text) {
  const el = document.createElement('div');
  el.className = 'countdown-overlay';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// ===========================
// COMMAND LOOP
// ===========================
function beginCommandLoop() {
  state.isGameActive = true;
  issueNextCommand();
}

function issueNextCommand() {
  if (!state.isGameActive) return;
  state.round++;
  $('round-display').textContent = `라운드 ${state.round}`;

  // 속도 증가
  if (state.round > 1) state.cmdTime = Math.max(MIN_COMMAND_TIME, state.cmdTime * SPEED_FACTOR);

  const cmd = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
  state.currentCmd      = cmd;
  state.pendingActions  = [...cmd.actions];
  state.forbiddenDone   = false;

  // 멀티면 호스트가 커맨드 전송
  if (state.mode === 'multi' && state.isHost && state.conn) {
    state.conn.send({ type: 'cmd', cmdIndex: COMMANDS.indexOf(cmd) });
  }

  displayCommand(cmd.text);
  speakCommand(cmd.text);

  // 타임아웃: 시간 내 미응답 → 틀림
  clearTimeout(state.cmdTimeout);
  state.cmdTimeout = setTimeout(() => {
    if (!state.isGameActive) return;
    if (state.pendingActions.length > 0) {
      // 아직 안 한 동작 있음 → 실수
      onMistake();
    } else {
      // 다 했음 → 정답 처리 후 다음 명령
      onCorrect();
    }
  }, state.cmdTime);
}

function displayCommand(text) {
  const el = $('command-text');
  el.textContent = text;
  el.className = 'command-text';
  // 청기/백기 색상 강조
  if (text.startsWith('청기') && !text.includes('백기')) el.classList.add('highlight-blue');
  else if (text.startsWith('백기') && !text.includes('청기')) el.classList.add('highlight-white');
}

function speakCommand(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = 'ko-KR';
  utter.rate  = 1.1 + (BASE_COMMAND_TIME - state.cmdTime) / BASE_COMMAND_TIME * 0.4;
  window.speechSynthesis.speak(utter);
}

// ===========================
// FLAG ACTION HANDLING
// ===========================
function handleFlagAction(flag, action) {
  const cmd = state.currentCmd;
  if (!cmd) return;

  // forbidden 체크
  const isForbidden = cmd.forbidden && cmd.forbidden.some(f => f.flag === flag && f.action === action);
  if (isForbidden) {
    state.forbiddenDone = true;
    onMistake();
    return;
  }

  // 현재 상태와 동일한 액션이면 무시 (이미 올라가 있는데 올리기 누름)
  if (state.flagState[flag] === action) return;

  // 깃발 상태 업데이트
  const newFlagState = { ...state.flagState, [flag]: action };
  state.flagState = newFlagState;
  updateFlagVisuals();

  // pending actions 체크
  const idx = state.pendingActions.findIndex(a => a.flag === flag && a.action === action);
  if (idx !== -1) {
    state.pendingActions = state.pendingActions.filter((_, i) => i !== idx);
    if (state.pendingActions.length === 0) {
      // 모든 required action 완료
      clearTimeout(state.cmdTimeout);
      onCorrect();
    }
  } else {
    // required action 아닌 다른 것 눌렀음
    onMistake();
  }
}

function updateFlagVisuals() {
  const blueCloth  = document.querySelector('#flag-blue-visual .flag-cloth');
  const whiteCloth = document.querySelector('#flag-white-visual .flag-cloth');
  if (blueCloth)  blueCloth.classList.toggle('down',  state.flagState.blue  === 'down');
  if (whiteCloth) whiteCloth.classList.toggle('down', state.flagState.white === 'down');
}

// ===========================
// CORRECT / MISTAKE
// ===========================
function onCorrect() {
  state.score += 10 + state.round;
  $('score-display').textContent = `점수 ${state.score}`;
  flashCommand('flash-correct');
  setTimeout(() => issueNextCommand(), 400);
}

function onMistake() {
  state.myLives--;
  renderHearts('hearts-me', state.myLives);
  flashCommand('flash-wrong');

  // 멀티: 상대에게 알림
  if (state.mode === 'multi' && state.conn) {
    state.conn.send({ type: 'mistake' });
  }

  if (state.myLives <= 0) {
    endGame(false);
  } else {
    setTimeout(() => issueNextCommand(), 800);
  }
}

function flashCommand(cls) {
  const el = $('command-text');
  el.className = `command-text ${cls}`;
}

// ===========================
// HEARTS
// ===========================
function renderHearts(containerId, lives) {
  const el = $(containerId);
  el.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const heart = document.createElement('span');
    heart.className = 'heart' + (i >= lives ? ' lost' : ' heart-bounce');
    heart.textContent = '❤️';
    el.appendChild(heart);
  }
}

// ===========================
// GAME END
// ===========================
function endGame(isWin, isDraw = false) {
  state.isGameActive = false;
  clearTimeout(state.cmdTimeout);
  window.speechSynthesis && window.speechSynthesis.cancel();

  $('result-emoji').textContent  = isDraw ? '🤝' : isWin ? '🏆' : '💀';
  $('result-title').textContent  = isDraw ? '무승부!' : isWin ? '승리!' : '패배...';
  $('result-sub').textContent    = isWin
    ? `대단해요! ${state.round}라운드까지 버텼습니다.`
    : `아쉽네요. ${state.round}라운드에서 탈락했습니다.`;

  $('result-stats').innerHTML = `
    <div class="stat-row"><span class="stat-label">최종 점수</span><span class="stat-value">${state.score}</span></div>
    <div class="stat-row"><span class="stat-label">최대 라운드</span><span class="stat-value">${state.round}</span></div>
  `;
  showScreen('screen-result');
}

function retryGame() {
  if (state.mode === 'single') startSingle();
  else showScreen('screen-lobby');
}

// ===========================
// PEERJS MULTIPLAYER
// ===========================
function createRoom() {
  showScreen('screen-waiting');
  $('waiting-title').textContent = '방 생성 중...';
  $('room-code-display').textContent = '';
  $('waiting-desc').textContent = '잠시만 기다려주세요...';

  const peer = new Peer();
  state.peer   = peer;
  state.isHost = true;

  peer.on('open', id => {
    // 6자리 코드로 축약 (PeerJS ID 앞 6자)
    const code = id.slice(0, 6).toUpperCase();
    $('waiting-title').textContent       = '방 코드';
    $('room-code-display').textContent   = code;
    $('waiting-desc').textContent        = '상대방에게 이 코드를 공유하세요';
    // 전체 peer ID를 data-full에 저장
    $('room-code-display').dataset.fullId = id;
  });

  peer.on('connection', conn => {
    state.conn = conn;
    setupConnection(conn);
    $('waiting-title').textContent = '상대방 연결됨!';
    setTimeout(() => startMulti(), 1000);
  });

  peer.on('error', err => {
    alert('연결 오류: ' + err.message);
    showScreen('screen-lobby');
  });
}

function joinRoom() {
  const code = $('room-code-input').value.trim();
  if (!code) return;

  showScreen('screen-waiting');
  $('waiting-title').textContent   = '연결 중...';
  $('room-code-display').textContent = '';
  $('waiting-desc').textContent    = '상대방 방에 연결 중입니다...';

  const peer = new Peer();
  state.peer   = peer;
  state.isHost = false;

  peer.on('open', () => {
    // 코드로 호스트 찾기: 호스트 목록 API로 full ID 검색는 불가,
    // 따라서 유저가 full peer ID를 입력하는 방식으로 단순화
    const conn = peer.connect(code);
    state.conn = conn;
    setupConnection(conn);
    conn.on('open', () => {
      $('waiting-title').textContent = '연결 성공!';
    });
  });

  peer.on('error', err => {
    alert('연결 실패: ' + err.message);
    showScreen('screen-lobby');
  });
}

function cancelWaiting() {
  if (state.peer) { state.peer.destroy(); state.peer = null; }
  showScreen('screen-lobby');
}

function setupConnection(conn) {
  conn.on('data', data => {
    if (data.type === 'cmd' && !state.isHost) {
      // 게스트: 호스트로부터 명령 받음
      const cmd = COMMANDS[data.cmdIndex];
      state.currentCmd     = cmd;
      state.pendingActions = [...cmd.actions];
      state.forbiddenDone  = false;
      displayCommand(cmd.text);
      speakCommand(cmd.text);
      clearTimeout(state.cmdTimeout);
      state.cmdTimeout = setTimeout(() => {
        if (state.pendingActions.length > 0) onMistake();
        else onCorrect();
      }, state.cmdTime);
    }
    if (data.type === 'mistake') {
      // 상대방이 실수
      state.oppLives--;
      renderHearts('hearts-opp', state.oppLives);
      if (state.oppLives <= 0) endGame(true);
    }
    if (data.type === 'start') {
      startMultiGame();
    }
  });

  conn.on('close', () => {
    if (state.isGameActive) {
      alert('상대방 연결이 끊어졌습니다.');
      showScreen('screen-home');
    }
  });
}

function startMulti() {
  state.mode = 'multi';
  $('hud-opponent').style.display = '';
  $('vs-badge').style.display = '';
  initGame();
  showScreen('screen-game');

  if (state.isHost) {
    // 호스트가 start 신호 보냄
    state.conn.send({ type: 'start' });
    startMultiGame();
  }
}

function startMultiGame() {
  startCountdown(() => beginCommandLoop());
}
```

**Step 2: 싱글 플레이 테스트**
- `index.html` 브라우저에서 열기
- 싱글 플레이 → 3회 실수 → 결과 화면 확인
- TTS 음성 동작 확인

---

## Task 4: 멀티플레이어 테스트 & 폴리싱

**Step 1: 멀티 연결 테스트**
- 브라우저 두 탭에서 열기
- 탭1: 방 만들기 → 코드 확인
- 탭2: 코드 입력 → 참가
- 동시에 같은 명령 오는지 확인

**Step 2: 엣지케이스 처리 확인**
- 이미 올려진 깃발 다시 올리기 시도 → 무반응 (중복 처리)
- 게임 중 연결 끊김 → 알림 후 홈으로
- TTS 없는 환경 → 텍스트만으로도 플레이 가능 확인

---

## Task 5: 브랜딩 & 최종 폴리싱

**Step 1: 홈화면에 배경 파티클/애니메이션 추가**

`game.js` 하단에 추가:
```javascript
// ===========================
// HOME SCREEN DECORATION
// ===========================
function initHomeDecoration() {
  const screen = $('screen-home');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.15;';
  screen.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width  = screen.offsetWidth;
    H = canvas.height = screen.offsetHeight;
  }

  function createParticles() {
    return Array.from({ length: 30 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.5 ? '#1A6FFF' : '#F0F4FF',
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      p.y -= p.speed;
      if (p.y < 0) { p.y = H; p.x = Math.random() * W; }
    });
    requestAnimationFrame(draw);
  }

  resize();
  particles = createParticles();
  window.addEventListener('resize', () => { resize(); particles = createParticles(); });
  draw();
}

// DOMContentLoaded에 추가
document.addEventListener('DOMContentLoaded', () => {
  // ... 기존 코드 ...
  initHomeDecoration();
});
```

**Step 2: 최종 확인 체크리스트**
- [ ] 홈 화면 브랜딩 ("계명대학교 통계학과 오락연구소") 표시
- [ ] 싱글: 라운드 진행하며 속도 증가
- [ ] 싱글: 3회 실수 → 결과
- [ ] 멀티: 방 생성/참가 → 동시 게임
- [ ] TTS 음성 출력
- [ ] 깃발 애니메이션 동작
- [ ] 모바일 터치 동작

---

## 실행 방법

브라우저에서 `index.html` 직접 열기 (서버 불필요)

> **참고:** PeerJS 멀티플레이어는 HTTPS 환경이나 localhost에서 동작. 로컬 테스트 시 `npx serve .` 또는 VS Code Live Server 사용.
