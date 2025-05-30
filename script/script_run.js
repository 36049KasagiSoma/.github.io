const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ゲーム状態
let gameState = {
  score: 0,
  lives: 3,
  level: 1,
  combo: 0,
  maxCombo: 0,
  gameRunning: true,
  paused: false,
  bossActive: false
};

// プレイヤー
const player = {
  x: 100,
  y: canvas.height - 60,
  width: 25,
  height: 25,
  velY: 0,
  jumping: false,
  color: '#4ECDC4',
  dashCooldown: 0,
  dashDistance: 80,
  maxDashCooldown: 180,
  invulnerable: 0
};

// 射撃システム
let shootCooldown = 0;
const maxShootCooldown = 15; // フレーム数（約0.25秒）

// ゲームオブジェクト
let enemies = [];
let bullets = [];
let powerUps = [];
let stars = [];
let bosses = [];

// キー入力
const keys = {};

// 敵の種類
const enemyTypes = {
  basic: {
    width: 20,
    height: 20,
    speed: 2,
    hp: 1,
    color: '#FF6B6B',
    points: 10
  },
  fast: {
    width: 16,
    height: 16,
    speed: 4,
    hp: 1,
    color: '#FF9500',
    points: 15
  },
  tank: {
    width: 28,
    height: 28,
    speed: 1,
    hp: 3,
    color: '#8B0000',
    points: 30
  },
  zigzag: {
    width: 18,
    height: 18,
    speed: 2.5,
    hp: 2,
    color: '#9932CC',
    points: 20,
    pattern: 'zigzag'
  }
};

// 星背景の初期化
function initStars() {
  stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: Math.random() * 2 + 1,
      size: Math.random() * 2 + 1
    });
  }
}

// 敵の生成
function spawnEnemy() {
  if (Math.random() < 0.02 + gameState.level * 0.005) {
    const types = Object.keys(enemyTypes);
    const randomType = types[Math.floor(Math.random() * types.length)];
    const template = enemyTypes[randomType];

    const enemy = {
      x: canvas.width,
      y: Math.random() * (canvas.height - 120) + 40,
      width: template.width,
      height: template.height,
      speed: template.speed + gameState.level * 0.3,
      hp: template.hp,
      maxHp: template.hp,
      color: template.color,
      points: template.points,
      type: randomType,
      zigzagTime: 0
    };

    enemies.push(enemy);
  }
}

// ボス生成
function spawnBoss() {
  if (gameState.score > 0 && gameState.score % 1000 === 0 && !gameState.bossActive) {
    showBossWarning();
    setTimeout(() => {
      const boss = {
        x: canvas.width,
        y: canvas.height / 2 - 40,
        width: 60,
        height: 80,
        speed: 1,
        hp: 20,
        maxHp: 20,
        color: '#800080',
        points: 500,
        type: 'boss',
        shootTimer: 0,
        movePattern: 0
      };
      bosses.push(boss);
      gameState.bossActive = true;
    }, 2000);
  }
}

function showBossWarning() {
  const warning = document.getElementById('bossWarning');
  warning.style.display = 'block';
  setTimeout(() => {
    warning.style.display = 'none';
  }, 2000);
}

// パワーアップの生成
function spawnPowerUp() {
  if (Math.random() < 0.008) {
    const types = ['score', 'life', 'rapidfire'];
    const type = types[Math.floor(Math.random() * types.length)];

    powerUps.push({
      x: canvas.width,
      y: Math.random() * (canvas.height - 80) + 40,
      width: 16,
      height: 16,
      speed: 1,
      color: type === 'life' ? '#00FF00' : type === 'rapidfire' ? '#FF00FF' : '#FFD700',
      type: type
    });
  }
}

// キーイベント
document.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  keys[e.code] = true;

  if (e.key.toLowerCase() === 'p') {
    togglePause();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
  keys[e.code] = false;
});

