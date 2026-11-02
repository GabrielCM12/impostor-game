// BANCO DE PALAVRAS COM DICAS ESPECÍFICAS
const DEFAULT_WORD_BANK = {
  "Jogos": [
    { word: "Minecraft", hints: ["Blocos", "Construção", "Pixel"] },
    { word: "Counter-Strike", hints: ["Bomba", "Armas", "Táticos"] },
    { word: "FIFA", hints: ["Futebol", "Bola", "Gramado"] },
    { word: "League of Legends", hints: ["MOBA", "Torres", "Invocadores"] },
    { word: "GTA", hints: ["Carros", "Mundo Aberto", "Crime"] },
    { word: "Valorant", hints: ["Agentes", "Habilidades", "Tático"] }
  ],
  "Animes": [
    { word: "Naruto", hints: ["Ninja", "Sapo", "Jutsu"] },
    { word: "One Piece", hints: ["Piratas", "Navio", "Borracha"] },
    { word: "Dragon Ball", hints: ["Esferas", "Esfera", "Luta"] },
    { word: "Attack on Titan", hints: ["Muralhas", "Gigantes", "Espadas"] },
    { word: "Death Note", hints: ["Caderno", "Maçã", "Shinigami"] }
  ],
  "Brasil": [
    { word: "Feijoada", hints: ["Feijão", "Porco", "Prato"] },
    { word: "Carnaval", hints: ["Festa", "Samba", "Fevereiro"] },
    { word: "Futebol", hints: ["Campo", "Chuteira", "Estádio"] },
    { word: "Capoeira", hints: ["Luta", "Música", "Roda"] },
    { word: "Pão de Açúcar", hints: ["Rio de Janeiro", "Bonde", "Morro"] }
  ],
  "Filmes": [
    { word: "Titanic", hints: ["Gelo", "Navio", "Oceano"] },
    { word: "Vingadores", hints: ["Heróis", "Escudo", "Universo"] },
    { word: "Harry Potter", hints: ["Vara", "Magia", "Escola"] },
    { word: "Star Wars", hints: ["Galáxia", "Nave", "Força"] },
    { word: "Matrix", hints: ["Pílula", "Código", "Realidade"] }
  ]
};

// ESTADO GLOBAL DO JOGO
let state = {
  players: JSON.parse(localStorage.getItem('impostor_players')) || ["Gabriel", "Lucas", "Mariana", "Pedro"],
  numImpostors: 1,
  knowPartner: true,
  enableHints: true,
  selectedCategories: ["Jogos", "Brasil"],
  customWords: [],
  
  // Dados da Rodada
  secretWord: "",
  secretCategory: "",
  impostors: [],
  playerRoles: [], // Array de { name, isImpostor, hint }
  currentPlayerIdx: 0,
  cardRevealed: false,
  soundEnabled: true,
  
  // Timer
  timerDuration: 120,
  timerRemaining: 120,
  timerInterval: null
};

// WEB AUDIO API
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playSound(type) {
  if (!state.soundEnabled) return;
  if (!audioCtx) audioCtx = new AudioContext();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'flip') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'tick') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'win') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.setValueAtTime(600, now + 0.1);
    osc.frequency.setValueAtTime(800, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  }
}

// ELEMENTOS DOM
const screenPlayers = document.getElementById('screen-players');
const screenConfig = document.getElementById('screen-config');
const screenGame = document.getElementById('screen-game');
const screenTimer = document.getElementById('screen-timer');
const screenResult = document.getElementById('screen-result');

const playerInput = document.getElementById('player-input');
const btnAddPlayer = document.getElementById('btn-add-player');
const playersList = document.getElementById('players-list');
const btnToConfig = document.getElementById('btn-to-config');

const categoriesContainer = document.getElementById('categories-container');
const btnStartGame = document.getElementById('btn-start-game');
const btnBackPlayers = document.getElementById('btn-back-players');

