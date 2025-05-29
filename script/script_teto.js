const canvas = document.getElementById('tetris');
    const ctx = canvas.getContext('2d');
    const sideCanvas = document.getElementById('side');
    const sideCtx = sideCanvas.getContext('2d');

    const ROWS = 20;
    const COLS = 10;
    const BLOCK_SIZE = 20;
    let lockDelay = 0;
    const lockDelayLimit = 500;

    let gameStartTime = 0;
    let currentTime = 0;

    const COLORS = [
      null,
      '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF',
      '#FF8E0D', '#FFE138', '#3877FF'
    ];

    const SHAPES = [
      [],
      [[1,1,1],[0,1,0]],  // T piece
      [[0,2,2],[2,2,0]],  // Z piece
      [[3,3,0],[0,3,3]],  // S piece
      [[4,0,0],[4,4,4]],  // L piece
      [[0,0,5],[5,5,5]],  // J piece
      [
        [0,0,0,0],
        [6,6,6,6],
        [0,0,0,0],
        [0,0,0,0]
      ],        // I piece
      [[7,7],[7,7]]       // O piece
    ];

    // SRS用回転データ（標準的な実装）
    const SRS_OFFSETS = {
      // JLSTZ pieces
     'JLSTZ': {
        0: [[0,0], [0,0], [0,0], [0,0], [0,0]],
        1: [[0,0], [1,0], [1,-1], [0,2], [1,2]],
        2: [[0,0], [0,0], [0,0], [0,0], [0,0]],
        3: [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]]
      },
      // I piece
     'I': {
        0: [[0,0], [-1,0], [2,0], [-1,0], [2,0]],
        1: [[-1,0], [0,0], [0,0], [0,1], [0,-2]],
        2: [[-1,1], [1,1], [-2,1], [1,0], [-2,0]],
        3: [[0,1], [0,1], [0,1], [0,-1], [0,2]]
      },
      // O piece (no rotation)
      'O': {
        0: [[0,0]],
        1: [[0,0]],
        2: [[0,0]],
        3: [[0,0]]
      }
    };

    function createMatrix(w, h){
      const matrix = [];
      for(let i=0; i<h; i++){
        matrix.push(new Array(w).fill(0));
      }
      return matrix;
    }

    function cloneMatrix(matrix) {
      return matrix.map(row => row.slice());
    }


    function drawMatrix(matrix, offset, context, scale=1, alpha=1, blinkRows=[], isLanding=false) {
      matrix.forEach((row, y) => {
        const globalY = y + offset.y;
        row.forEach((value, x) => {
          if(value !== 0){
            const globalX = x + offset.x;
            
            if (blinkRows.includes(globalY)) {
              context.globalAlpha = Math.sin(clearAnimationTime / 50) > 0 ? 1 : 0.2;
            } else {
              context.globalAlpha = alpha;
            }
            
            // 着地アニメーション効果
            let animScale = scale;
            let brightness = 1;
            if (isLanding) {
              const animProgress = Math.min(landAnimationTime / 300, 1);
              const scaleEffect = 1 + 0.1 * Math.sin(animProgress * Math.PI);
              animScale = scale * scaleEffect;
              brightness = 1 + 0.5 * Math.sin(animProgress * Math.PI);
            }
            
            context.fillStyle = COLORS[value];
            if (brightness > 1) {
              // 明度を上げる効果
              const color = COLORS[value];
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);
              context.fillStyle = `rgb(${Math.min(255, r * brightness)}, ${Math.min(255, g * brightness)}, ${Math.min(255, b * brightness)})`;
            }
            
            const blockSize = BLOCK_SIZE * animScale;
            const offsetX = (BLOCK_SIZE - blockSize) / 2;
            const offsetY = (BLOCK_SIZE - blockSize) / 2;
            
            context.fillRect(
              globalX * BLOCK_SIZE * scale + offsetX,
              globalY * BLOCK_SIZE * scale + offsetY,
              blockSize,
              blockSize
            );
            
            context.strokeStyle = '#000';
            context.lineWidth = 1;
            context.strokeRect(
              globalX * BLOCK_SIZE * scale + offsetX,
              globalY * BLOCK_SIZE * scale + offsetY,
              blockSize,
              blockSize
            );
            context.globalAlpha = 1;
          }
        });
      });
    }

    function merge(arena, player){
      const newPiecePositions = [];
      
      player.matrix.forEach((row,y) => {
        row.forEach((value,x) => {
          if(value !== 0){
            const targetY = y + player.pos.y;
            const targetX = x + player.pos.x;
            
            // 範囲チェック
            if (targetY >= 0 && targetY < ROWS && targetX >= 0 && targetX < COLS) {
              arena[targetY][targetX] = value;
              newPiecePositions.push({
                x: targetX,
                y: targetY,
                color: value
              });
            }
          }
        });
      });
      
      // 着地アニメーションを開始
      landedPieces = newPiecePositions;
      landAnimationTime = 0;
      isLandAnimating = true;
    }

    function collide(arena, player){
      const m = player.matrix;
      const o = player.pos;
      for(let y=0; y<m.length; y++){
        for(let x=0; x<m[y].length; x++){
          if(m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0){
            return true;
          }
        }
      }
      return false;
    }

    function rotate(matrix, dir) {
      const res = matrix[0].map((_, i) => matrix.map(row => row[i]));
      if (dir > 0) res.forEach(row => row.reverse());
      else res.reverse();
      matrix.length = 0;
      res.forEach(row => matrix.push(row));
    }

    function createPiece(type){
      switch(type){
        case 'T': return cloneMatrix(SHAPES[1]);
        case 'Z': return cloneMatrix(SHAPES[2]);
        case 'S': return cloneMatrix(SHAPES[3]);
        case 'L': return cloneMatrix(SHAPES[4]);
        case 'J': return cloneMatrix(SHAPES[5]);
        case 'I': return cloneMatrix(SHAPES[6]);
        case 'O': return cloneMatrix(SHAPES[7]);
      }
    }

	 function getNextPieceFromBag() {
	  if (bagIndex >= currentBag.length) {
	    // 新しいバッグを生成
	    currentBag = ['T', 'J', 'L', 'S', 'Z', 'I', 'O'];
	    // Fisher-Yatesアルゴリズムでシャッフル
	    for (let i = currentBag.length - 1; i > 0; i--) {
	      const j = Math.floor(Math.random() * (i + 1));
	      [currentBag[i], currentBag[j]] = [currentBag[j], currentBag[i]];
	    }
	    bagIndex = 0;
	  }
	  return currentBag[bagIndex++];
	}

    let arena = createMatrix(COLS, ROWS);
    let nextQueue = [];
	let currentBag = []; // 追加
	let bagIndex = 0;    // 追加
    let holdMatrix = null;
    let canHold = true;

    // ネクストキューを初期化
    function initializeNextQueue() {
	  nextQueue = [];
	  for (let i = 0; i < 5; i++) {
	    nextQueue.push(createPiece(getNextPieceFromBag())); // 修正
  	　}
    }

    const player = {
      pos: {x:0,y:0},
      matrix: null,
      score: 0,
      rotation: 0,  // 回転状態を追跡
      pieceType: null,  // ピースタイプを追跡
      lastRotation: false  // 最後に回転したかを追跡
    };

    // --- ここからアニメーション用変数 ---
    let clearingRows = [];
    let clearAnimationTime = 0;
    let isClearing = false;
    let landedPieces = [];  // 着地したピースの位置を記録
    let landAnimationTime = 0;
    let isLandAnimating = false;
    // --- ここまで ---

    let gameOver = false;  // ゲームオーバーフラグ

    function playerReset(){
      if (player.score === 0 && gameStartTime === 0) {
        gameStartTime = performance.now();
      }
      // ネクストキューから次のピースを取得
      player.matrix = cloneMatrix(nextQueue.shift());
      nextQueue.push(createPiece(getNextPieceFromBag()));
      
      // ピースタイプを判定（マトリックスから）
      if (player.matrix.length === 2 && player.matrix[0].length === 3 && player.matrix[0][1] === 1) {
        player.pieceType = 'T';
      } else if (player.matrix.length === 1 && player.matrix[0].length === 4) {
        player.pieceType = 'I';
      } else if (player.matrix.length === 2 && player.matrix[0].length === 2) {
        player.pieceType = 'O';
      } else if (player.matrix[0][0] === 0 && player.matrix[0][1] === 2) {
        player.pieceType = 'Z';
      } else if (player.matrix[0][0] === 3 && player.matrix[0][1] === 3) {
        player.pieceType = 'S';
      } else if (player.matrix[0][0] === 4) {
        player.pieceType = 'L';
      } else {
        player.pieceType = 'J';
      }
      
      player.pos.y = 0;
      player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
      player.rotation = 0;
      player.lastRotation = false;
      
      if(collide(arena, player)){
        // 衝突したらゲームオーバー判定
        gameOver = true;
        showGameOverDialog();
      }
      dropInterval = Math.max(50, 1000 - Math.floor(player.score / 500) * 100);

      canHold = true;
    }

    function showGameOverDialog() {
      // ブラウザのconfirmダイアログを表示
      const retry = confirm(`ゲームオーバー！\nスコア: ${player.score}\n\nもう一度プレイしますか？`);
      
      if (retry) {
        restartGame();
      }
    }

    function restartGame() {
      // ゲームオーバーフラグ解除
      gameOver = false;

      // 盤面リセット
      arena = createMatrix(COLS, ROWS);
	　currentBag = [];
  　　bagIndex = 0;
      initializeNextQueue();
      holdMatrix = null;
      canHold = true;

      player.score = 0;
      player.rotation = 0;
      player.pieceType = null;
      player.lastRotation = false;
      dropInterval = 1000;

      playerReset();
      lastTime = 0;
      dropCounter = 0;
      lockDelay = 0;
      isClearing = false;
      clearingRows = [];
      clearAnimationTime = 0;
      landedPieces = [];
      landAnimationTime = 0;
      isLandAnimating = false;
      gameStartTime = 0;
      currentTime = 0;

      update();
    }

    function playerHold() {
      if (!canHold) return;
      if (!holdMatrix) {
        holdMatrix = cloneMatrix(player.matrix);
        playerReset();
      } else {
        const temp = cloneMatrix(player.matrix);
        player.matrix = cloneMatrix(holdMatrix);
        holdMatrix = temp;
        
        // ピースタイプを再判定
        if (player.matrix.length === 2 && player.matrix[0].length === 3 && player.matrix[0][1] === 1) {
          player.pieceType = 'T';
        } else if (player.matrix.length === 1 && player.matrix[0].length === 4) {
          player.pieceType = 'I';
        } else if (player.matrix.length === 2 && player.matrix[0].length === 2) {
          player.pieceType = 'O';  
        } else if (player.matrix[0][0] === 0 && player.matrix[0][1] === 2) {
          player.pieceType = 'Z';
        } else if (player.matrix[0][0] === 3 && player.matrix[0][1] === 3) {
          player.pieceType = 'S';
        } else if (player.matrix[0][0] === 4) {
          player.pieceType = 'L';
        } else {
          player.pieceType = 'J';
        }
        
        player.pos.y = 0;
        player.pos.x = (COLS / 2 | 0) - (player.matrix[0].length / 2 | 0);
        player.rotation = 0;
        player.lastRotation = false;
      }
      canHold = false;
    }

	 function playerDrop(){
	  player.pos.y++;
	  if(collide(arena, player)){
	    player.pos.y--;
	    // スピン判定をmerge前に実行
	    const spinType = checkSpin(arena, player);
	    merge(arena, player);
	    arenaSweep(spinType); // スピン情報を渡す
	    return;
	  } else {
	    lockDelay = 0;
	  }
	  dropCounter = 0;
	}

    function playerMove(dir){
      player.pos.x += dir;
      if(collide(arena, player)){
        player.pos.x -= dir;
      } else {
        lockDelay = 0;
      }
      player.lastRotation = false;
    }

	function checkSpin(arena, player) {
	  if (!player.lastRotation) return null;
	  
	  const px = player.pos.x;
	  const py = player.pos.y;
	  
	  switch(player.pieceType) {
	    case 'T':
	      return checkTSpin(arena, player, px, py);
	    case 'I':
	      return checkISpin(arena, player, px, py);
	    case 'L':
	    case 'J':
	      return checkLJSpin(arena, player, px, py);
	    case 'S':
	    case 'Z':
	      return checkSSpin(arena, player, px, py);
	    default:
	      return null;
	  }
	}

    // Tスピン判定関数
   	function checkTSpin(arena, player, px, py) {
	  const corners = [
	    [px, py],           // 左上
	    [px + 2, py],       // 右上
	    [px, py + 2],       // 左下
	    [px + 2, py + 2]    // 右下
	  ];
	  
	  let filledCorners = 0;
	  corners.forEach(([x, y]) => {
	    if (y < 0 || y >= ROWS || x < 0 || x >= COLS || arena[y][x] !== 0) {
	      filledCorners++;
	    }
	  });
	  
	  if (filledCorners >= 3) {
	    return 'T-SPIN';
	  }
	  return null;
	}
	// I-Spin判定
	function checkISpin(arena, player, px, py) {
	  if (player.rotation % 2 === 0) {
	    // 水平状態 (rotation 0 or 2)
	    const corners = [
	      [px - 1, py],     // 左
	      [px + 4, py],     // 右
	    ];
	    
	    let blockedSides = 0;
	    corners.forEach(([x, y]) => {
	      if (x < 0 || x >= COLS || (y >= 0 && y < ROWS && arena[y][x] !== 0)) {
	        blockedSides++;
	      }
	    });
	    
	    if (blockedSides >= 2) {
	      return 'I-SPIN';
	    }
	  } else {
	    // 垂直状態 (rotation 1 or 3)
	    const corners = [
	      [px, py - 1],     // 上
	      [px, py + 4],     // 下
	    ];
	    
	    let blockedSides = 0;
	    corners.forEach(([x, y]) => {
	      if (y < 0 || y >= ROWS || (x >= 0 && x < COLS && arena[y] && arena[y][x] !== 0)) {
	        blockedSides++;
	      }
	    });
	    
	    if (blockedSides >= 2) {
	      return 'I-SPIN';
	    }
	  }
	  return null;
	}

	// L/J-Spin判定
	function checkLJSpin(arena, player, px, py) {
	  const corners = [
	    [px, py],           // 左上
	    [px + 2, py],       // 右上
	    [px, py + 2],       // 左下
	    [px + 2, py + 2]    // 右下
	  ];
	  
	  let filledCorners = 0;
	  let cornerStates = [];
	  
	  corners.forEach(([x, y]) => {
	    const blocked = y < 0 || y >= ROWS || x < 0 || x >= COLS || arena[y][x] !== 0;
	    cornerStates.push(blocked);
	    if (blocked) {
	      filledCorners++;
	    }
	  });
	  
	  // L/Jピースは3つ以上の角が埋まっていればスピン
	  if (filledCorners >= 3) {
	    return player.pieceType === 'L' ? 'L-SPIN' : 'J-SPIN';
	  }
	  return null;
	}

	// S/Z-Spin判定
	function checkSSpin(arena, player, px, py) {
	  if (player.rotation % 2 === 0) {
	    // 水平状態
	    const checkPoints = [
	      [px - 1, py + 1],     // 左中央
	      [px + 3, py + 1],     // 右中央
	      [px + 1, py - 1],     // 上中央
	      [px + 1, py + 3],     // 下中央
	    ];
	    
	    let blockedPoints = 0;
	    checkPoints.forEach(([x, y]) => {
	      if (y < 0 || y >= ROWS || x < 0 || x >= COLS || 
	          (y >= 0 && y < ROWS && x >= 0 && x < COLS && arena[y][x] !== 0)) {
	        blockedPoints++;
	      }
	    });
	    
	    if (blockedPoints >= 3) {
	      return player.pieceType === 'S' ? 'S-SPIN' : 'Z-SPIN';
	    }
	  } else {
	    // 垂直状態
	    const checkPoints = [
	      [px - 1, py],         // 左上
	      [px - 1, py + 2],     // 左下
	      [px + 2, py],         // 右上
	      [px + 2, py + 2],     // 右下
	    ];
	    
	    let blockedPoints = 0;
	    checkPoints.forEach(([x, y]) => {
	      if (y < 0 || y >= ROWS || x < 0 || x >= COLS || 
	          (y >= 0 && y < ROWS && x >= 0 && x < COLS && arena[y][x] !== 0)) {
	        blockedPoints++;
	      }
	    });
	    
	    if (blockedPoints >= 3) {
	      return player.pieceType === 'S' ? 'S-SPIN' : 'Z-SPIN';
	    }
	  }
	  return null;
	}

	function showSpinIndicator(spinType) {
	  const indicator = document.getElementById('tspinIndicator');
	  indicator.textContent = spinType;
	  indicator.style.opacity = '1';
	  indicator.classList.add('tspin-animation');
	  
	  setTimeout(() => {
	    indicator.style.opacity = '0';
	    indicator.classList.remove('tspin-animation');
	  }, 1000);
	}

	function arenaSweep() {
	  // スピン判定を先に行う（マージ前の状態で）
	  const spinType = checkSpin(arena, player);
	  
	  // 消去可能な行を特定
	  clearingRows = [];
	  for (let y = arena.length - 1; y >= 0; y--) {
	    if (arena[y].every(cell => cell !== 0)) {
	      clearingRows.push(y);
	    }
	  }

	  if (clearingRows.length > 0) {
	    if (spinType) {
	      showSpinIndicator(spinType);
	    }
	    
	    isClearing = true;
	    clearAnimationTime = 0;
	  } else {
	    // ライン消去がない場合は次のピースを出す
	    playerReset();
	  }
	}


      // 修正されたSRS回転システム
    function playerRotate(dir){
      const originalMatrix = cloneMatrix(player.matrix);
      const originalRotation = player.rotation;
      const originalPos = {x: player.pos.x, y: player.pos.y};
  
      rotate(player.matrix, dir);
      const newRotation = (originalRotation + dir + 4) % 4;
  
      // オフセットテーブルを選択
      let offsetTable;
      if (player.pieceType === 'I') {
        offsetTable = SRS_OFFSETS['I'];
      } else if (player.pieceType === 'O') {
        offsetTable = SRS_OFFSETS['O'];
      } else {
        offsetTable = SRS_OFFSETS['JLSTZ'];
      }
  
      const fromOffsets = offsetTable[originalRotation];
      const toOffsets = offsetTable[newRotation];
  
      // 5つのテストを実行
      for (let i = 0; i < fromOffsets.length; i++) {
        const testX = originalPos.x + fromOffsets[i][0] - toOffsets[i][0];
        const testY = originalPos.y + fromOffsets[i][1] - toOffsets[i][1];
        
        player.pos.x = testX;
        player.pos.y = testY;
        
        if (!collide(arena, player)) {
          player.rotation = newRotation;
          lockDelay = 0;
          player.lastRotation = true;
          return;
        }
      }
      
      // 回転失敗時は元に戻す
      player.matrix = originalMatrix;
      player.rotation = originalRotation;
      player.pos = originalPos;
      player.lastRotation = false;
    }

    function playerHardDrop() {
      while (!collide(arena, player)) {
        player.pos.y++;
      }
      player.pos.y--;
      merge(arena, player);
      arenaSweep();
      dropCounter = 0;
    }

    function showTSpinIndicator() {
      const indicator = document.getElementById('tspinIndicator');
      indicator.style.opacity = '1';
      indicator.classList.add('tspin-animation');
      
      setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.classList.remove('tspin-animation');
      }, 1000);
    }

    function drawGrid() {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
      }
    }

    // ゴーストミノ描画関数を追加
    function drawGhost() {
      const ghostPos = {x: player.pos.x, y: player.pos.y};
      while (!collide(arena, {matrix: player.matrix, pos: {x: ghostPos.x, y: ghostPos.y + 1}})) {
        ghostPos.y++;
      }
      drawMatrix(player.matrix, ghostPos, ctx, 1, 0.3);
    }

    function drawSidePanel() {
        sideCtx.fillStyle = '#000';
        sideCtx.fillRect(0, 0, sideCanvas.width, sideCanvas.height);

        sideCtx.fillStyle = 'white';
        sideCtx.font = '14px Arial';
    
        // 経過時間の計算と表示
        if (gameStartTime > 0 && !gameOver) {
            currentTime = performance.now() - gameStartTime;
        }
        const minutes = Math.floor(currentTime / 60000);
        const seconds = Math.floor((currentTime % 60000) / 1000);
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
        sideCtx.fillStyle = 'white';
        sideCtx.fillText('Time', 10, 20);
        sideCtx.font = '16px Arial';
        sideCtx.fillText(timeStr, 10, 40);
    
        // スコア表示
        sideCtx.fillStyle = 'white';
        sideCtx.font = '14px Arial';
        sideCtx.fillText('Score', 10, 65);
        sideCtx.font = '16px Arial';
        sideCtx.fillText(player.score.toString(), 10, 85);
    
        // レベル計算と表示
        sideCtx.fillStyle = 'white';
        const level = Math.floor(player.score / 500) + 1;
        sideCtx.font = '14px Arial';
        sideCtx.fillText('Level', 10, 110);
        sideCtx.font = '16px Arial';
        sideCtx.fillText(level.toString(), 10, 130);
    
        // Hold表示位置を下に移動
        sideCtx.fillStyle = 'white';
        sideCtx.font = '14px Arial';
        sideCtx.fillText('Hold', 10, 160);
        if (holdMatrix) {
            drawMatrix(holdMatrix, {x: 1, y: 12}, sideCtx, 0.7);
        }

        // Next表示位置を下に移動
        sideCtx.fillStyle = 'white';
        sideCtx.font = '14px Arial';
        sideCtx.fillText('Next', 10, 240);
        nextQueue.forEach((matrix, i) => {
            drawMatrix(matrix, {x: 1, y: 18 + i * 3}, sideCtx, 0.7);
        });
    }

    function draw(){
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGrid();
      
      // 通常のアリーナ描画
      drawMatrix(arena, {x:0,y:0}, ctx, 1, 1, clearingRows);
      
      // 着地アニメーション中のピースを特別に描画
      if (isLandAnimating && landedPieces.length > 0) {
        landedPieces.forEach(piece => {
          const animProgress = Math.min(landAnimationTime / 300, 1);
          const scaleEffect = 1 + 0.1 * Math.sin(animProgress * Math.PI);
          const brightness = 1 + 0.5 * Math.sin(animProgress * Math.PI);
          
          ctx.globalAlpha = 1;
          
          // 色の明度を上げる
          const color = COLORS[piece.color];
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          ctx.fillStyle = `rgb(${Math.min(255, r * brightness)}, ${Math.min(255, g * brightness)}, ${Math.min(255, b * brightness)})`;
          
          const blockSize = BLOCK_SIZE * scaleEffect;
          const offsetX = (BLOCK_SIZE - blockSize) / 2;
          const offsetY = (BLOCK_SIZE - blockSize) / 2;
          
          ctx.fillRect(
            piece.x * BLOCK_SIZE + offsetX,
            piece.y * BLOCK_SIZE + offsetY,
            blockSize,
            blockSize
          );
          
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.strokeRect(
            piece.x * BLOCK_SIZE + offsetX,
            piece.y * BLOCK_SIZE + offsetY,
            blockSize,
            blockSize
          );
        });
      }
      
      if (!gameOver) drawGhost();
      drawMatrix(player.matrix, player.pos, ctx);
      drawSidePanel();
    }

    // アニメーション管理変数
    let lastTime = 0;
    let dropCounter = 0;
    let dropInterval = 1000;

    function update(time = 0){
      if(gameOver) {
        draw(); // ゲームオーバー時も画面表示は更新しておく
        return;  // ゲームオーバー時はゲーム停止
      }

      const deltaTime = time - lastTime;
      lastTime = time;
      dropCounter += deltaTime;

      // 着地アニメーション処理
      if (isLandAnimating) {
        landAnimationTime += deltaTime;
        if (landAnimationTime >= 300) {
          isLandAnimating = false;
          landedPieces = [];
          landAnimationTime = 0;
        }
      }

      if (isClearing) {
        clearAnimationTime += deltaTime;

        if (clearAnimationTime > 400) {
		  // スピンボーナススコア計算
		  const spinType = checkSpin(arena, player);
		  let scoreMultiplier = 1;
		  
		  if (spinType) {
		    switch(spinType) {
		      case 'T-SPIN':
		        scoreMultiplier = clearingRows.length === 1 ? 8 : 
		                         clearingRows.length === 2 ? 12 : 16;
		        break;
		      case 'I-SPIN':
		      case 'L-SPIN':
		      case 'J-SPIN':
		        scoreMultiplier = clearingRows.length === 1 ? 4 : 
		                         clearingRows.length === 2 ? 6 : 
		                         clearingRows.length === 3 ? 8 : 10;
		        break;
		      case 'S-SPIN':
		      case 'Z-SPIN':
		        scoreMultiplier = clearingRows.length === 1 ? 3 : 
		                         clearingRows.length === 2 ? 5 : 7;
		        break;
		    }
		  }
          
          // 行を削除する処理を修正
          // 消去対象の行をまず新しいarenaとしてフィルタリング
          const newArena = [];
          let clearedCount = 0;
          
          for (let y = 0; y < arena.length; y++) {
            if (!clearingRows.includes(y)) {
              newArena.push(arena[y].slice());
            } else {
              clearedCount++;
            }
          }
          
          // 削除した行数分だけ、上に空の行を追加
          for (let i = 0; i < clearedCount; i++) {
            newArena.unshift(new Array(COLS).fill(0));
          }
          
          arena = newArena;
          
          // スコア計算
          let baseScore = 0;
          switch(clearingRows.length) {
            case 1: baseScore = 100; break;
            case 2: baseScore = 300; break;
            case 3: baseScore = 500; break;
            case 4: baseScore = 800; break;
            default: baseScore = 100 * clearingRows.length;
          }
          player.score += baseScore * scoreMultiplier;

          clearingRows = [];
          isClearing = false;
          // ライン消去完了後に次のピースを出す
          playerReset();
        }

        draw();
        requestAnimationFrame(update);
        return;
      }

      if(collide(arena, player)){
        lockDelay += deltaTime;
        if(lockDelay >= lockDelayLimit){
          player.pos.y--;
          merge(arena, player);
          arenaSweep();
          dropCounter = 0;
          lockDelay = 0;
        }
      } else {
        lockDelay = 0;
      }

      if(!isClearing && dropCounter > dropInterval){
        playerDrop();
      }

      draw();
      requestAnimationFrame(update);
    }

    document.addEventListener('keydown', event => {
      if (isClearing || gameOver) return; // ゲームオーバー中は操作禁止
      switch(event.key){
        case 'a':
        case 'ArrowLeft':
          playerMove(-1);
          break;
        case 'd':
        case 'ArrowRight':
          playerMove(1);
          break;
        case 'w':
        case 'ArrowUp':
          playerRotate(1);
          break;
        case 's':
        case 'ArrowDown':
          playerDrop();
          break;
        case ' ':
          playerHardDrop();
          break;
        case 'Shift':
          playerHold();
          break;
      }
    });

    initializeNextQueue();
    playerReset();
    update();
