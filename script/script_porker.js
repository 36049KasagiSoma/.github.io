const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
  chips: 1000,
  currentBet: 0,
  deck: [],
  playerHand: [],
  selectedCards: [],
  gamePhase: 'betting',
  currentHand: '',
  winnings: 0,
  doubleUpCard: null,
  doubleUpChoice: null,
  doubleUpNewCard: null
};

function createDeck() {
  const suits = ['♠', '♣', '♦', '♥'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];

  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({
        suit,
        rank
      });
    }
  }

  return shuffleDeck(deck);
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getCardRankValue(rank) {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank);
}

function getCardRankValueForDoubleUp(rank) {
  if (rank === 'A') return 14;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank);
}

function drawCard(x, y, card, selected = false) {
  const cardWidth = 80;
  const cardHeight = 110;

  ctx.fillStyle = selected ? 'rgba(255, 215, 0, 0.3)' : 'white';
  ctx.fillRect(x, y, cardWidth, cardHeight);
  ctx.strokeStyle = selected ? '#ffd700' : '#000';
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeRect(x, y, cardWidth, cardHeight);

  ctx.fillStyle = (card.suit === '♦' || card.suit === '♥') ? 'red' : 'black';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.rank, x + cardWidth / 2, y + 25);
  ctx.font = '24px sans-serif';
  ctx.fillText(card.suit, x + cardWidth / 2, y + 60);
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('あなたの手札', 50, 30);

  for (let i = 0; i < gameState.playerHand.length; i++) {
    const selected = gameState.selectedCards.includes(i);
    drawCard(50 + i * 90, 40, gameState.playerHand[i], selected);
  }
}

function updateUI() {
  document.getElementById('chips').textContent = gameState.chips;
  document.getElementById('bet').textContent = gameState.currentBet;
  document.getElementById('deckCount').textContent = gameState.deck.length;

  const bettingControls = document.getElementById('bettingControls');
  const gameControls = document.getElementById('gameControls');
  const gameResult = document.getElementById('gameResult');
  const doubleUpContainer = document.getElementById('doubleUpContainer');
  const nextHandBtn = document.getElementById('nextHandBtn');
  const handInfo = document.getElementById('handInfo');

  bettingControls.style.display = 'none';
  gameControls.style.display = 'none';
  gameResult.style.display = 'none';
  doubleUpContainer.style.display = 'none';
  nextHandBtn.style.display = 'none';

  if (gameState.gamePhase === 'betting') {
    bettingControls.style.display = 'block';
    handInfo.textContent = '';
  } else if (gameState.gamePhase === 'draw') {
    gameControls.style.display = 'block';
    handInfo.textContent = gameState.currentHand;
  } else if (gameState.gamePhase === 'result') {
    gameResult.style.display = 'block';
    handInfo.textContent = gameState.currentHand;
    if (gameState.winnings > 0) {
      doubleUpContainer.style.display = 'block';
    } else {
      nextHandBtn.style.display = gameState.chips > 0 ? 'block' : 'none';
    }
  } else if (gameState.gamePhase === 'doubleUp') {
    doubleUpContainer.style.display = 'block';
    handInfo.textContent = gameState.currentHand;
  }
}

function placeBet(amount) {
  if (amount === -1) {
    gameState.currentBet = gameState.chips;
  } else {
    if (gameState.chips >= amount) {
      gameState.currentBet = Math.min(gameState.currentBet + amount, gameState.chips);
    }
  }
  updateUI();
}

function resetBet() {
  gameState.currentBet = 0;
  updateUI();
}

function deal() {
  if (gameState.currentBet === 0) {
    alert('ベットしてください！');
    return;
  }

  if (gameState.deck.length < 10) {
    gameState.deck = createDeck();
  }

  gameState.chips -= gameState.currentBet;
  gameState.playerHand = [];
  gameState.selectedCards = [];
  gameState.gamePhase = 'draw';

  for (let i = 0; i < 5; i++) {
    gameState.playerHand.push(gameState.deck.pop());
  }

  gameState.currentHand = evaluateHand(gameState.playerHand);
  updateUI();
  drawGame();
}

function selectCard(cardIndex) {
  const index = gameState.selectedCards.indexOf(cardIndex);
  if (index > -1) {
    gameState.selectedCards.splice(index, 1);
  } else {
    gameState.selectedCards.push(cardIndex);
  }
  drawGame();
}