const cardInner = document.getElementById('card-inner');
const btnNextPlayer = document.getElementById('btn-next-player');
const currentPlayerName = document.getElementById('current-player-name');
const roleBadge = document.getElementById('role-badge');
const secretWordDisplay = document.getElementById('secret-word-display');
const roleDesc = document.getElementById('role-desc');

const timerText = document.getElementById('timer-text');
const timerProgress = document.getElementById('timer-progress');
const btnTimerToggle = document.getElementById('btn-timer-toggle');
const btnTimerAdd = document.getElementById('btn-timer-add');
const firstSpeaker = document.getElementById('first-speaker');
const btnRevealImpostor = document.getElementById('btn-reveal-impostor');

const impostorNames = document.getElementById('impostor-names');
const revealedSecretWord = document.getElementById('revealed-secret-word');
const btnRestart = document.getElementById('btn-restart');

const btnSound = document.getElementById('btn-sound');
const soundIcon = document.getElementById('sound-icon');
const btnQr = document.getElementById('btn-qr');
const modalQr = document.getElementById('modal-qr');
const btnCloseQr = document.getElementById('btn-close-qr');

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
  initBackgroundCanvas();
  renderPlayers();
  renderCategories();
  setupEventListeners();
  setupQRCode();
});

// CANVAS BG ANIMADO
function initBackgroundCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(129, 140, 248, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// SETUP EVENTOS
function setupEventListeners() {
  // Som Toggle
  btnSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
  });

  // QR Code
  btnQr.addEventListener('click', () => modalQr.classList.remove('hidden'));
  btnCloseQr.addEventListener('click', () => modalQr.classList.add('hidden'));

  // Jogadores
  btnAddPlayer.addEventListener('click', addPlayer);
  playerInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addPlayer(); });

  btnToConfig.addEventListener('click', () => {
    if (state.players.length < 3) {
      alert("Adicione pelo menos 3 jogadores!");
      return;
    }
    switchScreen(screenPlayers, screenConfig);
  });

  btnBackPlayers.addEventListener('click', () => switchScreen(screenConfig, screenPlayers));

  // Configurações Impostores
  document.querySelectorAll('.btn-count').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-count').forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white');
        b.classList.add('text-slate-400');
      });
      e.target.classList.add('bg-indigo-600', 'text-white');
      e.target.classList.remove('text-slate-400');
      state.numImpostors = parseInt(e.target.dataset.val);

      const partnerContainer = document.getElementById('partner-option-container');
      if (state.numImpostors === 2) {
        partnerContainer.classList.remove('hidden');
      } else {
        partnerContainer.classList.add('hidden');
      }
    });
  });
  // Seleciona 1 impostor por padrão
  document.querySelector('.btn-count[data-val="1"]').click();

  document.getElementById('toggle-partner').addEventListener('change', (e) => {
    state.knowPartner = e.target.checked;
  });

  document.getElementById('toggle-hints').addEventListener('change', (e) => {
    state.enableHints = e.target.checked;
  });

  btnStartGame.addEventListener('click', startGame);

  // Carta Flip (Apenas vira, não desvira)
  cardInner.addEventListener('click', () => {
    if (state.cardRevealed) return; // Não desvira se já estiver virado
    state.cardRevealed = true;
    cardInner.classList.add('flipped');
    playSound('flip');

    // Mostra botão próximo
    btnNextPlayer.classList.remove('opacity-0', 'pointer-events-none');
  });

  btnNextPlayer.addEventListener('click', nextPlayerCard);

  // Timer
  btnTimerToggle.addEventListener('click', toggleTimer);
  btnTimerAdd.addEventListener('click', () => {
    state.timerRemaining += 30;
    updateTimerDisplay();
  });

  btnRevealImpostor.addEventListener('click', revealResult);
  btnRestart.addEventListener('click', () => switchScreen(screenResult, screenPlayers));
}

// QR CODE GENERATOR
function setupQRCode() {
  const target = document.getElementById('qrcode-target');
  target.innerHTML = '';
  new QRCode(target, {
    text: window.location.href,
    width: 160,
    height: 160,
    colorDark: "#0f172a",
    colorLight: "#ffffff"
  });
}

