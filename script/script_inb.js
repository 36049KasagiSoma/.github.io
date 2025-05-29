const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const powerElement = document.getElementById('power');
const gameOverElement = document.getElementById('gameOver');

let gameRunning = false;
let score = 0;
let lives = 3;
let level = 1;
let playerPower = 1;
let powerDuration = 0;
let keys = {};
let canShoot = true;
let shootCooldown = 0;

// プレイヤー
const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 60,
  width: 50,
  height: 30,
  speed: 5,
  invulnerable: 0
};

// 弾丸
let bullets = [];
const bulletSpeed = 7;

// エイリアン
let aliens = [];
const alienRows = 4;
const alienCols = 8;
let alienDirection = 1;
let alienSpeed = 1.5;
let alienDropDistance = 25;

// エイリアンの弾丸
let alienBullets = [];
const alienBulletSpeed = 4;

// パワーアップアイテム
let powerUps = [];
const powerUpTypes = ['speed', 'triple', 'rapid', 'shield'];

// ボス
let boss = null;
let bossAppeared = false;

// パーティクル効果
let particles = [];

// 星の背景
let stars = [];

function initStars() {
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: Math.random() * 0.5 + 0.1,
      brightness: Math.random() * 0.8 + 0.2
    });
  }
}

function createParticles(x, y, color, count = 5) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      color: color,
      life: 30,
      maxLife: 30
    });
  }
}

function initGame() {
  score = 0;
  lives = 3;
  level = 1;
  playerPower = 1;
  powerDuration = 0;
  bullets = [];
  alienBullets = [];
  aliens = [];
  powerUps = [];
  particles = [];
  boss = null;
  bossAppeared = false;
  canShoot = true;
  shootCooldown = 0;
  alienSpeed = 1.5;

  initStars();
  createAliens();

  player.x = canvas.width / 2 - 25;
  player.invulnerable = 0;
  updateUI();
}

function createAliens() {
  aliens = [];
  for (let row = 0; row < alienRows; row++) {
    for (let col = 0; col < alienCols; col++) {
      const alienType = row < 2 ? 2 : 1;
      aliens.push({
        x: col * 65 + 80,
        y: row * 45 + 50,
        width: 35,
        height: 25,
        alive: true,
        type: alienType,
        hp: alienType
      });
    }
  }
}

function updateUI() {
  scoreElement.textContent = score;
  livesElement.textContent = lives;
  levelElement.textContent = level;
  powerElement.textContent = playerPower;
}

function startGame() {
  if (!gameRunning) {
    gameRunning = true;
    initGame();
    gameLoop();
  }
}

function goBack() {
  window.location.href = '../index.html';
}

document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function movePlayer() {
  const speed = player.speed + (playerPower > 3 ? 2 : 0);

  if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 0) {
    player.x -= speed;
  }
  if ((keys['ArrowRight'] || keys['KeyD']) && player.x < canvas.width - player.width) {
    player.x += speed;
  }

  if (player.invulnerable > 0) {
    player.invulnerable--;
  }

  if ((keys['Space'] || keys['KeyW']) && canShoot) {
    shoot();
  }
}

// 射撃
function shoot() {
  if (gameRunning && canShoot) {
    const cooldown = playerPower === 2 ? 5 : 10;

    if (playerPower === 3 || playerPower === 4) {
      bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        vx: 0,
        vy: -bulletSpeed
      });
      bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        vx: -2,
        vy: -bulletSpeed
      });
      bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        vx: 2,
        vy: -bulletSpeed
      });
    } else {
      bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        vx: 0,
        vy: -bulletSpeed
      });
    }

    canShoot = false;
    shootCooldown = cooldown;
  }
}

// 射撃クールダウン更新
function updateShootCooldown() {
  if (shootCooldown > 0) {
    shootCooldown--;
    if (shootCooldown === 0) {
      canShoot = true;
    }
  }
}

// 弾丸更新
function updateBullets() {
  bullets = bullets.filter(bullet => {
    bullet.y += bullet.vy;
    bullet.x += bullet.vx;
    return bullet.y > 0 && bullet.x > 0 && bullet.x < canvas.width;
  });
}

// パワーアップアイテム生成
function spawnPowerUp(x, y) {
  if (Math.random() < 0.05) {
    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    powerUps.push({
      x: x,
      y: y,
      width: 20,
      height: 20,
      type: type,
      speed: 2
    });
  }
}

// パワーアップアイテム更新
function updatePowerUps() {
  powerUps = powerUps.filter(powerUp => {
    powerUp.y += powerUp.speed;
    return powerUp.y < canvas.height;
  });
}

