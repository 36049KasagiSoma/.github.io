const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = {
  chips: 1000,
  currentBet: 0,
  deck: [],
  playerHands: [[]],
  dealerHand: [],
  currentHand: 0,
  gamePhase: 'betting',
  splitHands: false,
  insuranceBet: 0,
  handBets: [0],
  surrendered: false
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

function getCardValue(card) {
  if (card.rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;

  for (let card of hand) {
    if (card.rank === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

function isNaturalBlackjack(hand) {
  return hand.length === 2 && calculateHandValue(hand) === 21;
}

function isBlackjack(hand) {
  return calculateHandValue(hand) === 21;
}

function hasNaturalBlackjack(hand) {
  if (hand.length !== 2) return false;
  
  let hasAce = false;
  let hasTen = false;
  
  for (let card of hand) {
    if (card.rank === 'A') {
      hasAce = true;
    } else if (['10', 'J', 'Q', 'K'].includes(card.rank)) {
      hasTen = true;
    }
  }
  
  return hasAce && hasTen;
}

function canSplit(hand) {
  return hand.length === 2 &&
    hand[0].rank === hand[1].rank &&
    gameState.chips >= gameState.handBets[gameState.currentHand];
}

function drawCard(x, y, card, faceDown = false) {
  const cardWidth = 60;
  const cardHeight = 80;

  ctx.fillStyle = faceDown ? '#4169e1' : 'white';
  ctx.fillRect(x, y, cardWidth, cardHeight);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, cardWidth, cardHeight);

  if (!faceDown) {
    ctx.fillStyle = (card.suit === '♦' || card.suit === '♥') ? 'red' : 'black';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.rank, x + cardWidth / 2, y + 20);
    ctx.font = '20px sans-serif';
    ctx.fillText(card.suit, x + cardWidth / 2, y + 45);
  } else {
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', x + cardWidth / 2, y + cardHeight / 2 + 5);
  }
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ディーラー', 50, 40);

  let dealerValue = calculateHandValue(gameState.dealerHand);
  if (gameState.gamePhase === 'dealer' || gameState.gamePhase === 'gameOver') {
    ctx.fillText(`(${dealerValue})`, 130, 40);
    
    if (hasNaturalBlackjack(gameState.dealerHand)) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('ナチュラルBJ!', 200, 40);
    }
  }

  for (let i = 0; i < gameState.dealerHand.length; i++) {
    const faceDown = i === 1 && gameState.gamePhase === 'playing';
    drawCard(50 + i * 70, 50, gameState.dealerHand[i], faceDown);
  }

  if (gameState.splitHands) {
    for (let handIndex = 0; handIndex < gameState.playerHands.length; handIndex++) {
      const hand = gameState.playerHands[handIndex];
      
      // 各手札の基本位置を計算（画面を左右に分割）
      const baseX = handIndex === 0 ? 50 : 380; // 左側: 50, 右側: 380
      const y = 250;
      
      // カードの重なり幅を手札の長さに応じて調整
      const maxCards = 5; // 想定最大枚数
      const availableWidth = 260; // 各手札に使える幅
      const cardWidth = 60;
      const maxOverlap = availableWidth - cardWidth; // 最大重なり可能幅
      const cardSpacing = hand.length > 1 ? Math.min(70, maxOverlap / (hand.length - 1)) : 70;
  
      ctx.fillStyle = handIndex === gameState.currentHand ? '#ffd700' : 'white';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`ハンド${handIndex + 1}`, baseX, y - 10);
  
      const handValue = calculateHandValue(hand);
      ctx.fillText(`(${handValue})`, baseX + 80, y - 10);
  
      if (hasNaturalBlackjack(hand) && !gameState.splitHands) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText('ナチュラルBJ!', baseX + 130, y - 10);
      }
  
      for (let i = 0; i < hand.length; i++) {
        drawCard(baseX + i * cardSpacing, y, hand[i]);
      }
    }
  } else {
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('プレイヤー', 50, 240);

    const playerValue = calculateHandValue(gameState.playerHands[0]);
    ctx.fillText(`(${playerValue})`, 140, 240);

    if (hasNaturalBlackjack(gameState.playerHands[0])) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('ナチュラルBJ!', 220, 240);
    }

    for (let i = 0; i < gameState.playerHands[0].length; i++) {
      drawCard(50 + i * 70, 250, gameState.playerHands[0][i]);
    }
  }
}