// プレイヤー更新
function updatePlayer() {
  // ダッシュクールダウン
  if (player.dashCooldown > 0) {
    player.dashCooldown--;
  }

  // 無敵時間
  if (player.invulnerable > 0) {
    player.invulnerable--;
  }

  // 左右移動
  let moveSpeed = 4;
  if ((keys['a'] || keys['arrowleft']) && player.x > 0) {
    player.x -= moveSpeed;
  }
  if ((keys['d'] || keys['arrowright']) && player.x < canvas.width - player.width) {
    player.x += moveSpeed;
  }

  // ダッシュ（修正版）
  if ((keys['shift'] || keys['shiftleft'] || keys['shiftright']) && player.dashCooldown === 0) {
    let dashDirection = 0;

    if (keys['a'] || keys['arrowleft']) {
      dashDirection = -1;
    } else if (keys['d'] || keys['arrowright']) {
      dashDirection = 1;
    } else {
      // 方向キーが押されていない場合は右にダッシュ
      dashDirection = 1;
    }

    // ダッシュ実行
    const newX = player.x + (player.dashDistance * dashDirection);
    player.x = Math.max(0, Math.min(canvas.width - player.width, newX));

    // クールダウン設定とUI即座更新
    player.dashCooldown = player.maxDashCooldown;
    player.invulnerable = 30;
    
    // UI即座更新（重要：ダッシュ直後にUIを更新）
    updateUI();

    // ダッシュエフェクト強化
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        createParticles(
          player.x + player.width / 2 + (Math.random() - 0.5) * 20,
          player.y + player.height / 2 + (Math.random() - 0.5) * 20,
          '#00FF7F'
        );
      }, i * 50);
    }
  }

  // ジャンプ
  if ((keys['w'] || keys['arrowup']) && !player.jumping) {
    player.velY = -12;
    player.jumping = true;
  }

  // 重力
  player.velY += 0.6;
  player.y += player.velY;

  // 地面判定
  if (player.y >= canvas.height - player.height - 40) {
    player.y = canvas.height - player.height - 40;
    player.jumping = false;
    player.velY = 0;
  }

  // 射撃（クールダウン付き）
  if (shootCooldown > 0) {
    shootCooldown--;
  }

  if ((keys[' '] || keys['space']) && shootCooldown === 0) {
    bullets.push({
      x: player.x + player.width,
      y: player.y + player.height / 2,
      width: 6,
      height: 2,
      speed: 7,
      color: '#FFD700'
    });
    shootCooldown = maxShootCooldown;
  }
}

// 弾丸更新（修正版）
function updateBullets() {
  bullets = bullets.filter(bullet => {
    // 通常の弾丸の移動
    if (!bullet.enemy) {
      bullet.x += bullet.speed;
    } else {
      // ボスの弾丸の移動（修正：ここで位置更新）
      if (bullet.dx && bullet.dy) {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
      } else {
        bullet.x += bullet.speed;
      }
    }

    // 画面外に出た弾丸を削除
    return bullet.x > -bullet.width && bullet.x < canvas.width + bullet.width &&
      bullet.y > -bullet.height && bullet.y < canvas.height + bullet.height;
  });
}

// 敵更新
function updateEnemies() {
  enemies = enemies.filter(enemy => {
    enemy.x -= enemy.speed;

    // ジグザグ敵の特殊動作
    if (enemy.type === 'zigzag') {
      enemy.zigzagTime += 0.1;
      enemy.y += Math.sin(enemy.zigzagTime) * 1.5;
    }

    return enemy.x > -enemy.width;
  });
}

// ボス更新
function updateBosses() {
  bosses = bosses.filter(boss => {
    boss.x -= boss.speed;

    // ボスの動きパターン
    boss.movePattern += 0.05;
    boss.y += Math.sin(boss.movePattern) * 1;

    // ボスの射撃
    boss.shootTimer++;
    if (boss.shootTimer > 60) {
      // ボスの弾丸（プレイヤーに向けて）
      const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
      bullets.push({
        x: boss.x,
        y: boss.y + boss.height / 2,
        width: 5,
        height: 5,
        speed: -4,
        color: '#FF0000',
        enemy: true,
        dx: Math.cos(angle) * 2.5,
        dy: Math.sin(angle) * 2.5
      });
      boss.shootTimer = 0;
    }

    return boss.x > -boss.width && boss.hp > 0;
  });

  if (bosses.length === 0 && gameState.bossActive) {
    gameState.bossActive = false;
  }
}

// パワーアップ更新
function updatePowerUps() {
  powerUps = powerUps.filter(powerUp => {
    powerUp.x -= powerUp.speed;
    return powerUp.x > -powerUp.width;
  });
}

// 星更新
function updateStars() {
  stars.forEach(star => {
    star.x -= star.speed;
    if (star.x < 0) {
      star.x = canvas.width;
      star.y = Math.random() * canvas.height;
    }
  });
}