// ボス生成
function spawnBoss() {
  boss = {
    x: canvas.width / 2 - 60,
    y: 50,
    width: 120,
    height: 60,
    hp: 30 + level * 5,
    maxHp: 30 + level * 5,
    speed: 2 + Math.floor(level / 3),
    direction: 1,
    shootTimer: 0
  };
}

// ボス更新
function updateBoss() {
  if (!boss) return;

  boss.x += boss.direction * boss.speed;
  if (boss.x <= 0 || boss.x >= canvas.width - boss.width) {
    boss.direction *= -1;
  }

  boss.shootTimer++;
  if (boss.shootTimer >= Math.max(25, 45 - level * 2)) { // ボスの射撃頻度をレベルに応じて上昇
    boss.shootTimer = 0;
    const bulletCount = Math.min(5, 3 + Math.floor(level / 4)); // レベルに応じて弾数増加
    for (let i = 0; i < bulletCount; i++) {
      alienBullets.push({
        x: boss.x + boss.width / 2 - 2 + (i - Math.floor(bulletCount / 2)) * 20,
        y: boss.y + boss.height,
        width: 6,
        height: 12
      });
    }
  }
}

// エイリアン更新
function updateAliens() {
  let shouldDrop = false;

  for (let alien of aliens) {
    if (alien.alive) {
      if ((alien.x <= 0 && alienDirection === -1) ||
        (alien.x >= canvas.width - alien.width && alienDirection === 1)) {
        shouldDrop = true;
        break;
      }
    }
  }

  if (shouldDrop) {
    alienDirection *= -1;
    for (let alien of aliens) {
      if (alien.alive) {
        alien.y += alienDropDistance;
      }
    }
  } else {
    for (let alien of aliens) {
      if (alien.alive) {
        alien.x += alienDirection * alienSpeed;
      }
    }
  }

  // エイリアンが射撃
  if (Math.random() < 0.005 + level * 0.002) {
    const aliveAliens = aliens.filter(alien => alien.alive);
    if (aliveAliens.length > 0) {
      const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
      alienBullets.push({
        x: shooter.x + shooter.width / 2 - 2,
        y: shooter.y + shooter.height,
        width: 4,
        height: 10
      });
    }
  }
}

// エイリアンの弾丸更新
function updateAlienBullets() {
  alienBullets = alienBullets.filter(bullet => {
    bullet.y += alienBulletSpeed;
    return bullet.y < canvas.height;
  });
}

// パーティクル更新
function updateParticles() {
  particles = particles.filter(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life--;
    particle.vx *= 0.98;
    particle.vy *= 0.98;
    return particle.life > 0;
  });
}

// 星の更新
function updateStars() {
  stars.forEach(star => {
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  });
}

// 衝突判定
function checkCollisions() {
  // プレイヤーの弾丸とエイリアン
  bullets.forEach((bullet, bulletIndex) => {
    aliens.forEach((alien, alienIndex) => {
      if (alien.alive &&
        bullet.x < alien.x + alien.width &&
        bullet.x + bullet.width > alien.x &&
        bullet.y < alien.y + alien.height &&
        bullet.y + bullet.height > alien.y) {

        alien.hp--;
        bullets.splice(bulletIndex, 1);

        if (alien.hp <= 0) {
          alien.alive = false;
          score += alien.type * 10;
          createParticles(alien.x + alien.width / 2, alien.y + alien.height / 2,
            '#ff0000');
          spawnPowerUp(alien.x + alien.width / 2, alien.y + alien.height);
        }
        updateUI();
      }
    });

    // ボスとの衝突
    if (boss && bullet.x < boss.x + boss.width &&
      bullet.x + bullet.width > boss.x &&
      bullet.y < boss.y + boss.height &&
      bullet.y + bullet.height > boss.y) {

      boss.hp--;
      bullets.splice(bulletIndex, 1);
      createParticles(bullet.x, bullet.y, '#ffff00');

      if (boss.hp <= 0) {
        score += 500;
        createParticles(boss.x + boss.width / 2, boss.y + boss.height / 2,
          '#ff0000', 15);
        boss = null;
        // ボスを倒したらレベルアップ
        level++;
        alienSpeed += 0.5;
        bossAppeared = false;
        createAliens();
        updateUI();
      }
    }
  });

  // パワーアップアイテムとプレイヤー
  powerUps.forEach((powerUp, index) => {
    if (powerUp.x < player.x + player.width &&
      powerUp.x + powerUp.width > player.x &&
      powerUp.y < player.y + player.height &&
      powerUp.y + powerUp.height > player.y) {

      switch (powerUp.type) {
        case 'speed':
          playerPower = Math.max(playerPower, 1);
          break;
        case 'rapid':
          playerPower = Math.max(playerPower, 2);
          break;
        case 'triple':
          playerPower = Math.max(playerPower, 3);
          break;
        case 'shield':
          playerPower = 4;
          break;
      }
      powerDuration = 600;
      createParticles(powerUp.x, powerUp.y, '#00ff00');
      powerUps.splice(index, 1);
      updateUI();
    }
  });

  // エイリアンの弾丸とプレイヤー
  if (player.invulnerable === 0) {
    alienBullets.forEach((bullet, bulletIndex) => {
      if (bullet.x < player.x + player.width &&
        bullet.x + bullet.width > player.x &&
        bullet.y < player.y + player.height &&
        bullet.y + bullet.height > player.y) {

        alienBullets.splice(bulletIndex, 1);
        lives--;
        player.invulnerable = 120; // 2秒間無敵
        createParticles(player.x + player.width / 2, player.y + player.height / 2,
          '#ff6347');

        if (lives <= 0) {
          endGame();
        }
        updateUI();
      }
    });
  }

  // エイリアンがプレイヤーに到達
  for (let alien of aliens) {
    if (alien.alive && alien.y + alien.height >= player.y) {
      endGame();
      break;
    }
  }
}