function drawCards() {
  const cardsToReplace = [];
  for (let i = 0; i < 5; i++) {
    if (!gameState.selectedCards.includes(i)) {
      cardsToReplace.push(i);
    }
  }

  for (let i = 0; i < cardsToReplace.length; i++) {
    const cardIndex = cardsToReplace[i];
    gameState.playerHand[cardIndex] = gameState.deck.pop();
  }

  gameState.selectedCards = [];
  gameState.currentHand = evaluateHand(gameState.playerHand);
  finishHand();
}

function finishHand() {
  gameState.gamePhase = 'result';
  const {
    hand,
    multiplier
  } = getHandDetails(gameState.playerHand);

  let winnings = 0;
  let resultText = '';

  if (multiplier > 0) {
    winnings = gameState.currentBet * multiplier;
    gameState.winnings = winnings;
    resultText = `<div class="win">${hand}！</div><div>配当: ${winnings}チップ</div>`;
  } else {
    gameState.winnings = 0;
    resultText = `<div class="game-over">役なし</div><div>配当: 0チップ</div>`;
  }

  if (gameState.chips <= 0 && gameState.winnings === 0) {
    resultText += '<div class="game-over">ゲームオーバー！チップがなくなりました。</div>';
  }

  document.getElementById('gameResult').innerHTML = resultText;

  if (gameState.winnings > 0) {
    document.getElementById('winAmount').textContent = gameState.winnings;
    resetDoubleUpUI();
  }

  updateUI();
  drawGame();
}

function evaluateHand(hand) {
  const {
    hand: handName
  } = getHandDetails(hand);
  return handName;
}

function getHandDetails(hand) {
  const ranks = hand.map(card => getCardRankValue(card.rank)).sort((a, b) => a - b);
  const suits = hand.map(card => card.suit);

  const rankCounts = {};
  ranks.forEach(rank => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });

  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const isFlush = suits.every(suit => suit === suits[0]);
  const isStraight = ranks.every((rank, i) => i === 0 || rank === ranks[i - 1] + 1) ||
    (ranks.join(',') === '1,10,11,12,13');

  if (isFlush && ranks.join(',') === '1,10,11,12,13') {
    return {
      hand: 'ロイヤルストレートフラッシュ',
      multiplier: 500
    };
  }

  if (isFlush && isStraight) {
    return {
      hand: 'ストレートフラッシュ',
      multiplier: 100
    };
  }

  if (counts[0] === 4) {
    return {
      hand: 'フォーカード',
      multiplier: 50
    };
  }

  if (counts[0] === 3 && counts[1] === 2) {
    return {
      hand: 'フルハウス',
      multiplier: 15
    };
  }

  if (isFlush) {
    return {
      hand: 'フラッシュ',
      multiplier: 10
    };
  }

  if (isStraight) {
    return {
      hand: 'ストレート',
      multiplier: 8
    };
  }

  if (counts[0] === 3) {
    return {
      hand: 'スリーカード',
      multiplier: 5
    };
  }

  if (counts[0] === 2 && counts[1] === 2) {
    return {
      hand: 'ツーペア',
      multiplier: 3
    };
  }

  if (counts[0] === 2) {
    const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
    if (parseInt(pairRank) >= 11 || pairRank === '1') {
      return {
        hand: 'ワンペア（J以上）',
        multiplier: 2
      };
    }
  }

  return {
    hand: '役なし',
    multiplier: 0
  };
}

function nextHand() {
  gameState.gamePhase = 'betting';
  gameState.currentBet = 0;
  gameState.playerHand = [];
  gameState.selectedCards = [];
  gameState.winnings = 0;
  gameState.doubleUpCard = null;
  gameState.doubleUpChoice = null;
  gameState.doubleUpNewCard = null;
  updateUI();
  drawGame();
}

function resetDoubleUpUI() {
  document.getElementById('doubleUpPhase1').style.display = 'block';
  document.getElementById('doubleUpPhase2').style.display = 'none';
  document.getElementById('doubleControls').style.display = 'block';
  document.getElementById('doubleNextControls').style.display = 'none';
  gameState.doubleUpCard = null;
  gameState.doubleUpChoice = null;
  gameState.doubleUpNewCard = null;
}