function updateUI() {
  document.getElementById('chips').textContent = gameState.chips;
  document.getElementById('bet').textContent = gameState.currentBet;
  document.getElementById('deckCount').textContent = gameState.deck.length;

  const bettingControls = document.getElementById('bettingControls');
  const gameControls = document.getElementById('gameControls');
  const gameResult = document.getElementById('gameResult');
  const nextHandBtn = document.getElementById('nextHandBtn');

  if (gameState.gamePhase === 'betting') {
    bettingControls.style.display = 'block';
    gameControls.style.display = 'none';
    gameResult.style.display = 'none';
    nextHandBtn.style.display = 'none';
  } else if (gameState.gamePhase === 'playing') {
    bettingControls.style.display = 'none';
    gameControls.style.display = 'block';
    gameResult.style.display = 'none';
    nextHandBtn.style.display = 'none';

    updateGameControls();
  } else if (gameState.gamePhase === 'gameOver') {
    bettingControls.style.display = 'none';
    gameControls.style.display = 'none';
    gameResult.style.display = 'block';
    nextHandBtn.style.display = gameState.chips > 0 ? 'block' : 'none';
  }

  updateHandInfo();
}

function updateGameControls() {
  const currentHand = gameState.playerHands[gameState.currentHand];
  const currentHandValue = calculateHandValue(currentHand);

  document.getElementById('hitBtn').disabled = currentHandValue >= 21;
  document.getElementById('standBtn').disabled = false;

  const canDouble = currentHand.length === 2 &&
    gameState.chips >= gameState.handBets[gameState.currentHand] &&
    !hasNaturalBlackjack(currentHand);
  document.getElementById('doubleBtn').style.display = canDouble ? 'inline-block' : 'none';

  const canSplitHand = !gameState.splitHands && canSplit(currentHand) && !hasNaturalBlackjack(currentHand);
  document.getElementById('splitBtn').style.display = canSplitHand ? 'inline-block' : 'none';

  const dealerAce = gameState.dealerHand[0].rank === 'A';
  const canInsure = dealerAce && currentHand.length === 2 && gameState.insuranceBet === 0;
  document.getElementById('insuranceBtn').style.display = canInsure ? 'inline-block' : 'none';

  const canSurrender = currentHand.length === 2 && !gameState.splitHands && !hasNaturalBlackjack(currentHand);
  document.getElementById('surrenderBtn').style.display = canSurrender ? 'inline-block' : 'none';
}

