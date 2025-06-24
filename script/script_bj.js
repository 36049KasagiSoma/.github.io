const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム状態
let gameState = {
  chips: 1000,
  currentBet: 0,
  deck: [],
  playerHands: [
    []
  ],
  dealerHand: [],
  currentHand: 0,
  gamePhase: 'betting', // betting, playing, dealer, gameOver
  splitHands: false,
  insuranceBet: 0,
  handBets: [0]
};

// カード作成
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

// ナチュラルブラックジャック判定（最初の2枚で21）
function isNaturalBlackjack(hand) {
  return hand.length === 2 && calculateHandValue(hand) === 21;
}

// 通常のブラックジャック判定（21の値）
function isBlackjack(hand) {
  return calculateHandValue(hand) === 21;
}

// ナチュラルブラックジャックかどうかを表示用に判定
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

  // カード背景
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

  // ディーラーハンド
  ctx.fillStyle = 'white';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ディーラー', 50, 40);

  let dealerValue = calculateHandValue(gameState.dealerHand);
  if (gameState.gamePhase === 'dealer' || gameState.gamePhase === 'gameOver') {
    ctx.fillText(`(${dealerValue})`, 130, 40);
    
    // ディーラーのナチュラルブラックジャック表示
    if (hasNaturalBlackjack(gameState.dealerHand)) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('ナチュラルBJ!', 200, 40);
    }
  }

  for (let i = 0; i < gameState.dealerHand.length; i++) {
    const faceDown = i === 1 && gameState.gamePhase === 'playing';
    drawCard(50 + i * 70, 50, gameState.dealerHand[i], faceDown);
  }

  // プレイヤーハンド
  if (gameState.splitHands) {
    // スプリットハンド表示
    for (let handIndex = 0; handIndex < gameState.playerHands.length; handIndex++) {
      const hand = gameState.playerHands[handIndex];
      const x = 150 + handIndex * 250;
      const y = 250;

      ctx.fillStyle = handIndex === gameState.currentHand ? '#ffd700' : 'white';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`ハンド${handIndex + 1}`, x, y - 10);

      const handValue = calculateHandValue(hand);
      ctx.fillText(`(${handValue})`, x + 80, y - 10);

      // ナチュラルブラックジャック表示（スプリット後は不可）
      if (hasNaturalBlackjack(hand) && !gameState.splitHands) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText('ナチュラルBJ!', x + 130, y - 10);
      }

      for (let i = 0; i < hand.length; i++) {
        drawCard(x + i * 70, y, hand[i]);
      }
    }
  } else {
    // 通常ハンド表示
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('プレイヤー', 50, 240);

    const playerValue = calculateHandValue(gameState.playerHands[0]);
    ctx.fillText(`(${playerValue})`, 140, 240);

    // プレイヤーのナチュラルブラックジャック表示
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

  // ダブルダウン（ナチュラルブラックジャックの場合は無効）
  const canDouble = currentHand.length === 2 &&
    gameState.chips >= gameState.handBets[gameState.currentHand] &&
    !hasNaturalBlackjack(currentHand);
  document.getElementById('doubleBtn').style.display = canDouble ? 'inline-block' : 'none';

  // スプリット（ナチュラルブラックジャックの場合は無効）
  const canSplitHand = !gameState.splitHands && canSplit(currentHand) && !hasNaturalBlackjack(currentHand);
  document.getElementById('splitBtn').style.display = canSplitHand ? 'inline-block' : 'none';

  // インシュアランス
  const dealerAce = gameState.dealerHand[0].rank === 'A';
  const canInsure = dealerAce && currentHand.length === 2 && gameState.insuranceBet === 0;
  document.getElementById('insuranceBtn').style.display = canInsure ? 'inline-block' : 'none';
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
    // オールイン
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
  gameState.gamePhase = 'playing';

  // カード配布
  gameState.playerHands[0].push(gameState.deck.pop());
  gameState.dealerHand.push(gameState.deck.pop());
  gameState.playerHands[0].push(gameState.deck.pop());
  gameState.dealerHand.push(gameState.deck.pop());

  // ナチュラルブラックジャックチェック
  const playerNatural = hasNaturalBlackjack(gameState.playerHands[0]);
  const dealerNatural = hasNaturalBlackjack(gameState.dealerHand);

  if (playerNatural && dealerNatural) {
    // 両方ナチュラルブラックジャック = プッシュ（引き分け）
    endGame('プッシュ（両方ナチュラルブラックジャック）', 'push');
    return;
  } else if (playerNatural) {
    // プレイヤーのみナチュラルブラックジャック = 3:2ペイアウト
    endGame('ナチュラルブラックジャック！', 'naturalBlackjack');
    return;
  } else if (dealerNatural) {
    // ディーラーのみナチュラルブラックジャック = プレイヤー負け
    // インシュアランスの処理
    if (gameState.insuranceBet > 0) {
      gameState.chips += gameState.insuranceBet * 2;
      endGame('ディーラーナチュラルブラックジャック（インシュアランス勝利）', 'insuranceWin');
    } else {
      endGame('ディーラーナチュラルブラックジャック', 'dealerNatural');
    }
    return;
  }

  updateUI();
  drawGame();
}

