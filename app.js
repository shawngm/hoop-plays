const STORAGE_KEY = 'hoopPlays.v1';
const svg = document.getElementById('court');
const pathLayer = document.getElementById('pathLayer');
const playerLayer = document.getElementById('playerLayer');
const ballLayer = document.getElementById('ballLayer');
const playNameInput = document.getElementById('playName');
const stepsList = document.getElementById('stepsList');
const selectedInfo = document.getElementById('selectedInfo');
const savedPlaysSelect = document.getElementById('savedPlays');
const povPlayerSelect = document.getElementById('povPlayer');
const povOutput = document.getElementById('povOutput');

const defaultPlayers = {
  1: { x: 50, y: 76 },
  2: { x: 24, y: 67 },
  3: { x: 76, y: 67 },
  4: { x: 32, y: 43 },
  5: { x: 50, y: 37 }
};

let state = {
  name: '',
  mode: 'select',
  selectedPlayer: null,
  awaiting: null,
  ball: '1',
  players: structuredClone(defaultPlayers),
  steps: []
};

let drag = null;
let replaying = false;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function courtPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const screenCTM = svg.getScreenCTM();
  if (!screenCTM) return { x: 50, y: 50 };
  const svgPoint = pt.matrixTransform(screenCTM.inverse());
  return {
    x: Math.max(4, Math.min(96, svgPoint.x)),
    y: Math.max(5, Math.min(93, svgPoint.y))
  };
}

