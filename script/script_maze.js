const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let maze = [];
let playerX = 1,
  playerY = 1;
let goalX, goalY;
let coins = [];
let powerUps = [];
let visionItems = [];
let visionExpandItems = [];
let collectedCoins = 0;
let moves = 0;
let startTime = 0;
let gameTime = 0;
let timerInterval = null;
let isGameActive = false;
let canPassWall = false;
let wallPassUsed = false;
let showHint = false;
let solution = [];
let limitVision = true; // 常にON
let visibleCells = new Set();
let baseVisionRange = 3;
let visionRange = 3;
let fullVisionActive = false;
let fullVisionTimer = null;
let zoomLevel = 1.0;
let minCellSize = 4; // 最小セルサイズ
let maxCellSize = 30; // 最大セルサイズ
let viewportMode = false;
let viewportSize = 21; // 表示するセル数（奇数）
let viewportX = 0; // ビューポートの中心X座標
let viewportY = 0; // ビューポートの中心Y座標
let fixedCellSize = 20; // ビューポートモード時の固定セルサイズ
let keysPressed = new Set();
let lastMoveTime = 0;
const MOVE_COOLDOWN = 150; // ミリ秒単位でのクールタイム
let lastPressedKey = null;


// 難易度設定
const difficulties = {
  beginner: {
    width: 11,
    height: 7,
    timeLimit: 120,
    coinCount: 2,
    powerUpCount: 1,
    visionItemCount: 1,
    visionExpandCount: 1
  },
  easy: {
    width: 15,
    height: 10,
    timeLimit: 180,
    coinCount: 3,
    powerUpCount: 1,
    visionItemCount: 2,
    visionExpandCount: 1
  },
  normal: {
    width: 25,
    height: 15,
    timeLimit: 300,
    coinCount: 5,
    powerUpCount: 2,
    visionItemCount: 3,
    visionExpandCount: 2
  },
  hard: {
    width: 35,
    height: 20,
    timeLimit: 420,
    coinCount: 8,
    powerUpCount: 2,
    visionItemCount: 4,
    visionExpandCount: 2
  },
  expert: {
    width: 45,
    height: 25,
    timeLimit: 600,
    coinCount: 12,
    powerUpCount: 3,
    visionItemCount: 5,
    visionExpandCount: 3
  },
  master: {
    width: 55,
    height: 30,
    timeLimit: 900,
    coinCount: 15,
    powerUpCount: 3,
    visionItemCount: 6,
    visionExpandCount: 3
  },
  nightmare: {
    width: 65,
    height: 35,
    timeLimit: 1200,
    coinCount: 20,
    powerUpCount: 4,
    visionItemCount: 7,
    visionExpandCount: 4
  },
  insane: {
    width: 75,
    height: 40,
    timeLimit: 1800,
    coinCount: 25,
    powerUpCount: 5,
    visionItemCount: 8,
    visionExpandCount: 5
  },
  legendary: {
    width: 85,
    height: 45,
    timeLimit: 2400,
    coinCount: 30,
    powerUpCount: 6,
    visionItemCount: 10,
    visionExpandCount: 6
  },
  godlike: {
    width: 95,
    height: 50,
    timeLimit: 3000,
    coinCount: 35,
    powerUpCount: 7,
    visionItemCount: 12,
    visionExpandCount: 7
  },
  impossible: {
    width: 105,
    height: 55,
    timeLimit: 3600,
    coinCount: 40,
    powerUpCount: 8,
    visionItemCount: 15,
    visionExpandCount: 8
  },

  unbeatable: {
    width: 120,
    height: 60,
    timeLimit: 4200,
    coinCount: 50,
    powerUpCount: 10,
    visionItemCount: 18,
    visionExpandCount: 9
  },
  mythic: {
    width: 140,
    height: 70,
    timeLimit: 4800,
    coinCount: 60,
    powerUpCount: 12,
    visionItemCount: 20,
    visionExpandCount: 10
  },
  transcendent: {
    width: 160,
    height: 80,
    timeLimit: 5400,
    coinCount: 70,
    powerUpCount: 13,
    visionItemCount: 22,
    visionExpandCount: 12
  },
  deathwish: {
    width: 180,
    height: 95,
    timeLimit: 6000,
    coinCount: 80,
    powerUpCount: 15,
    visionItemCount: 24,
    visionExpandCount: 14
  },
  devonly: {
    width: 200,
    height: 120,
    timeLimit: 7200,
    coinCount: 100,
    powerUpCount: 17,
    visionItemCount: 30,
    visionExpandCount: 16
  }

};