function startDoubleUp() {
  gameState.gamePhase = 'doubleUp';

  if (gameState.deck.length < 4) {
    gameState.deck = createDeck();
  }

  gameState.doubleUpCard = gameState.deck.pop();

  const card = gameState.doubleUpCard;
  document.getElementById('currentCardRank').textContent = card.rank;
  document.getElementById('currentCardSuit').textContent = card.suit;

  const cardElement = document.getElementById('currentCard');
  cardElement.style.color = (card.suit === '♦' || card.suit === '♥') ? 'red' : 'black';

  document.getElementById('doubleControls').style.display = 'none';
  document.getElementById('doubleUpPhase1').style.display = 'block';
  document.getElementById('doubleUpPhase2').style.display = 'none';
  updateUI();
}

function makeDoubleUpChoice(choice) {
  gameState.doubleUpChoice = choice;
  gameState.doubleUpNewCard = gameState.deck.pop();

  const oldCard = gameState.doubleUpCard;
  const newCard = gameState.doubleUpNewCard;

  document.getElementById('oldCardRank').textContent = oldCard.rank;
  document.getElementById('oldCardSuit').textContent = oldCard.suit;
  document.getElementById('oldCard').style.color = (oldCard.suit === '♦' || oldCard.suit === '♥') ? 'red' : 'black';

  document.getElementById('newCardRank').textContent = newCard.rank;
  document.getElementById('newCardSuit').textContent = newCard.suit;
  document.getElementById('newCard').style.color = (newCard.suit === '♦' || newCard.suit === '♥') ? 'red' : 'black';

  const oldValue = getCardRankValueForDoubleUp(oldCard.rank);
  const newValue = getCardRankValueForDoubleUp(newCard.rank);

  const doubleResult = document.getElementById('doubleResult');
  let won = false;

  if (choice === 'higher' && newValue > oldValue) {
    won = true;
  } else if (choice === 'lower' && newValue < oldValue) {
    won = true;
  }

  if (won) {
    gameState.winnings *= 2;
    document.getElementById('winAmount').textContent = gameState.winnings;
    doubleResult.innerHTML = `<div class="win">正解！配当が2倍になりました！</div>`;
    document.getElementById('doubleNextControls').style.display = 'block';
  } else if (oldValue === newValue) {
    doubleResult.innerHTML = `<div style="color: #ffd700;">引き分け！配当はそのままです。</div>`;
    document.getElementById('doubleNextControls').style.display = 'block';
  } else {
    doubleResult.innerHTML = `<div class="game-over">不正解...配当を失いました。</div>`;
    gameState.winnings = 0;
    setTimeout(() => {
      if (gameState.chips <= 0) {
        document.getElementById('gameResult').innerHTML += '<div class="game-over">ゲームオーバー！チップがなくなりました。</div>';
      }
      nextHand();
    }, 2000);
  }

  document.getElementById('doubleUpPhase1').style.display = 'none';
  document.getElementById('doubleUpPhase2').style.display = 'block';
}

function continueDoubleUp() {
  gameState.doubleUpCard = gameState.doubleUpNewCard;
  gameState.doubleUpChoice = null;
  gameState.doubleUpNewCard = null;

  const card = gameState.doubleUpCard;
  document.getElementById('currentCardRank').textContent = card.rank;
  document.getElementById('currentCardSuit').textContent = card.suit;
  document.getElementById('currentCard').style.color = (card.suit === '♦' || card.suit === '♥') ? 'red' : 'black';

  document.getElementById('doubleUpPhase1').style.display = 'block';
  document.getElementById('doubleUpPhase2').style.display = 'none';
  document.getElementById('doubleNextControls').style.display = 'none';
}

function collectWinnings() {
  gameState.chips += gameState.winnings;
  gameState.winnings = 0;
  nextHand();
}

function restartGame() {
  gameState = {
    chips: 1000,
    currentBet: 0,
    deck: createDeck(),
    playerHand: [],
    selectedCards: [],
    gamePhase: 'betting',
    currentHand: '',
    winnings: 0,
    doubleUpCard: null,
    doubleUpChoice: null,
    doubleUpNewCard: null
  };

  updateUI();
  drawGame();
}

canvas.addEventListener('click', function(event) {
  if (gameState.gamePhase !== 'draw') return;

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  for (let i = 0; i < gameState.playerHand.length; i++) {
    const cardX = 50 + i * 90;
    const cardY = 40;
    const cardWidth = 80;
    const cardHeight = 110;

    if (x >= cardX && x <= cardX + cardWidth && y >= cardY && y <= cardY + cardHeight) {
      selectCard(i);
      break;
    }
  }
});

gameState.deck = createDeck();
updateUI();
drawGame();