function makeSvg(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function setMode(mode) {
  if (replaying) return;
  state.mode = mode;
  state.awaiting = null;
  state.selectedPlayer = null;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  updateSelectedInfo();
  render();
}

function updateSelectedInfo() {
  const labels = {
    select: 'Drag players',
    cut: state.selectedPlayer ? `P${state.selectedPlayer}: tap destination` : 'Tap cutter',
    pass: state.awaiting === 'receiver' ? 'Tap receiver' : 'Tap passer',
    screen: state.selectedPlayer ? `P${state.selectedPlayer}: tap screen spot` : 'Tap screener',
    ball: 'Tap ball handler'
  };
  selectedInfo.textContent = labels[state.mode] || 'Select player';
}

function render() {
  renderPaths();
  renderPlayers();
  renderBall();
  renderSteps();
  updateSelectedInfo();
  renderSavedPlays();
  renderPov();
}

function renderPlayers() {
  playerLayer.innerHTML = '';
  Object.entries(state.players).forEach(([num, pos]) => {
    const group = makeSvg('g', { class: `player ${state.selectedPlayer === num ? 'selected' : ''}`, 'data-player': num });
    group.appendChild(makeSvg('circle', { cx: pos.x, cy: pos.y, r: 4.8 }));
    const text = makeSvg('text', { x: pos.x, y: pos.y + .1 });
    text.textContent = num;
    group.appendChild(text);
    group.addEventListener('pointerdown', onPlayerPointerDown);
    group.addEventListener('click', onPlayerClick);
    playerLayer.appendChild(group);
  });
}

function renderBall() {
  ballLayer.innerHTML = '';
  const pos = state.players[state.ball];
  if (!pos) return;
  const ball = makeSvg('circle', { class: 'ball', cx: pos.x + 5.1, cy: pos.y - 4.4, r: 2.15 });
  ballLayer.appendChild(ball);
}

function renderPaths() {
  pathLayer.innerHTML = '';
  state.steps.forEach((step, index) => {
    if (step.type === 'cut') {
      pathLayer.appendChild(makeSvg('path', {
        class: 'path',
        d: `M ${step.from.x} ${step.from.y} L ${step.to.x} ${step.to.y}`
      }));
      pathLayer.appendChild(makeSvg('circle', { class: 'step-dot', cx: step.to.x, cy: step.to.y, r: 1.35 }));
    }
    if (step.type === 'pass') {
      const from = state.players[step.fromPlayer] || step.from;
      const to = state.players[step.toPlayer] || step.to;
      pathLayer.appendChild(makeSvg('path', {
        class: 'path pass-path',
        d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`
      }));
    }
    if (step.type === 'screen') {
      pathLayer.appendChild(makeSvg('path', {
        class: 'path',
        d: `M ${step.from.x} ${step.from.y} L ${step.to.x} ${step.to.y}`
      }));
      pathLayer.appendChild(makeSvg('line', { class: 'screen-mark', x1: step.to.x - 3, y1: step.to.y - 3, x2: step.to.x + 3, y2: step.to.y + 3 }));
      pathLayer.appendChild(makeSvg('line', { class: 'screen-mark', x1: step.to.x + 3, y1: step.to.y - 3, x2: step.to.x - 3, y2: step.to.y + 3 }));
    }
    const dot = makeSvg('text', { x: step.labelX || 6, y: step.labelY || 8 + index * 4, fill: '#111827', 'font-size': '3.4', 'font-weight': '900' });
    dot.textContent = index + 1;
    pathLayer.appendChild(dot);
  });
}

function renderSteps() {
  stepsList.innerHTML = '';
  if (!state.steps.length) {
    const li = document.createElement('li');
    li.textContent = 'No steps yet. Add a cut, pass, or screen.';
    stepsList.appendChild(li);
    return;
  }
  state.steps.forEach((step, i) => {
    const li = document.createElement('li');
    if (step.type === 'cut') li.innerHTML = `<strong>${i + 1}. P${step.player} cut</strong> to new spot`;
    if (step.type === 'pass') li.innerHTML = `<strong>${i + 1}. Pass</strong> P${step.fromPlayer} to P${step.toPlayer}`;
    if (step.type === 'screen') li.innerHTML = `<strong>${i + 1}. P${step.player} screen</strong> at marked spot`;
    stepsList.appendChild(li);
  });
}

function onPlayerPointerDown(evt) {
  if (state.mode !== 'select' || replaying) return;
  const player = evt.currentTarget.dataset.player;
  state.selectedPlayer = player;
  const start = courtPoint(evt);
  const original = clone(state.players[player]);
  drag = { player, start, original };
  svg.setPointerCapture(evt.pointerId);
  render();
}

function onPlayerClick(evt) {
  evt.stopPropagation();
  if (replaying) return;
  const player = evt.currentTarget.dataset.player;

  if (state.mode === 'ball') {
    state.ball = player;
    render();
    return;
  }

  if (state.mode === 'cut') {
    state.selectedPlayer = player;
    updateSelectedInfo();
    render();
    return;
  }

  if (state.mode === 'screen') {
    state.selectedPlayer = player;
    updateSelectedInfo();
    render();
    return;
  }

  if (state.mode === 'pass') {
    if (!state.selectedPlayer) {
      state.selectedPlayer = player;
      state.awaiting = 'receiver';
    } else if (state.selectedPlayer !== player) {
      state.steps.push({
        type: 'pass',
        fromPlayer: state.selectedPlayer,
        toPlayer: player,
        from: clone(state.players[state.selectedPlayer]),
        to: clone(state.players[player]),
        labelX: (state.players[state.selectedPlayer].x + state.players[player].x) / 2,
        labelY: (state.players[state.selectedPlayer].y + state.players[player].y) / 2
      });
      state.ball = player;
      state.selectedPlayer = null;
      state.awaiting = null;
    }
    render();
  }
}

svg.addEventListener('pointermove', evt => {
  if (!drag || replaying) return;
  const now = courtPoint(evt);
  const dx = now.x - drag.start.x;
  const dy = now.y - drag.start.y;
  state.players[drag.player] = {
    x: Math.max(5, Math.min(95, drag.original.x + dx)),
    y: Math.max(5, Math.min(92, drag.original.y + dy))
  };
  render();
});

svg.addEventListener('pointerup', evt => {
  if (drag) {
    try { svg.releasePointerCapture(evt.pointerId); } catch (err) {}
  }
  drag = null;
});

svg.addEventListener('click', evt => {
  if (evt.target.closest && evt.target.closest('.player')) return;
  if (replaying) return;
  const point = courtPoint(evt);

  if (state.mode === 'cut' && state.selectedPlayer) {
    const from = clone(state.players[state.selectedPlayer]);
    state.players[state.selectedPlayer] = point;
    state.steps.push({
      type: 'cut',
      player: state.selectedPlayer,
      from,
      to: clone(point),
      labelX: (from.x + point.x) / 2,
      labelY: (from.y + point.y) / 2
    });
    state.selectedPlayer = null;
    render();
  }

  if (state.mode === 'screen' && state.selectedPlayer) {
    const from = clone(state.players[state.selectedPlayer]);
    state.players[state.selectedPlayer] = point;
    state.steps.push({
      type: 'screen',
      player: state.selectedPlayer,
      from,
      to: clone(point),
      labelX: point.x + 4,
      labelY: point.y - 4
    });
    state.selectedPlayer = null;
    render();
  }
});

function getStoredPlays() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function setStoredPlays(plays) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plays));
}

function savePlay() {
  const name = playNameInput.value.trim() || `Untitled Play ${new Date().toLocaleDateString()}`;
  state.name = name;
  const plays = getStoredPlays();
  const playData = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    ball: state.ball,
    players: clone(state.players),
    steps: clone(state.steps),
    updatedAt: new Date().toISOString()
  };
  const existingIndex = plays.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  if (existingIndex >= 0) plays[existingIndex] = { ...plays[existingIndex], ...playData, id: plays[existingIndex].id };
  else plays.push(playData);
  setStoredPlays(plays);
  renderSavedPlays(name);
}

function renderSavedPlays(selectedName = savedPlaysSelect.value) {
  const plays = getStoredPlays().sort((a, b) => a.name.localeCompare(b.name));
  savedPlaysSelect.innerHTML = '';
  if (!plays.length) {
    const opt = document.createElement('option');
    opt.textContent = 'No saved plays yet';
    opt.value = '';
    savedPlaysSelect.appendChild(opt);
    return;
  }
  plays.forEach(play => {
    const opt = document.createElement('option');
    opt.value = play.id;
    opt.textContent = play.name;
    if (play.name === selectedName || play.id === selectedName) opt.selected = true;
    savedPlaysSelect.appendChild(opt);
  });
}

function loadPlay() {
  const id = savedPlaysSelect.value;
  const play = getStoredPlays().find(p => p.id === id);
  if (!play) return;
  state = {
    ...state,
    name: play.name,
    mode: 'select',
    selectedPlayer: null,
    awaiting: null,
    ball: play.ball,
    players: clone(play.players),
    steps: clone(play.steps)
  };
  playNameInput.value = play.name;
  setMode('select');
  render();
}

function deletePlay() {
  const id = savedPlaysSelect.value;
  if (!id) return;
  const plays = getStoredPlays().filter(p => p.id !== id);
  setStoredPlays(plays);
  render();
}

function newPlay() {
  playNameInput.value = '';
  state = {
    name: '',
    mode: 'select',
    selectedPlayer: null,
    awaiting: null,
    ball: '1',
    players: structuredClone(defaultPlayers),
    steps: []
  };
  setMode('select');
  render();
}

function clearSteps() {
  state.steps = [];
  render();
}

function resetReplay() {
  const play = getStoredPlays().find(p => p.name === state.name || p.id === savedPlaysSelect.value);
  if (play) {
    state.players = clone(play.players);
    state.ball = play.ball;
  }
  render();
}

function animateMove(player, to, duration = 650) {
  return new Promise(resolve => {
    const from = clone(state.players[player]);
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      state.players[player] = {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased
      };
      renderPlayers();
      renderBall();
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function replay() {
  if (replaying || !state.steps.length) return;
  replaying = true;
  const startingPlayers = {};
  Object.keys(defaultPlayers).forEach(num => {
    const firstStep = state.steps.find(step => (step.type === 'cut' || step.type === 'screen') && step.player === num);
    startingPlayers[num] = firstStep ? clone(firstStep.from) : clone(state.players[num]);
  });
  state.players = startingPlayers;
  const firstPass = state.steps.find(step => step.type === 'pass');
  if (firstPass) state.ball = firstPass.fromPlayer;
  render();
  await pause(250);

  for (const step of state.steps) {
    if (step.type === 'cut' || step.type === 'screen') {
      await animateMove(step.player, step.to, step.type === 'screen' ? 520 : 700);
    }
    if (step.type === 'pass') {
      state.ball = step.fromPlayer;
      renderBall();
      await pause(180);
      state.ball = step.toPlayer;
      renderBall();
      await pause(280);
    }
  }
  replaying = false;
}

function renderPov() {
  const p = povPlayerSelect.value;
  const playerSteps = state.steps.filter(step => step.player === p || step.fromPlayer === p || step.toPlayer === p);
  const withBall = state.ball === p ? 'You start with the ball.' : `Ball starts with Player ${state.ball}.`;
  let html = `<p><strong>Player ${p} view:</strong> ${withBall}</p>`;
  if (!playerSteps.length) {
    html += '<p>No assigned movement yet. Add a cut, pass, or screen involving this player.</p>';
  } else {
    playerSteps.forEach((step, index) => {
      if (step.type === 'cut') html += `<p>${index + 1}. Cut hard to the marked spot. Sell your setup before you go.</p>`;
      if (step.type === 'screen') html += `<p>${index + 1}. Go set the screen, arrive balanced, then be ready to slip or space.</p>`;
      if (step.type === 'pass' && step.fromPlayer === p) html += `<p>${index + 1}. Deliver the pass to Player ${step.toPlayer}, then move or space.</p>`;
      if (step.type === 'pass' && step.toPlayer === p) html += `<p>${index + 1}. Get ready to receive from Player ${step.fromPlayer}. Show hands and meet the pass.</p>`;
    });
  }
  povOutput.innerHTML = html;
}

document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
document.getElementById('savePlayBtn').addEventListener('click', savePlay);
document.getElementById('loadPlayBtn').addEventListener('click', loadPlay);
document.getElementById('deletePlayBtn').addEventListener('click', deletePlay);
document.getElementById('newPlayBtn').addEventListener('click', newPlay);
document.getElementById('clearStepsBtn').addEventListener('click', clearSteps);
document.getElementById('replayBtn').addEventListener('click', replay);
document.getElementById('resetReplayBtn').addEventListener('click', resetReplay);
povPlayerSelect.addEventListener('change', renderPov);

document.getElementById('helpBtn').addEventListener('click', () => document.getElementById('helpDialog').showModal());
document.getElementById('closeHelpBtn').addEventListener('click', () => document.getElementById('helpDialog').close());

window.addEventListener('gesturestart', evt => evt.preventDefault());
render();
