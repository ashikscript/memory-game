// Mixed card types: football/sports, sweets/chocolate, fruits, nature, misc fun
const EMOJIS = [
  // ⚽ Football & Sports
  '⚽','🏀','🎾','🏈','🎱','🏓','🥊','🏆',
  // 🍫 Sweets & Chocolate
  '🍫','🍬','🍭','🍩','🍪','🧁','🍰','🎂',
  // 🍓 Fruits
  '🍓','🍋','🍇','🍑','🥭','🍍','🫐','🍌',
  // 🌟 Fun misc
  '🎯','🎲','🎪','🎠','🚀','💎','🔥','🌊'
];

let gameMode = 'single';
let difficulty = 'easy';
let gridCols = 4;
let gridRows = 5;
let currentPlayer = 1;
let scores = { 1: 0, 2: 0 };
let flipped = [];
let matched = [];
let locked = false;
let cards = [];
let botMemory = {};
let lastMode = 'single';

function setDiff(d) {
  difficulty = d;
  document.querySelectorAll('[id^=diff-]').forEach(b => b.classList.remove('selected'));
  document.getElementById('diff-' + d).classList.add('selected');
}

function setGrid(r) {
  gridCols = 4;
  gridRows = r;
  ['4x5','4x6','6x7'].forEach(x => {
    const el = document.getElementById('grid-'+x);
    if (el) el.classList.remove('selected');
  });
  document.getElementById('grid-4x' + r).classList.add('selected');
}

function setGrid67() {
  gridCols = 6;
  gridRows = 7;
  ['4x5','4x6','6x7'].forEach(x => {
    const el = document.getElementById('grid-'+x);
    if (el) el.classList.remove('selected');
  });
  document.getElementById('grid-6x7').classList.add('selected');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showMenu() {
  const currentScreen = document.querySelector('.screen.active');
  if (currentScreen && currentScreen.id === 'gameScreen') {
    const confirmed = confirm('⚠️ সত্যিই মেনুতে ফিরে যেতে চাও?\nখেলার সব অগ্রগতি মুছে যাবে!');
    if (!confirmed) return;
  }
  showScreen('menuScreen');
}

function startGame(mode) {
  gameMode = mode;
  lastMode = mode;
  currentPlayer = 1;
  scores = { 1: 0, 2: 0 };
  flipped = [];
  matched = [];
  locked = false;
  botMemory = {};

  const total = gridCols * gridRows;
  const pairs = Math.floor(total / 2);
  const pool = EMOJIS.slice(0, pairs);
  const deck = [...pool, ...pool];
  // If odd total (5x7=35), add one bonus card
  if (total % 2 !== 0) deck.push('⭐');
  deck.sort(() => Math.random() - 0.5);
  cards = deck;

  const p1 = document.getElementById('p1Name').value || 'খেলোয়াড় ১';
  const p2 = document.getElementById('p2Name').value || 'খেলোয়াড় ২';

  document.getElementById('p1Label').textContent = p1;
  document.getElementById('p2Label').textContent = mode === 'bot' ? '🤖 বট' : p2;
  document.getElementById('p1Score').textContent = '০';
  document.getElementById('p2Score').textContent = '০';
  document.getElementById('pairsLeft').textContent = pairs;

  // Style p2
  const p2Info = document.getElementById('p2Info');
  p2Info.className = mode === 'bot' ? 'player-info bot-info' : 'player-info p2';

  updateTurnUI();
  renderGrid();
  showScreen('gameScreen');
  setStatus('খেলা শুরু হয়েছে! কার্ড উল্টাও 🎮');
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const total = gridCols * gridRows;
  grid.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
  grid.innerHTML = '';

  for (let i = 0; i < total; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = i;
    card.innerHTML = `<div class="card-inner"><div class="card-back"></div><div class="card-front">${cards[i]}</div></div>`;
    card.addEventListener('click', () => onCardClick(i));
    grid.appendChild(card);
  }
}

function onCardClick(idx) {
  if (locked) return;
  if (gameMode === 'bot' && currentPlayer === 2) return;
  if (matched.includes(idx) || flipped.includes(idx)) return;

  flipCard(idx);
  flipped.push(idx);

  if (flipped.length === 2) {
    locked = true;
    const [a, b] = flipped;
    botMemory[a] = cards[a];
    botMemory[b] = cards[b];

    if (cards[a] === cards[b]) {
      handleMatch(a, b);
    } else {
      setTimeout(() => {
        unflipCard(a);
        unflipCard(b);
        flipped = [];
        locked = false;
        switchPlayer();
        if (gameMode === 'bot' && currentPlayer === 2) {
          setTimeout(botTurn, 600);
        }
      }, 900);
    }
  } else {
    botMemory[idx] = cards[idx];
  }
}

function handleMatch(a, b) {
  matched.push(a, b);
  scores[currentPlayer]++;
  updateScoreUI();

  const pairs = (gridCols * gridRows) / 2;
  document.getElementById('pairsLeft').textContent = pairs - matched.length / 2;

  const name = currentPlayer === 1
    ? document.getElementById('p1Label').textContent
    : document.getElementById('p2Label').textContent;
  setStatus(`✅ <span>${name}</span> একটি জোড়া পেয়েছে! +১ পয়েন্ট 🎉`);

  // Flip face-up first, then fly away
  const elA = getCardEl(a);
  const elB = getCardEl(b);
  elA.classList.add('matched');
  elB.classList.add('matched');

  setTimeout(() => {
    elA.classList.add('fly-away');
    elB.classList.add('fly-away');
    setTimeout(() => {
      elA.classList.add('gone');
      elB.classList.add('gone');
      flipped = [];
      locked = false;

      if (matched.length === gridCols * gridRows) {
        setTimeout(showResult, 300);
        return;
      }
      if (gameMode === 'bot' && currentPlayer === 2) {
        setTimeout(botTurn, 500);
      }
    }, 560);
  }, 300);
}

function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnUI();
  const name = currentPlayer === 1
    ? document.getElementById('p1Label').textContent
    : document.getElementById('p2Label').textContent;
  setStatus(`🎯 <span>${name}</span> এর পালা`);
}