function hit() {
  const currentHand = gameState.playerHands[gameState.currentHand];
  
  // ナチュラルブラックジャックの場合はヒット不可
  if (hasNaturalBlackjack(currentHand)) {
    return;
  }
  
  currentHand.push(gameState.deck.pop());

  const handValue = calculateHandValue(currentHand);
  if (handValue > 21) {
    // バスト
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

function doubleDown() {
  const currentHand = gameState.playerHands[gameState.currentHand];
  
  // ナチュラルブラックジャックの場合はダブルダウン不可
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
  
  // ナチュラルブラックジャックの場合はスプリット不可
  if (hasNaturalBlackjack(currentHand)) {
    return;
  }
  
  if (canSplit(currentHand)) {
    gameState.chips -= gameState.currentBet;
    gameState.splitHands = true;

    // 2つ目のハンドを作成
    gameState.playerHands.push([currentHand.pop()]);
    gameState.handBets.push(gameState.currentBet);

    // 各ハンドにカードを1枚ずつ追加
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

  // インシュアランスの処理
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
        // ナチュラルブラックジャック（3:2ペイアウト）
        totalWinnings += Math.floor(handBet * 2.5);
        resultText += `ハンド${i + 1}: ナチュラルBJ勝利！ `;
      } else {
        totalWinnings += handBet * 2;
        resultText += `ハンド${i + 1}: 勝利（ディーラーバスト） `;
      }
    } else if (handValue > dealerValue) {
      if (playerNatural) {
        // ナチュラルブラックジャック（3:2ペイアウト）
        totalWinnings += Math.floor(handBet * 2.5);
        resultText += `ハンド${i + 1}: ナチュラルBJ勝利！ `;
      } else {
        totalWinnings += handBet * 2;
        resultText += `ハンド${i + 1}: 勝利 `;
      }
    } else if (handValue === dealerValue) {
      totalWinnings += handBet;
      resultText += `ハンド${i + 1}: プッシュ `;
    } else {
      resultText += `ハンド${i + 1}: 負け `;
    }
  }

  gameState.chips += totalWinnings;
  endGame(resultText, null);
}

function endGame(message, winType) {
  gameState.gamePhase = 'gameOver';

  if (winType === 'naturalBlackjack') {
    // ナチュラルブラックジャック（3:2ペイアウト）
    gameState.chips += Math.floor(gameState.currentBet * 2.5);
  } else if (winType === 'push') {
    // プッシュ（ベット額を戻す）
    gameState.chips += gameState.currentBet;
  } else if (winType === 'insuranceWin') {
    // インシュアランス勝利の場合は既に処理済み
  }
  // dealerNaturalの場合は何もしない（ベット額は既に差し引かれている）

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

// ゲーム初期化
gameState.deck = createDeck();
updateUI();
drawGame();