let currentDifficulty = difficulties.normal;
let cellSize = Math.min(canvas.width / currentDifficulty.width, canvas.height / currentDifficulty.height);

// 全体視界の有効化
function activateFullVision() {
  fullVisionActive = true;
  calculateVisibleCells();
  draw();

  // 5秒後に無効化
  if (fullVisionTimer) {
    clearTimeout(fullVisionTimer);
  }
  fullVisionTimer = setTimeout(() => {
    fullVisionActive = false;
    calculateVisibleCells();
    draw();
  }, 5000);
}

// 迷路生成（深さ優先探索）
function generateMaze() {
  const width = currentDifficulty.width;
  const height = currentDifficulty.height;

  // 迷路の初期化（全て壁）
  maze = [];
  for (let y = 0; y < height; y++) {
    maze[y] = [];
    for (let x = 0; x < width; x++) {
      maze[y][x] = 1; // 1 = 壁, 0 = 通路
    }
  }

  // 深さ優先探索で迷路生成
  const stack = [];
  const startX = 1,
    startY = 1;
  maze[startY][startX] = 0;
  stack.push([startX, startY]);

  const directions = [
    [0, 2],
    [2, 0],
    [0, -2],
    [-2, 0]
  ];

  while (stack.length > 0) {
    const [x, y] = stack[stack.length - 1];
    const neighbors = [];

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && maze[ny][nx] === 1) {
        neighbors.push([nx, ny, x + dx / 2, y + dy / 2]);
      }
    }

    if (neighbors.length > 0) {
      const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
      maze[ny][nx] = 0;
      maze[wy][wx] = 0;
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }

  // プレイヤーとゴールの配置
  playerX = 1;
  playerY = 1;

  // ゴールをランダムに配置（通路の中から選択）
  const emptyCells = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
        emptyCells.push([x, y]);
      }
    }
  }

  if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    [goalX, goalY] = emptyCells[randomIndex];
    maze[goalY][goalX] = 0;
  } else {
    // フォールバック：右下角
    goalX = width - 2;
    goalY = height - 2;
    maze[goalY][goalX] = 0;
  }

  // コインとパワーアップの配置
  placeItems();

  // 最短経路計算
  calculateSolution();

  // ゲーム状態を完全にリセット
  resetGameState();

  // 視界計算
  calculateVisibleCells();

  // 大きな迷路の場合は自動的にビューポートモードを提案
  if (currentDifficulty.width > 25 || currentDifficulty.height > 20) {
    if (!viewportMode) {
      // 自動的にビューポートモードを有効化
      viewportMode = true;
      document.getElementById('viewportMode').checked = true;
      centerOnPlayer();
    }
  } else {
    // 小さな迷路では無効化
    viewportMode = false;
    document.getElementById('viewportMode').checked = false;
  }

  updateDisplay();
  draw();
  resetZoom();
}

// ゲーム状態の完全リセット
function resetGameState() {
  collectedCoins = 0;
  moves = 0;
  canPassWall = false;
  wallPassUsed = false;
  showHint = false;
  isGameActive = true;
  startTime = Date.now();
  gameTime = 0;
  visionRange = baseVisionRange;
  fullVisionActive = false;

  // タイマーの完全リセット
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (fullVisionTimer) {
    clearTimeout(fullVisionTimer);
    fullVisionTimer = null;
  }

  // UI要素の非表示
  document.getElementById('gameOverText').style.display = 'none';
  document.getElementById('gameClearText').style.display = 'none';
  document.getElementById('restartBtn').style.display = 'none';
  document.getElementById('hintBtn').textContent = 'ヒント表示';

  // タイマー開始
  timerInterval = setInterval(updateTimer, 1000);

  // タイマー表示の初期化
  document.getElementById('timer').textContent = '0:00';
}