function updateTurnUI() {
  const p1Info = document.getElementById('p1Info');
  const p2Info = document.getElementById('p2Info');
  p1Info.classList.toggle('active-turn', currentPlayer === 1);
  p2Info.classList.toggle('active-turn', currentPlayer === 2);
}

function updateScoreUI() {
  document.getElementById('p1Score').textContent = toBengaliNum(scores[1]);
  document.getElementById('p2Score').textContent = toBengaliNum(scores[2]);
}

function toBengaliNum(n) {
  return n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
}

function flipCard(idx) { getCardEl(idx).classList.add('flipped'); }
function unflipCard(idx) { getCardEl(idx).classList.remove('flipped'); }
function getCardEl(idx) { return document.querySelector(`.card[data-index="${idx}"]`); }

function setStatus(html) {
  document.getElementById('statusBar').innerHTML = html;
}

// BOT LOGIC
function botTurn() {
  if (matched.length === gridCols * gridRows) return;

  const total = gridCols * gridRows;
  const available = Array.from({length: total}, (_,i)=>i).filter(i => !matched.includes(i));

  document.getElementById('botThinking').style.display = 'block';

  // Bot memory: look for known pairs
  let pick1 = -1, pick2 = -1;

  if (difficulty !== 'easy') {
    // Check memory for known matching pair
    const known = Object.entries(botMemory).filter(([i]) => !matched.includes(+i));
    const grouped = {};
    known.forEach(([i, v]) => {
      if (!grouped[v]) grouped[v] = [];
      grouped[v].push(+i);
    });
    for (const [v, idxs] of Object.entries(grouped)) {
      if (idxs.length >= 2) {
        pick1 = idxs[0]; pick2 = idxs[1]; break;
      }
    }
  }

  const memoryChance = difficulty === 'medium' ? 0.5 : difficulty === 'hard' ? 0.9 : 0;

  if ((pick1 === -1 || Math.random() > memoryChance) && difficulty !== 'hard') {
    // Random picks
    const shuffled = available.sort(() => Math.random() - 0.5);
    pick1 = shuffled[0];
    pick2 = shuffled[1];
  } else if (pick1 === -1) {
    const shuffled = available.sort(() => Math.random() - 0.5);
    pick1 = shuffled[0];
    pick2 = shuffled[1];
  }

  setTimeout(() => {
    document.getElementById('botThinking').style.display = 'none';
    flipCard(pick1);
    flipped.push(pick1);
    botMemory[pick1] = cards[pick1];

    setTimeout(() => {
      // For hard/medium: after seeing pick1, check memory for match
      if (difficulty !== 'easy' && pick2 !== -1) {
        const known = Object.entries(botMemory).filter(([i]) => !matched.includes(+i) && +i !== pick1);
        const match = known.find(([i, v]) => v === cards[pick1]);
        if (match) pick2 = +match[0];
      }

      flipCard(pick2);
      flipped.push(pick2);
      botMemory[pick2] = cards[pick2];

      setTimeout(() => {
        const [a, b] = flipped;
        if (cards[a] === cards[b]) {
          handleMatch(a, b);
        } else {
          setTimeout(() => {
            unflipCard(a);
            unflipCard(b);
            flipped = [];
            locked = false;
            switchPlayer();
          }, 800);
        }
      }, 700);
    }, 600);
  }, 800);
}

function showResult() {
  const p1Name = document.getElementById('p1Label').textContent;
  const p2Name = document.getElementById('p2Label').textContent;

  let emoji, winner;
  if (gameMode === 'single') {
    emoji = '🎊';
    winner = `${p1Name} জিতেছে ${toBengaliNum(scores[1])} পয়েন্ট নিয়ে!`;
  } else if (scores[1] > scores[2]) {
    emoji = '🏆'; winner = `🎉 ${p1Name} জিতেছে!`;
  } else if (scores[2] > scores[1]) {
    emoji = '🏆'; winner = `🎉 ${p2Name} জিতেছে!`;
  } else {
    emoji = '🤝'; winner = 'ড্র! সমান পয়েন্ট!';
  }

  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultWinner').textContent = winner;

  document.getElementById('resultScores').innerHTML = `
    <div class="score-box">
      <div class="name" style="color:var(--p1)">${p1Name}</div>
      <div class="pts" style="color:var(--p1)">${toBengaliNum(scores[1])}</div>
    </div>
    ${gameMode !== 'single' ? `<div class="score-box">
      <div class="name" style="color:${gameMode==='bot'?'var(--bot)':'var(--p2)'}">${p2Name}</div>
      <div class="pts" style="color:${gameMode==='bot'?'var(--bot)':'var(--p2)'}">${toBengaliNum(scores[2])}</div>
    </div>` : ''}
  `;

  showScreen('resultScreen');
  if (scores[1] !== scores[2] || gameMode === 'single') launchConfetti();
}

function replayGame() { startGame(lastMode); }

function launchConfetti() {
  const colors = ['#f5a623','#ff6b6b','#4fc3f7','#a5d6a7','#ef9a9a','#fff'];
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'confetti-piece';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDuration = (1.5 + Math.random()) + 's';
      el.style.width = el.style.height = (8 + Math.random() * 8) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }, i * 40);
  }
}