// ゲーム終了チェック
function checkGameEnd() {
  const aliveAliens = aliens.filter(alien => alien.alive);
  if (aliveAliens.length === 0 && !boss) {
    if (!bossAppeared && level % 3 === 0) {
      // 3レベルごとにボス出現
      bossAppeared = true;
      spawnBoss();
    } else {
      // 次のレベル
      level++;
      alienSpeed += 0.5;
      createAliens();
      updateUI();
    }
  }
}

// ゲーム終了
function endGame() {
  gameRunning = false;
  gameOverElement.style.display = 'block';
  alert(`ゲームオーバー！\nスコア: ${score}\nレベル: ${level}`);
}
// 描画
function draw() {
  // 背景クリア
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 星の描画
  ctx.fillStyle = '#ffffff';
  stars.forEach(star => {
    ctx.globalAlpha = star.brightness;
    ctx.fillRect(star.x, star.y, 1, 1);
  });
  ctx.globalAlpha = 1;

  // プレイヤー描画（点滅効果付き）
  if (player.invulnerable === 0 || Math.floor(player.invulnerable / 5) % 2 === 0) {
    ctx.fillStyle = playerPower === 4 ? '#00ffff' : '#00ff00'; // シールド時は青
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x + 20, player.y - 5, 10, 5);
  }

  // 弾丸描画
  ctx.fillStyle = '#ffff00';
  bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // エイリアン描画
  aliens.forEach(alien => {
    if (alien.alive) {
      ctx.fillStyle = alien.type === 2 ? '#ff4500' : '#ff0000';
      ctx.fillRect(alien.x, alien.y, alien.width, alien.height);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(alien.x + 6, alien.y + 6, 5, 5);
      ctx.fillRect(alien.x + 20, alien.y + 6, 5, 5);
    }
  });

  // ボス描画
  if (boss) {
    ctx.fillStyle = '#800080';
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

    // ボスHP表示
    const hpBarWidth = 80;
    const hpPercent = boss.hp / boss.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width / 2 - hpBarWidth / 2, 20, hpBarWidth, 6);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(canvas.width / 2 - hpBarWidth / 2, 20, hpBarWidth * hpPercent, 6);
  }

  // パワーアップアイテム描画
  powerUps.forEach(powerUp => {
    const colors = {
      speed: '#00ff00',
      rapid: '#ff8800',
      triple: '#ff00ff',
      shield: '#00ffff'
    };
    ctx.fillStyle = colors[powerUp.type];
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);

    // アイテムの文字
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const text = powerUp.type[0].toUpperCase();
    ctx.fillText(text, powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height /
      2 + 3);
  });

  // エイリアンの弾丸描画
  ctx.fillStyle = '#ff8800';
  alienBullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // パーティクル描画
  particles.forEach(particle => {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 2, 2);
  });
  ctx.globalAlpha = 1;

  ctx.textAlign = 'left';
}

function updatePowerDuration() {
  if (powerDuration > 0) {
    powerDuration--;
    if (powerDuration === 0 && playerPower !== 4) {
      playerPower = 1;
      updateUI();
    }
  }
}

// ゲームループ
function gameLoop() {
  if (gameRunning) {
    movePlayer();
    updateShootCooldown();
    updateBullets();
    updateAliens();
    updateBoss();
    updateAlienBullets();
    updatePowerUps();
    updatePowerDuration();
    updateParticles();
    updateStars();
    checkCollisions();
    checkGameEnd();
    draw();
    requestAnimationFrame(gameLoop);
  }
}

// 初期描画
initStars();
draw();