function updateHandInfo() {
  const handInfo = document.getElementById('handInfo');
  if (gameState.splitHands && gameState.gamePhase === 'playing') {
    handInfo.innerHTML = `現在のハンド: ${gameState.currentHand + 1}/${gameState.playerHands.length}`;
  } else {
    handInfo.innerHTML = '';
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
  gameState.handBets = [gameState.currentBet];
  gameState.playerHands = [
    []
  ];
  gameState.dealerHand = [];
  gameState.currentHand = 0;
  gameState.splitHands = false;
  gameState.insuranceBet = 0;
  gameState.surrendered = false;
  gameState.gamePhase = 'playing';

  gameState.playerHands[0].push(gameState.deck.pop());
  gameState.dealerHand.push(gameState.deck.pop());
  gameState.playerHands[0].push(gameState.deck.pop());
  gameState.dealerHand.push(gameState.deck.pop());

  const playerNatural = hasNaturalBlackjack(gameState.playerHands[0]);

  if (playerNatural) {
    checkAllHandsComplete();
    return;
  }

  updateUI();
  drawGame();
}

function hit() {
  const currentHand = gameState.playerHands[gameState.currentHand];
  
  if (hasNaturalBlackjack(currentHand)) {
    return;
  }
  
  currentHand.push(gameState.deck.pop());

  const handValue = calculateHandValue(currentHand);
  if (handValue > 21) {
    if (gameState.splitHands && gameState.currentHand < gameState.playerHands.length - 1) {
      gameState.currentHand++;
    } else {
      checkAllHandsComplete();
    }
  }

  updateUI();
  drawGame();
}

function stand() {
  if (gameState.splitHands && gameState.currentHand < gameState.playerHands.length - 1) {
    gameState.currentHand++;
    updateUI();
    drawGame();
  } else {
    checkAllHandsComplete();
  }
}

function surrender() {
  if (gameState.playerHands[0].length === 2 && !gameState.splitHands) {
    gameState.surrendered = true;
    const refund = Math.floor(gameState.handBets[0] / 2);
    gameState.chips += refund;
    endGame(`サレンダー - ベットの半分（${refund}チップ）が返却されました`, 'surrender');
  }
}

function doubleDown() {
  const currentHand = gameState.playerHands[gameState.currentHand];
  
  if (hasNaturalBlackjack(currentHand)) {
    return;
  }
  
  const doubleBet = gameState.handBets[gameState.currentHand];
  if (gameState.chips >= doubleBet) {
    gameState.chips -= doubleBet;
    gameState.handBets[gameState.currentHand] *= 2;

    hit();
    if (calculateHandValue(gameState.playerHands[gameState.currentHand]) <= 21) {
      stand();
    }
  }
}

function split() {
  const currentHand = gameState.playerHands[0];
  
  if (hasNaturalBlackjack(currentHand)) {
    return;
  }
  
  if (canSplit(currentHand)) {
    gameState.chips -= gameState.currentBet;
    gameState.splitHands = true;

    gameState.playerHands.push([currentHand.pop()]);
    gameState.handBets.push(gameState.currentBet);

    gameState.playerHands[0].push(gameState.deck.pop());
    gameState.playerHands[1].push(gameState.deck.pop());

    gameState.currentHand = 0;
    updateUI();
    drawGame();
  }
}

function insurance() {
  const insuranceAmount = Math.floor(gameState.currentBet / 2);
  if (gameState.chips >= insuranceAmount) {
    gameState.chips -= insuranceAmount;
    gameState.insuranceBet = insuranceAmount;
    updateUI();
  }
}

function checkAllHandsComplete() {
  gameState.gamePhase = 'dealer';
  dealerPlay();
}

function dealerPlay() {
  let dealerValue = calculateHandValue(gameState.dealerHand);

  const dealerDrawCard = () => {
    if (dealerValue < 17) {
      gameState.dealerHand.push(gameState.deck.pop());
      dealerValue = calculateHandValue(gameState.dealerHand);
      drawGame();
      setTimeout(dealerDrawCard, 1000);
    } else {
      determineWinner();
    }
  };

  drawGame();
  setTimeout(dealerDrawCard, 1000);
}

function determineWinner() {
  const dealerValue = calculateHandValue(gameState.dealerHand);
  const dealerNatural = hasNaturalBlackjack(gameState.dealerHand);
  let totalWinnings = 0;
  let resultText = '';

  if (gameState.insuranceBet > 0) {
    if (dealerNatural) {
      totalWinnings += gameState.insuranceBet * 2;
      resultText += 'インシュアランス勝利！ ';
    }
  }

  for (let i = 0; i < gameState.playerHands.length; i++) {
    const hand = gameState.playerHands[i];
    const handValue = calculateHandValue(hand);
    const handBet = gameState.handBets[i];
    const playerNatural = hasNaturalBlackjack(hand);

    if (handValue > 21) {
      resultText += `ハンド${i + 1}: バスト `;
    } else if (dealerValue > 21) {
      if (playerNatural) {
        totalWinnings += Math.floor(handBet * 2.5);
        resultText += `ハンド${i + 1}: ナチュラルBJ勝利！ `;
      } else {
        totalWinnings += handBet * 2;
        resultText += `ハンド${i + 1}: 勝利（ディーラーバスト） `;
      }
    } else if (handValue > dealerValue) {
      if (playerNatural) {
        totalWinnings += Math.floor(handBet * 2.5);
        resultText += `ハンド${i + 1}: ナチュラルBJ勝利！ `;
      } else {
        totalWinnings += handBet * 2;
        resultText += `ハンド${i + 1}: 勝利 `;
      }
    } else if (handValue === dealerValue) {
      if (playerNatural && dealerNatural) {
        totalWinnings += handBet;
        resultText += `ハンド${i + 1}: プッシュ（両方BJ） `;
      } else if (playerNatural && !dealerNatural) {
        totalWinnings += Math.floor(handBet * 2.5);
        resultText += `ハンド${i + 1}: ナチュラルBJ勝利！ `;
      } else if (!playerNatural && dealerNatural) {
        resultText += `ハンド${i + 1}: 負け（ディーラーBJ） `;
      } else {
        totalWinnings += handBet;
        resultText += `ハンド${i + 1}: プッシュ `;
      }
    } else {
      if (dealerNatural && !playerNatural) {
        resultText += `ハンド${i + 1}: 負け（ディーラーBJ） `;
      } else {
        resultText += `ハンド${i + 1}: 負け `;
      }
    }
  }

  gameState.chips += totalWinnings;
  endGame(resultText, null);
}

function endGame(message, winType) {
  gameState.gamePhase = 'gameOver';

  if (winType === 'naturalBlackjack') {
    gameState.chips += Math.floor(gameState.currentBet * 2.5);
  } else if (winType === 'push') {
    gameState.chips += gameState.currentBet;
  } else if (winType === 'insuranceWin') {
  }

  const gameResult = document.getElementById('gameResult');
  if (gameState.chips <= 0) {
    gameResult.innerHTML = `<div class="game-over">${message}<br>ゲームオーバー！チップがなくなりました。</div>`;
  } else {
    gameResult.innerHTML = `<div class="win">${message}</div>`;
  }

  updateUI();
  drawGame();
}

function nextHand() {
  gameState.gamePhase = 'betting';
  gameState.currentBet = 0;
  updateUI();
  drawGame();
}

function restartGame() {
  window.location.reload();
}

gameState.deck = createDeck();
updateUI();
drawGame();