// 衝突判定（修正版）
function checkCollisions() {
  // プレイヤーの弾丸と敵
  bullets.forEach((bullet, bulletIndex) => {
    if (bullet.enemy) return; // ボスの弾丸はスキップ

    [...enemies, ...bosses].forEach((enemy, enemyIndex) => {
      const isEnemy = enemyIndex < enemies.length;
      const enemyArray = isEnemy ? enemies : bosses;
      const actualIndex = isEnemy ? enemyIndex : enemyIndex - enemies.length;

      if (bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y) {

        enemy.hp--;
        bullets.splice(bulletIndex, 1);

        if (enemy.hp <= 0) {
          createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height /
            2);
          enemyArray.splice(actualIndex, 1);

          // コンボとスコア
          gameState.combo++;
          gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
          const comboMultiplier = Math.min(gameState.combo * 0.1 + 1, 3);
          gameState.score += Math.floor(enemy.points * gameState.level *
            comboMultiplier);
          updateUI();
        } else {
          // ダメージエフェクト
          createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height /
            2, '#FFFF00');
        }
      }
    });
  });

  // ボスの弾丸とプレイヤー（修正：位置更新を削除）
  bullets.forEach((bullet, bulletIndex) => {
    if (!bullet.enemy) return;

    if (bullet.x < player.x + player.width &&
      bullet.x + bullet.width > player.x &&
      bullet.y < player.y + player.height &&
      bullet.y + bullet.height > player.y &&
      player.invulnerable === 0) {

      bullets.splice(bulletIndex, 1);
      gameState.lives--;
      gameState.combo = 0;
      player.invulnerable = 60;
      createExplosion(player.x + player.width / 2, player.y + player.height /
        2);
      updateUI();

      if (gameState.lives <= 0) {
        gameOver();
      }
    }
  });

  // プレイヤーと敵
  [...enemies, ...bosses].forEach((enemy, enemyIndex) => {
    if (player.invulnerable > 0) return;

    if (player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y) {

      const isEnemy = enemyIndex < enemies.length;
      const enemyArray = isEnemy ? enemies : bosses;
      const actualIndex = isEnemy ? enemyIndex : enemyIndex - enemies.length;

      enemyArray.splice(actualIndex, 1);
      gameState.lives--;
      gameState.combo = 0;
      player.invulnerable = 120;
      createExplosion(player.x + player.width / 2, player.y + player.height /
        2);
      updateUI();

      if (gameState.lives <= 0) {
        gameOver();
      }
    }
  });

  // プレイヤーとパワーアップ
  powerUps.forEach((powerUp, powerUpIndex) => {
    if (player.x < powerUp.x + powerUp.width &&
      player.x + player.width > powerUp.x &&
      player.y < powerUp.y + powerUp.height &&
      player.y + player.height > powerUp.y) {

      powerUps.splice(powerUpIndex, 1);

      switch (powerUp.type) {
        case 'score':
          gameState.score += 100;
          break;
        case 'life':
          gameState.lives = Math.min(gameState.lives + 1, 5);
          break;
        case 'rapidfire':
          // 一時的に射撃速度アップ（実装簡略化のため、スコアボーナスに変更）
          gameState.score += 50;
          break;
      }

      createParticles(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height /
        2, powerUp.color);
      updateUI();
    }
  });
}

// 爆発エフェクト
function createExplosion(x, y) {
  for (let i = 0; i < 8; i++) {
    createParticles(x, y, '#FF6B6B');
  }
}

// パーティクル生成
function createParticles(x, y, color) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  particle.style.backgroundColor = color;
  particle.style.left = (canvas.offsetLeft + x) + 'px';
  particle.style.top = (canvas.offsetTop + y) + 'px';
  document.body.appendChild(particle);

  const angle = Math.random() * Math.PI * 2;
  const speed = Math.random() * 80 + 40;
  const dx = Math.cos(angle) * speed;
  const dy = Math.sin(angle) * speed;

  let posX = x;
  let posY = y;
  let alpha = 1;

  const animate = () => {
    posX += dx * 0.02;
    posY += dy * 0.02;
    alpha -= 0.03;

    particle.style.left = (canvas.offsetLeft + posX) + 'px';
    particle.style.top = (canvas.offsetTop + posY) + 'px';
    particle.style.opacity = alpha;

    if (alpha > 0) {
      requestAnimationFrame(animate);
    } else {
      if (document.body.contains(particle)) {
        document.body.removeChild(particle);
      }
    }
  };

  animate();
}

