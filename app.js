const pairs = [
  { symbol: "🍓", prompt: "What’s a tiny moment with me that still makes you smile?" },
  { symbol: "🌷", prompt: "What’s one small thing I do that makes you feel cared for?" },
  { symbol: "💌", prompt: "What did you first notice about me?" },
  { symbol: "🌙", prompt: "What would our perfect slow evening look like?" },
  { symbol: "☕", prompt: "Which ordinary day together would you happily relive?" },
  { symbol: "🍒", prompt: "What’s something new you’d love for us to try together?" }
];

const chatStorageKey = "ours-date-night-chat-v1";
const namesStorageKey = "ours-date-night-player-names-v1";
const defaultNames = ["You", "Partner"];
let game = createGame();
let messages = loadMessages();
let playerNames = loadPlayerNames();
let flipTimer = null;

const board = document.querySelector("#memory-board");
const turnStatus = document.querySelector("#turn-status");
const matchMessage = document.querySelector("#match-message");
const pairsLeft = document.querySelector("#pairs-left");
const scoreYou = document.querySelector("#score-you");
const scorePartner = document.querySelector("#score-partner");
const messageList = document.querySelector("#chat-messages");
const chatEmpty = document.querySelector("#chat-empty");
const chatInput = document.querySelector("#chat-input");

function createGame() {
  const cards = pairs.flatMap((pair, pairId) => [
    { ...pair, pairId, key: pairId + "-a" },
    { ...pair, pairId, key: pairId + "-b" }
  ]);
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[other]] = [cards[other], cards[index]];
  }
  return { cards, matched: new Set(), flipped: [], scores: [0, 0], activePlayer: 0, locked: false, over: false };
}

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(chatStorageKey));
    if (Array.isArray(saved)) return saved.filter((message) => message && typeof message.text === "string").slice(-80);
  } catch (error) {
    // Chat remains usable for this session when browser storage is unavailable.
  }
  return [];
}

function loadPlayerNames() {
  try {
    const saved = JSON.parse(localStorage.getItem(namesStorageKey));
    if (Array.isArray(saved)) return defaultNames.map((fallback, index) => typeof saved[index] === "string" && saved[index].trim() ? saved[index].trim().slice(0, 18) : fallback);
  } catch (error) {
    // Names can still be edited for this session when browser storage is unavailable.
  }
  return [...defaultNames];
}

function savePlayerNames() {
  try {
    localStorage.setItem(namesStorageKey, JSON.stringify(playerNames));
  } catch (error) {
    // Keep the current session usable if browser storage is unavailable.
  }
}

function playerName(index) {
  return playerNames[index] || defaultNames[index];
}

function saveMessages() {
  try {
    localStorage.setItem(chatStorageKey, JSON.stringify(messages));
  } catch (error) {
    // Keep the current session usable if browser storage is unavailable.
  }
}

function setTurnStatus(text) {
  turnStatus.querySelector("span:last-child").textContent = text;
  document.querySelector("#player-you").classList.toggle("is-active", game.activePlayer === 0 && !game.over);
  document.querySelector("#player-partner").classList.toggle("is-active", game.activePlayer === 1 && !game.over);
}

function renderBoard() {
  board.replaceChildren();
  game.cards.forEach((card, index) => {
    const isMatched = game.matched.has(index);
    const isFlipped = game.flipped.includes(index);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-card" + (isFlipped ? " is-flipped" : "") + (isMatched ? " is-matched" : "");
    button.dataset.index = String(index);
    button.setAttribute("aria-label", isMatched ? "Matched " + card.symbol : isFlipped ? "Card showing " + card.symbol : "Face-down memory card");
    button.disabled = isMatched || game.over;
    const back = document.createElement("span");
    back.className = "card-back";
    back.textContent = "♡";
    const face = document.createElement("span");
    face.className = "card-face";
    face.textContent = card.symbol;
    button.append(back, face);
    board.append(button);
  });

  scoreYou.textContent = String(game.scores[0]);
  scorePartner.textContent = String(game.scores[1]);
  const remaining = pairs.length - game.scores[0] - game.scores[1];
  pairsLeft.textContent = remaining + (remaining === 1 ? " PAIR LEFT" : " PAIRS LEFT");
}