// RENDER JOGADORES
function renderPlayers() {
  playersList.innerHTML = '';
  state.players.forEach((p, index) => {
    const badge = document.createElement('div');
    badge.className = 'flex items-center gap-2 bg-slate-900/60 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200';
    badge.innerHTML = `
      <span>${p}</span>
      <button onclick="removePlayer(${index})" class="text-slate-500 hover:text-rose-400 font-bold ml-1">&times;</button>
    `;
    playersList.appendChild(badge);
  });
  localStorage.setItem('impostor_players', JSON.stringify(state.players));
}

function addPlayer() {
  const name = playerInput.value.trim();
  if (name && !state.players.includes(name)) {
    state.players.push(name);
    playerInput.value = '';
    renderPlayers();
  }
}

window.removePlayer = function(index) {
  state.players.splice(index, 1);
  renderPlayers();
};

// RENDER CATEGORIAS
function renderCategories() {
  categoriesContainer.innerHTML = '';
  const cats = Object.keys(DEFAULT_WORD_BANK);
  cats.push("Customizado");

  cats.forEach(cat => {
    const btn = document.createElement('button');
    const isSelected = state.selectedCategories.includes(cat);
    btn.className = `p-3 rounded-2xl text-xs font-bold border transition-all text-left flex justify-between items-center ${
      isSelected 
        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' 
        : 'bg-slate-900/40 border-white/5 text-slate-400'
    }`;
    btn.innerHTML = `
      <span>${cat}</span>
      <span class="text-[10px]">${isSelected ? '✓' : ''}</span>
    `;
    btn.addEventListener('click', () => {
      if (cat === "Customizado") {
        const customContainer = document.getElementById('custom-words-container');
        if (state.selectedCategories.includes("Customizado")) {
          state.selectedCategories = state.selectedCategories.filter(c => c !== "Customizado");
          customContainer.classList.add('hidden');
        } else {
          state.selectedCategories.push("Customizado");
          customContainer.classList.remove('hidden');
        }
      } else {
        if (state.selectedCategories.includes(cat)) {
          if (state.selectedCategories.length > 1) {
            state.selectedCategories = state.selectedCategories.filter(c => c !== cat);
          }
        } else {
          state.selectedCategories.push(cat);
        }
      }
      renderCategories();
    });
    categoriesContainer.appendChild(btn);
  });
}

// INICIAR JOGO E SORTEIO
function startGame() {
  // 1. Escolher palavra
  let availableWords = [];

  state.selectedCategories.forEach(cat => {
    if (cat === "Customizado") {
      const rawText = document.getElementById('custom-words-input').value.trim();
      if (rawText) {
        const lines = rawText.split('\n');
        lines.forEach(line => {
          const parts = line.split(':');
          if (parts.length >= 1 && parts[0].trim()) {
            const word = parts[0].trim();
            const hints = parts[1] ? parts[1].split(',').map(h => h.trim()) : ["Sem dica"];
            availableWords.push({ word, hints, category: "Customizado" });
          }
        });
      }
    } else if (DEFAULT_WORD_BANK[cat]) {
      DEFAULT_WORD_BANK[cat].forEach(item => {
        availableWords.push({ ...item, category: cat });
      });
    }
  });

  if (availableWords.length === 0) {
    alert("Selecione pelo menos uma categoria com palavras!");
    return;
  }

  const selectedItem = availableWords[Math.floor(Math.random() * availableWords.length)];
  state.secretWord = selectedItem.word;
  state.secretCategory = selectedItem.category;

  // 2. Sortear Impostores
  const shuffledPlayers = [...state.players].sort(() => Math.random() - 0.5);
  state.impostors = shuffledPlayers.slice(0, state.numImpostors);

  // 3. Montar Papéis
  state.playerRoles = state.players.map(player => {
    const isImp = state.impostors.includes(player);
    let hint = "";
    if (isImp && state.enableHints) {
      const randomHint = selectedItem.hints[Math.floor(Math.random() * selectedItem.hints.length)];
      hint = randomHint;
    }
    return { name: player, isImpostor: isImp, hint };
  });

  // Embaralhar ordem de exibição das cartas
  state.playerRoles.sort(() => Math.random() - 0.5);

  state.currentPlayerIdx = 0;
  switchScreen(screenConfig, screenGame);
  setupCardScreen();
}

