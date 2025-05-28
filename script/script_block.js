const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ballRadius = 8;
let x, y, dx, dy;
const paddleHeight = 10;
const paddleWidthBase = 75;
let paddleWidth = paddleWidthBase;
let paddleX;

let rightPressed = false;
let leftPressed = false;

const brickRowCount = 3;
const brickColumnCount = 5;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;

let bricks;
let score = 0;
let speedMultiplier = 1;

function resetBallAndPaddle() {
  x = canvas.width / 2;
  y = canvas.height - 30;
  dx = 2 * speedMultiplier;
  dy = -2 * speedMultiplier;
  paddleWidth = paddleWidthBase / speedMultiplier;
  paddleX = (canvas.width - paddleWidth) / 2;
}

function initBricks() {
  bricks = [];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r] = { x: 0, y: 0, status: 1 };
    }
  }
}

function checkLevelClear() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) return false;
    }
  }
  return true;
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "Right" || e.key === "d" || e.key === "D") {
    rightPressed = true;
  } else if (e.key === "ArrowLeft" || e.key === "Left" || e.key === "a" || e.key === "A") {
    leftPressed = true;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowRight" || e.key === "Right" || e.key === "d" || e.key === "D") {
    rightPressed = false;
  } else if (e.key === "ArrowLeft" || e.key === "Left" || e.key === "a" || e.key === "A") {
    leftPressed = false;
  }
});

function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
          dy = -dy;
          b.status = 0;
          score += 10;
          if (checkLevelClear()) {
            speedMultiplier *= 1.25;
            initBricks();
            resetBallAndPaddle();
          }
        }
      }
    }
  }
}

function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("スコア: " + score, 8, 20);
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#FFD700";
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
        const brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = "#FF6347";
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function gameOver() {
  alert("ゲームオーバー！\nスコア: " + score);
  score = 0;
  speedMultiplier = 1;
  rightPressed = false;
  leftPressed = false;

  initBricks();
  resetBallAndPaddle();
  requestAnimationFrame(draw);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  drawScore();
  collisionDetection();

  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
  }

  if (y + dy < ballRadius) {
    dy = -dy;
  } else if (y + dy > canvas.height - ballRadius) {
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
    } else {
      gameOver();
      return;
    }
  }

  if (rightPressed && paddleX < canvas.width - paddleWidth) {
    paddleX += 5 * speedMultiplier;
  } else if (leftPressed && paddleX > 0) {
    paddleX -= 5 * speedMultiplier;
  }

  x += dx;
  y += dy;

  requestAnimationFrame(draw);
}

// 初期化してゲーム開始
initBricks();
resetBallAndPaddle();
draw();