// アイテム配置
function placeItems() {
  coins = [];
  powerUps = [];
  visionItems = [];
  visionExpandItems = [];

  const emptyCells = [];
  for (let y = 1; y < maze.length - 1; y++) {
    for (let x = 1; x < maze[y].length - 1; x++) {
      if (maze[y][x] === 0 && !(x === 1 && y === 1) && !(x === goalX && y === goalY)) {
        emptyCells.push([x, y]);
      }
    }
  }

  // コイン配置
  for (let i = 0; i < currentDifficulty.coinCount && emptyCells.length > 0; i++) {
    const index = Math.floor(Math.random() * emptyCells.length);
    const [x, y] = emptyCells.splice(index, 1)[0];
    coins.push({
      x,
      y,
      collected: false
    });
  }

  // パワーアップ配置
  for (let i = 0; i < currentDifficulty.powerUpCount && emptyCells.length > 0; i++) {
    const index = Math.floor(Math.random() * emptyCells.length);
    const [x, y] = emptyCells.splice(index, 1)[0];
    powerUps.push({
      x,
      y,
      collected: false
    });
  }

  // 見通しの水晶配置
  for (let i = 0; i < currentDifficulty.visionItemCount && emptyCells.length > 0; i++) {
    const index = Math.floor(Math.random() * emptyCells.length);
    const [x, y] = emptyCells.splice(index, 1)[0];
    visionItems.push({
      x,
      y,
      collected: false
    });
  }

  // 視界拡張アイテム配置
  for (let i = 0; i < currentDifficulty.visionExpandCount && emptyCells.length > 0; i++) {
    const index = Math.floor(Math.random() * emptyCells.length);
    const [x, y] = emptyCells.splice(index, 1)[0];
    visionExpandItems.push({
      x,
      y,
      collected: false
    });
  }
}

// 視界制限の計算
function calculateVisibleCells() {
  visibleCells.clear();

  // 全体視界が有効な場合は全て見える
  if (fullVisionActive) {
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        visibleCells.add(`${x},${y}`);
      }
    }
    return;
  }

  // プレイヤー周辺の可視セルを計算
  for (let dy = -visionRange; dy <= visionRange; dy++) {
    for (let dx = -visionRange; dx <= visionRange; dx++) {
      const x = playerX + dx;
      const y = playerY + dy;

      if (x >= 0 && x < maze[0].length && y >= 0 && y < maze.length) {
        // 距離による減衰
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= visionRange) {
          visibleCells.add(`${x},${y}`);
        }
      }
    }
  }
}

// 最短経路計算（BFS）
function calculateSolution() {
  const queue = [
    [playerX, playerY, []]
  ];
  const visited = new Set();
  const directions = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0]
  ];

  while (queue.length > 0) {
    const [x, y, path] = queue.shift();
    const key = `${x},${y}`;

    if (visited.has(key)) continue;
    visited.add(key);

    if (x === goalX && y === goalY) {
      solution = path;
      return;
    }

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < maze[0].length && ny >= 0 && ny < maze.length &&
        maze[ny][nx] === 0 && !visited.has(`${nx},${ny}`)) {
        queue.push([nx, ny, [...path, [nx, ny]]]);
      }
    }
  }
  solution = [];
}

// タイマー更新
function updateTimer() {
  if (!isGameActive) return;

  gameTime = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(gameTime / 60);
  const seconds = gameTime % 60;
  const timerElement = document.getElementById('timer');
  timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // 残り時間が30秒以下の場合は赤色に変更
  const remainingTime = currentDifficulty.timeLimit - gameTime;
  if (remainingTime <= 30) {
    timerElement.style.color = '#ff6347';
  } else if (remainingTime <= 60) {
    timerElement.style.color = '#ffd700';
  } else {
    timerElement.style.color = 'white';
  }

  if (gameTime >= currentDifficulty.timeLimit) {
    gameOver();
  }
}

// ズーム調整関数
function adjustZoom(direction) {
  const step = 0.2;
  if (direction > 0) {
    zoomLevel = Math.min(zoomLevel + step, 3.0);
  } else {
    zoomLevel = Math.max(zoomLevel - step, 0.3);
  }
  updateCanvasSize();
  draw();
  document.getElementById('zoomLevel').textContent = Math.round(zoomLevel * 100) + '%';
}