// TELA DE CARTA
function setupCardScreen() {
  state.cardRevealed = false;
  cardInner.classList.remove('flipped');
  btnNextPlayer.classList.add('opacity-0', 'pointer-events-none');

  const p = state.playerRoles[state.currentPlayerIdx];
  currentPlayerName.textContent = p.name;

  if (p.isImpostor) {
    roleBadge.textContent = "VOCÊ É O IMPOSTOR";
    roleBadge.className = "px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40";
    secretWordDisplay.textContent = "🤫 SILÊNCIO";
    secretWordDisplay.className = "text-2xl font-black text-rose-400 break-words w-full";

    let desc = "Descubra a palavra secreta sem ser pego!";
    if (state.numImpostors === 2 && state.knowPartner) {
      const partner = state.impostors.find(name => name !== p.name);
      if (partner) desc += `<br><span class="text-cyan-300 font-bold">Parceiro: ${partner}</span>`;
    }
    if (state.enableHints && p.hint) {
      desc += `<br><span class="text-indigo-300 font-bold">Dica da Palavra: ${p.hint}</span>`;
    }
    roleDesc.innerHTML = desc;
  } else {
    roleBadge.textContent = "JOGADOR HONESTO";
    roleBadge.className = "px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40";
    secretWordDisplay.textContent = state.secretWord;
    secretWordDisplay.className = "text-2xl font-black text-cyan-300 break-words w-full";
    roleDesc.textContent = `Categoria: ${state.secretCategory}`;
  }
}

function nextPlayerCard() {
  state.currentPlayerIdx++;
  if (state.currentPlayerIdx < state.playerRoles.length) {
    setupCardScreen();
  } else {
    // Fim das cartas -> Iniciar Timer / Debate
    switchScreen(screenGame, screenTimer);
    startTimerScreen();
  }
}

// DEBATE E CRONÔMETRO
function startTimerScreen() {
  const randomSpeaker = state.players[Math.floor(Math.random() * state.players.length)];
  firstSpeaker.textContent = randomSpeaker;

  state.timerRemaining = 120;
  updateTimerDisplay();
  startTimer();
}

function startTimer() {
  clearInterval(state.timerInterval);
  btnTimerToggle.textContent = "Pausar";
  state.timerInterval = setInterval(() => {
    state.timerRemaining--;
    updateTimerDisplay();
    if (state.timerRemaining <= 0) {
      clearInterval(state.timerInterval);
      playSound('win');
    } else if (state.timerRemaining <= 10) {
      playSound('tick');
    }
  }, 1000);
}

function toggleTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    btnTimerToggle.textContent = "Continuar";
  } else {
    startTimer();
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(Math.max(0, state.timerRemaining) / 60);
  const secs = Math.max(0, state.timerRemaining) % 60;
  timerText.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const progress = (state.timerRemaining / 120) * 283;
  timerProgress.style.strokeDashoffset = 283 - Math.max(0, progress);
}

// RESULTADO FINAL
function revealResult() {
  clearInterval(state.timerInterval);
  switchScreen(screenTimer, screenResult);

  impostorNames.textContent = state.impostors.join(' & ');
  revealedSecretWord.textContent = `${state.secretWord} (${state.secretCategory})`;

  playSound('win');
  if (window.confetti) {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }
}

// TROCA DE TELAS DE FORMA SUAVE
function switchScreen(from, to) {
  from.classList.add('hidden');
  to.classList.remove('hidden');
}