// 描画
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 星背景
  ctx.fillStyle = 'white';
  stars.forEach(star => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // 地面
  ctx.fillStyle = '#444';
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

  // プレイヤー（無敵時の点滅効果）
  if (player.invulnerable === 0 || Math.floor(player.invulnerable / 5) % 2 ===
    0) {
    // ダッシュ効果
    if (player.dashCooldown > player.maxDashCooldown - 30) {
      ctx.shadowColor = '#00FF7F';
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // 影効果をリセット
    ctx.shadowBlur = 0;

    // 目
    ctx.fillStyle = 'white';
    ctx.fillRect(player.x + 4, player.y + 4, 3, 3);
    ctx.fillRect(player.x + 12, player.y + 4, 3, 3);
  }

  // 弾丸
  bullets.forEach(bullet => {
    ctx.fillStyle = bullet.color;
    if (bullet.enemy) {
      ctx.beginPath();
      ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2,
        bullet.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    }
  });

  // 敵
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

    // 敵の目（サイズに応じて調整）
    ctx.fillStyle = 'white';
    const eyeSize = Math.max(2, Math.floor(enemy.width / 8));
    const eyeOffset = Math.floor(enemy.width / 6);
    ctx.fillRect(enemy.x + eyeOffset, enemy.y + eyeOffset, eyeSize, eyeSize);
    ctx.fillRect(enemy.x + enemy.width - eyeOffset - eyeSize, enemy.y +
      eyeOffset, eyeSize, eyeSize);
  });
  bosses.forEach(boss => {
    ctx.fillStyle = boss.color;
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

    // ボスの目
    ctx.fillStyle = 'white';
    ctx.fillRect(boss.x + boss.width - 16, boss.y + 12, 6, 6);

    // ボスのHPバー
    const barWidth = boss.width;
    const barHeight = 8;
    ctx.fillStyle = 'darkred';
    ctx.fillRect(boss.x, boss.y - 15, barWidth, barHeight);
    ctx.fillStyle = 'red';
    ctx.fillRect(boss.x, boss.y - 15, barWidth * (boss.hp / boss.maxHp),
      barHeight);

    // ボス名表示
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BOSS', boss.x + boss.width / 2, boss.y - 20);
  });

  // パワーアップ
  powerUps.forEach(powerUp => {
    ctx.fillStyle = powerUp.color;
    ctx.beginPath();
    ctx.arc(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2,
      powerUp.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // パワーアップのアイコン
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    const symbol = powerUp.type === 'life' ? '♥' : powerUp.type ===
      'rapidfire' ? '⚡' : '$';
    ctx.fillText(symbol, powerUp.x + powerUp.width / 2, powerUp.y + powerUp
      .height / 2 + 4);
  });

  ctx.textAlign = 'left'; // テキスト配置をリセット
}

// UI更新
function updateUI() {
  document.getElementById('score').textContent = gameState.score;
  document.getElementById('lives').textContent = gameState.lives;
  document.getElementById('level').textContent = gameState.level;
  document.getElementById('combo').textContent = gameState.combo;

  // ダッシュクールダウン表示の修正
  const dashElement = document.getElementById('dashCooldown');
  if (dashElement) { // 要素の存在確認
    if (player.dashCooldown > 0) {
      const remainingSeconds = (player.dashCooldown / 60).toFixed(1);
      dashElement.textContent = `${remainingSeconds}s`;
      dashElement.style.color = '#FF6B6B';
    } else {
      dashElement.textContent = 'Ready';
      dashElement.style.color = '#00FF7F';
    }
  }
}


function checkLevelUp() {
  const newLevel = Math.floor(gameState.score / 500) + 1;
  if (newLevel > gameState.level) {
    gameState.level = newLevel;
    createParticles(player.x + player.width / 2, player.y + player.height / 2,
      '#FFD700');
  }
}

// ゲームオーバー
function gameOver() {
  gameState.gameRunning = false;
  document.getElementById('finalScore').textContent = gameState.score;
  document.getElementById('maxCombo').textContent = gameState.maxCombo;
  document.getElementById('gameOverScreen').style.display = 'flex';
}

// ゲームリセット
function resetGame() {
  gameState = {
    score: 0,
    lives: 3,
    level: 1,
    combo: 0,
    maxCombo: 0,
    gameRunning: true,
    paused: false,
    bossActive: false
  };

  player.x = 100;
  player.y = canvas.height - 80;
  player.velY = 0;
  player.jumping = false;
  player.dashCooldown = 0;
  player.invulnerable = 0;

  enemies = [];
  bullets = [];
  powerUps = [];
  bosses = [];
  shootCooldown = 0;

  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('pauseScreen').style.display = 'none';

  updateUI();
}

// ポーズ切り替え
function togglePause() {
  if (!gameState.gameRunning) return;

  gameState.paused = !gameState.paused;
  const pauseScreen = document.getElementById('pauseScreen');
  pauseScreen.style.display = gameState.paused ? 'flex' : 'none';
}

// メインゲームループ
function gameLoop() {
  if (!gameState.gameRunning || gameState.paused) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // 更新
  updatePlayer();
  updateBullets();
  updateEnemies();
  updateBosses();
  updatePowerUps();
  updateStars();

  // 生成
  spawnEnemy();
  spawnPowerUp();
  spawnBoss();

  // 衝突判定
  checkCollisions();

  checkLevelUp();

  // 描画
  draw();
  
  // UI更新を毎フレーム実行（ダッシュクールダウンの滑らかな更新のため）
  updateUI();

  requestAnimationFrame(gameLoop);
}
// ゲーム初期化
function initGame() {
  initStars();
  updateUI();
  gameLoop();
}

// ゲーム開始
initGame();