function resetZoom() {
  zoomLevel = 1.0;
  updateCanvasSize();
  draw();
  document.getElementById('zoomLevel').textContent = '100%';
}

// キャンバスサイズ更新関数
function updateCanvasSize() {
  const baseWidth = Math.min(800, currentDifficulty.width * 12);
  const baseHeight = Math.min(600, currentDifficulty.height * 12);

  canvas.width = baseWidth * zoomLevel;
  canvas.height = baseHeight * zoomLevel;

  cellSize = Math.max(minCellSize,
    Math.min(maxCellSize,
      Math.min(canvas.width / maze[0].length, canvas.height / maze.length)
    )
  );
}

// ビューポートモード切り替え
function toggleViewportMode() {
  viewportMode = document.getElementById('viewportMode').checked;

  if (viewportMode) {
    // 大きな迷路の場合のみ有効
    if (currentDifficulty.width > 25 || currentDifficulty.height > 20) {
      centerOnPlayer();
      canvas.width = viewportSize * fixedCellSize;
      canvas.height = viewportSize * fixedCellSize;
    } else {
      // 小さな迷路では無効化
      viewportMode = false;
      document.getElementById('viewportMode').checked = false;
      updateCanvasSize();
    }
  } else {
    updateCanvasSize();
  }

  draw();
}

// ビューポートサイズ更新
function updateViewportSize() {
  viewportSize = parseInt(document.getElementById('viewportSize').value);
  if (viewportMode) {
    canvas.width = viewportSize * fixedCellSize;
    canvas.height = viewportSize * fixedCellSize;
    centerOnPlayer();
    draw();
  }
}


// プレイヤーを中心に配置
function centerOnPlayer() {
  viewportX = playerX;
  viewportY = playerY;
}


// 描画範囲計算
function getDrawBounds() {
  if (!viewportMode) {
    return {
      startX: 0,
      endX: maze[0].length,
      startY: 0,
      endY: maze.length,
      offsetX: 0,
      offsetY: 0
    };
  }

  const halfSize = Math.floor(viewportSize / 2);
  const startX = Math.max(0, viewportX - halfSize);
  const endX = Math.min(maze[0].length, viewportX + halfSize + 1);
  const startY = Math.max(0, viewportY - halfSize);
  const endY = Math.min(maze.length, viewportY + halfSize + 1);

  // 描画オフセット（ビューポートが端にある場合の調整）
  const offsetX = (viewportX - halfSize < 0) ? -(viewportX - halfSize) : 0;
  const offsetY = (viewportY - halfSize < 0) ? -(viewportY - halfSize) : 0;

  return {
    startX,
    endX,
    startY,
    endY,
    offsetX,
    offsetY
  };
}