function finishTurnAfterMiss() {
  game.flipped = [];
  game.locked = false;
  game.activePlayer = game.activePlayer === 0 ? 1 : 0;
  setTurnStatus("No match — " + playerName(game.activePlayer) + "’s turn.");
  renderBoard();
}

function finishGame() {
  game.over = true;
  const [you, partner] = game.scores;
  const result = you === partner ? "It’s a tie!" : you > partner ? playerName(0) + " wins this round!" : playerName(1) + " wins this round!";
  setTurnStatus("You found all six pairs. " + result);
  matchMessage.textContent = "Six sweet stories collected. Play again or stay here and talk.";
}

function flipCard(index) {
  if (game.locked || game.over || game.matched.has(index) || game.flipped.includes(index)) return;
  game.flipped.push(index);
  renderBoard();

  if (game.flipped.length === 1) {
    setTurnStatus(playerName(game.activePlayer) + " — pick one more card.");
    return;
  }

  const [firstIndex, secondIndex] = game.flipped;
  const firstCard = game.cards[firstIndex];
  const secondCard = game.cards[secondIndex];
  if (firstCard.pairId === secondCard.pairId) {
    game.locked = true;
    game.matched.add(firstIndex);
    game.matched.add(secondIndex);
    game.scores[game.activePlayer] += 1;
    matchMessage.textContent = firstCard.symbol + "  " + firstCard.prompt;
    setTurnStatus(playerName(game.activePlayer) + " found a match! Keep the turn and share the story.");
    renderBoard();
    if (game.matched.size === game.cards.length) {
      game.locked = false;
      finishGame();
      renderBoard();
      return;
    }
    flipTimer = window.setTimeout(() => {
      game.flipped = [];
      game.locked = false;
      renderBoard();
    }, 950);
    return;
  }

  game.locked = true;
  matchMessage.textContent = "Not a pair this time. Remember where you saw them!";
  flipTimer = window.setTimeout(finishTurnAfterMiss, 850);
}

board.addEventListener("click", (event) => {
  const card = event.target.closest(".memory-card");
  if (card) flipCard(Number(card.dataset.index));
});

document.querySelector("#new-game").addEventListener("click", () => {
  if (flipTimer) window.clearTimeout(flipTimer);
  game = createGame();
  matchMessage.textContent = "Find a pair, then tell the little story on the card.";
  setTurnStatus(playerName(0) + "’s turn — flip two cards.");
  renderBoard();
});

document.querySelectorAll(".player-name-input").forEach((input, index) => {
  input.value = playerName(index);
  input.addEventListener("input", () => {
    playerNames[index] = input.value.trim() || defaultNames[index];
    savePlayerNames();
  });
  input.addEventListener("blur", () => {
    input.value = playerName(index);
  });
});

function renderMessages() {
  messageList.querySelectorAll(".chat-message").forEach((message) => message.remove());
  chatEmpty.hidden = messages.length > 0;
  messages.forEach((message) => {
    const bubble = document.createElement("article");
    bubble.className = "chat-message";
    const text = document.createElement("p");
    text.textContent = message.text;
    const time = document.createElement("time");
    time.textContent = message.time;
    bubble.append(text, time);
    messageList.append(bubble);
  });
  messageList.scrollTop = messageList.scrollHeight;
}

document.querySelector("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
  messages.push({ text, time });
  messages = messages.slice(-80);
  saveMessages();
  renderMessages();
  chatInput.value = "";
  chatInput.focus();
});

setTurnStatus(playerName(0) + "’s turn — flip two cards.");
renderBoard();
renderMessages();
