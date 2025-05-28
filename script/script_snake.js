const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const gameOverText = document.getElementById("gameOverText");
const restartBtn = document.getElementById("restartBtn");

const gridSize = 20;
const tileCountX = canvas.width / gridSize;
const tileCountY = canvas.height / gridSize;

let dx = 1;
let dy = 0;
let snake = [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }];
let food = {};
let score = 0;
let gameRunning = true;

function generateFood() {
  let valid = false;
  while (!valid) {
    food = {
      x: Math.floor(Math.random() * tileCountX),
      y: Math.floor(Math.random() * tileCountY)
    };
    valid = !snake.some(segment => segment.x === food.x && segment.y === food.y);
  }
}

function drawGame() {
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0095DD";
  for (let segment of snake) {
    ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
  }

  ctx.fillStyle = "#FFD700";
  ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function moveSnake() {
  if (!gameRunning) return;

  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // 壁との衝突判定
  if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
    gameOver();
    return;
  }

  // 自分自身との衝突判定（先頭以外と比較）
  for (let i = 0; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      gameOver();
      return;
    }
  }

  // 頭を追加
  snake.unshift(head);

  // 食べ物との衝突判定
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = `スコア: ${score}`;
    generateFood();
  } else {
    // 食べてないなら尻尾を削除（移動）
    snake.pop();
  }
}

document.addEventListener("keydown", (e) => {
  if (!gameRunning) return;

  const key = e.key.toLowerCase();
  if (["arrowleft", "arrowup", "arrowright", "arrowdown"].includes(key)) {
    e.preventDefault();
  }

  switch (key) {
    case "arrowleft":
    case "a":
      if (dx !== 1) { dx = -1; dy = 0; }
      break;
    case "arrowup":
    case "w":
      if (dy !== 1) { dx = 0; dy = -1; }
      break;
    case "arrowright":
    case "d":
      if (dx !== -1) { dx = 1; dy = 0; }
      break;
    case "arrowdown":
    case "s":
      if (dy !== -1) { dx = 0; dy = 1; }
      break;
  }
});

function gameOver() {
  gameRunning = false;
  gameOverText.style.display = "block";
  restartBtn.style.display = "inline-block";
}

function restartGame() {
  dx = 1;
  dy = 0;
  snake = [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }];
  score = 0;
  scoreElement.textContent = "スコア: 0";
  gameRunning = true;
  gameOverText.style.display = "none";
  restartBtn.style.display = "none";
  generateFood();
}

function gameLoop() {
  moveSnake();
  drawGame();
}

generateFood();
setInterval(gameLoop, 130);