// 描画
function draw() {
  // キャンバスサイズの設定
  if (viewportMode) {
    canvas.width = viewportSize * fixedCellSize;
    canvas.height = viewportSize * fixedCellSize;
    cellSize = fixedCellSize;
  } else {
    updateCanvasSize();
  }

  // 背景描画
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bounds = getDrawBounds();

  // 迷路の描画
  for (let y = bounds.startY; y < bounds.endY; y++) {
    for (let x = bounds.startX; x < bounds.endX; x++) {
      const drawX = (x - bounds.startX + bounds.offsetX) * cellSize;
      const drawY = (y - bounds.startY + bounds.offsetY) * cellSize;

      // 視界制限チェック
      if (limitVision && !visibleCells.has(`${x},${y}`)) {
        ctx.fillStyle = '#000';
        ctx.fillRect(drawX, drawY, cellSize, cellSize);
        continue;
      }

      if (maze[y][x] === 1) {
        // 壁
        ctx.fillStyle = '#555';
        ctx.fillRect(drawX, drawY, cellSize, cellSize);
        if (cellSize > 6) {
          ctx.strokeStyle = '#777';
          ctx.lineWidth = 1;
          ctx.strokeRect(drawX, drawY, cellSize, cellSize);
        }
      } else {
        // 通路
        ctx.fillStyle = '#111';
        ctx.fillRect(drawX, drawY, cellSize, cellSize);
      }
    }
  }

  // ヒント表示
  if (showHint && solution.length > 0) {
    ctx.fillStyle = '#00ff0060';
    for (const [x, y] of solution) {
      if (x >= bounds.startX && x < bounds.endX && y >= bounds.startY && y < bounds.endY) {
        if (!limitVision || visibleCells.has(`${x},${y}`)) {
          const drawX = (x - bounds.startX + bounds.offsetX) * cellSize;
          const drawY = (y - bounds.startY + bounds.offsetY) * cellSize;
          ctx.fillRect(drawX, drawY, cellSize, cellSize);
        }
      }
    }
  }

  // アイテム描画関数
  function drawItemsInBounds(items, drawFunction) {
    items.forEach(item => {
      if (!item.collected &&
        item.x >= bounds.startX && item.x < bounds.endX &&
        item.y >= bounds.startY && item.y < bounds.endY &&
        (!limitVision || visibleCells.has(`${item.x},${item.y}`))) {
        const drawX = (item.x - bounds.startX + bounds.offsetX) * cellSize;
        const drawY = (item.y - bounds.startY + bounds.offsetY) * cellSize;
        drawFunction(drawX, drawY);
      }
    });
  }

  // コイン
  drawItemsInBounds(coins, (drawX, drawY) => {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    const radius = Math.max(2, cellSize / 3);
    ctx.arc(drawX + cellSize / 2, drawY + cellSize / 2, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // パワーアップ
  drawItemsInBounds(powerUps, (drawX, drawY) => {
    ctx.fillStyle = '#ff69b4';
    const size = Math.max(3, cellSize / 2);
    const offset = (cellSize - size) / 2;
    ctx.fillRect(drawX + offset, drawY + offset, size, size);
  });

  // 見通しの水晶
  drawItemsInBounds(visionItems, (drawX, drawY) => {
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    const radius = Math.max(2, cellSize / 2.5);
    ctx.arc(drawX + cellSize / 2, drawY + cellSize / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    if (cellSize > 8) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(8, cellSize/3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('★', drawX + cellSize / 2, drawY + cellSize / 2 + cellSize / 8);
    }
  });

  // 視界拡張アイテム
  drawItemsInBounds(visionExpandItems, (drawX, drawY) => {
    ctx.fillStyle = '#9370db';
    const size = Math.max(4, cellSize * 2 / 3);
    const offset = (cellSize - size) / 2;
    ctx.fillRect(drawX + offset, drawY + offset, size, size);

    if (cellSize > 8) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(8, cellSize/3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('👁', drawX + cellSize / 2, drawY + cellSize / 2 + cellSize / 8);
    }
  });

  // ゴール
  if (goalX >= bounds.startX && goalX < bounds.endX &&
    goalY >= bounds.startY && goalY < bounds.endY &&
    (!limitVision || visibleCells.has(`${goalX},${goalY}`))) {
    const drawX = (goalX - bounds.startX + bounds.offsetX) * cellSize;
    const drawY = (goalY - bounds.startY + bounds.offsetY) * cellSize;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(drawX, drawY, cellSize, cellSize);
    if (cellSize > 6) {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, drawY, cellSize, cellSize);
    }
  }

  // プレイヤー
  if (playerX >= bounds.startX && playerX < bounds.endX &&
    playerY >= bounds.startY && playerY < bounds.endY) {
    const drawX = (playerX - bounds.startX + bounds.offsetX) * cellSize;
    const drawY = (playerY - bounds.startY + bounds.offsetY) * cellSize;
    ctx.fillStyle = canPassWall ? '#00ffff' : '#0080ff';
    ctx.beginPath();
    const playerRadius = Math.max(2, cellSize / 2.5);
    ctx.arc(drawX + cellSize / 2, drawY + cellSize / 2, playerRadius, 0, Math.PI * 2);
    ctx.fill();

    if (cellSize > 6) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

// プレイヤー移動
function movePlayer(dx, dy) {
  if (!isGameActive) return;

  const newX = playerX + dx;
  const newY = playerY + dy;

  if (newX >= 0 && newX < maze[0].length && newY >= 0 && newY < maze.length) {
    if (maze[newY][newX] === 0 || (canPassWall && maze[newY][newX] === 1)) {
      if (canPassWall && maze[newY][newX] === 1) {
        canPassWall = false;
        wallPassUsed = true;
      }

      playerX = newX;
      playerY = newY;
      moves++;

      // ビューポートモード時はプレイヤーを追従
      if (viewportMode) {
        centerOnPlayer();
      }

      // 視界更新
      if (limitVision) {
        calculateVisibleCells();
      }

      // アイテム収集（既存のコード）
      coins.forEach(coin => {
        if (!coin.collected && coin.x === playerX && coin.y === playerY) {
          coin.collected = true;
          collectedCoins++;
        }
      });

      powerUps.forEach(powerUp => {
        if (!powerUp.collected && powerUp.x === playerX && powerUp.y === playerY) {
          powerUp.collected = true;
          canPassWall = true;
        }
      });

      visionItems.forEach(item => {
        if (!item.collected && item.x === playerX && item.y === playerY) {
          item.collected = true;
          activateFullVision();
        }
      });

      visionExpandItems.forEach(item => {
        if (!item.collected && item.x === playerX && item.y === playerY) {
          item.collected = true;
          visionRange += 2;
          calculateVisibleCells();
        }
      });

      // ゴール判定
      if (playerX === goalX && playerY === goalY && collectedCoins === coins.length) {
        gameWin();
      }

      updateDisplay();
      draw();
    }
  }
}

// 表示更新
function updateDisplay() {
  document.getElementById('coins').textContent = collectedCoins;
  document.getElementById('totalCoins').textContent = coins.length;
  document.getElementById('moves').textContent = moves;
  document.getElementById('distance').textContent = solution.length > 0 ? solution.length : '-';

  const limitMinutes = Math.floor(currentDifficulty.timeLimit / 60);
  const limitSeconds = currentDifficulty.timeLimit % 60;
  document.getElementById('timeLimit').textContent = `${limitMinutes}:${limitSeconds.toString().padStart(2, '0')}`;
}

// 難易度更新
function updateDifficulty() {
  const select = document.getElementById('difficultySelect');
  currentDifficulty = difficulties[select.value];
  generateMaze();
}

// ヒント表示切り替え
function showSolution() {
  showHint = !showHint;
  document.getElementById('hintBtn').textContent = showHint ? 'ヒント非表示' : 'ヒント表示';
  draw();
}

//移動処理
function handleMovement(key) {
  const currentTime = Date.now();
  
  if (currentTime - lastMoveTime < MOVE_COOLDOWN) {
    return;
  }
  
  lastMoveTime = currentTime;
  
  // 最後に押されたキーを記録
  lastPressedKey = key;
  
  switch (key) {
    case 'arrowup':
    case 'w':
      movePlayer(0, -1);
      break;
    case 'arrowdown':
    case 's':
      movePlayer(0, 1);
      break;
    case 'arrowleft':
    case 'a':
      movePlayer(-1, 0);
      break;
    case 'arrowright':
    case 'd':
      movePlayer(1, 0);
      break;
  }
  
  // 継続移動は最後に押されたキーのみ
  if (keysPressed.has(key) && lastPressedKey === key) {
    setTimeout(() => {
      if (keysPressed.has(key) && lastPressedKey === key) {
        handleMovement(key);
      }
    }, MOVE_COOLDOWN);
  }
}

// ゲームオーバー
function gameOver() {
  isGameActive = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  document.getElementById('gameOverText').style.display = 'block';
  document.getElementById('restartBtn').style.display = 'inline-block';
}

// ゲームクリア
function gameWin() {
  isGameActive = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  document.getElementById('gameClearText').style.display = 'block';
  document.getElementById('restartBtn').style.display = 'inline-block';
}

// ゲームリセット
function resetGame() {
  generateMaze();
}

// キーボード操作
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  const moveKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd'];
  
  if (moveKeys.includes(key)) {
    e.preventDefault(); // デフォルトのスクロール動作を防ぐ
    
    const wasPressed = keysPressed.has(key);
    keysPressed.add(key);
    
    // 新しいキーが押された場合、または既存キーの再押下の場合
    if (!wasPressed) {
      handleMovement(key);
    }
  }
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  keysPressed.delete(key);
});

// 初期化
generateMaze();
