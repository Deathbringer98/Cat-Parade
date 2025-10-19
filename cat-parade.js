// Cat Parade Game - Advanced Cat Clicking Game with 10-Level Progression
// Separated from main content.js for better maintainability

// Cat Parade Game Engine
window.CatParadeGame = {
  // Game configuration and constants
  LEVEL_CONFIG: {
    1: { requirement: 10, trollChance: 0.03, speedBonus: 1.0 },
    2: { requirement: 25, trollChance: 0.05, speedBonus: 1.0 },
    3: { requirement: 50, trollChance: 0.08, speedBonus: 1.1 },
    4: { requirement: 80, trollChance: 0.12, speedBonus: 1.1 },
    5: { requirement: 120, trollChance: 0.15, speedBonus: 1.2 },
    6: { requirement: 170, trollChance: 0.20, speedBonus: 1.2 },
    7: { requirement: 230, trollChance: 0.25, speedBonus: 1.3 },
    8: { requirement: 300, trollChance: 0.30, speedBonus: 1.4 },
    9: { requirement: 380, trollChance: 0.35, speedBonus: 1.5 },
    10: { requirement: 500, trollChance: 0.40, speedBonus: 2.0 }
  },

  CAT_EMOJIS: ["🐱", "😸", "😹", "😻", "😽", "🙀", "😿", "😾", "🐈", "🐈‍⬛"],
  TROLL_CAT_EMOJIS: ["💀", "👹", "👺", "🤡", "👻", "🔥", "💥", "⚡", "🌪️", "💢"],

  // Game state variables
  gameState: {
    score: 0,
    combo: 0,
    maxCombo: 0,
    timeLeft: 60,
    gameActive: true,
    level: 1,
    totalClicks: 0,
    missedCats: 0,
    levelUpFlag: false,
    comboTimeout: null,
    gameInterval: null,
    spawnInterval: null
  },

  // UI elements
  ui: {
    box: null,
    track: null
  },

  // Initialize and start the Cat Parade game
  start: function(gameBox) {
    this.ui.box = gameBox;
    this.resetGameState();
    this.createGameUI();
    this.startGameLoop();
  },

  // Reset game state to initial values
  resetGameState: function() {
    Object.assign(this.gameState, {
      score: 0,
      combo: 0,
      maxCombo: 0,
      timeLeft: 60,
      gameActive: true,
      level: 1,
      totalClicks: 0,
      missedCats: 0,
      levelUpFlag: false,
      comboTimeout: null,
      gameInterval: null,
      spawnInterval: null
    });
  },

  // Create the game UI
  createGameUI: function() {
    this.ui.box.innerHTML = `
      <div class="cpb-header">
        <div class="cpb-score-main" id="score-display">Score: 0</div>
        <div class="cpb-stats-row">
          <div id="timer-display">⏰ 60s</div>
          <div id="level-display">📊 Level: 1</div>
          <div id="combo-display">🔥 Combo: 0x</div>
          <div class="cpb-mute">🔊</div>
          <div class="cpb-close">❌</div>
        </div>
      </div>
      <div class="cpb-track" id="cat-track"></div>
    `;

    this.ui.track = this.ui.box.querySelector('#cat-track');
    this.setupEventHandlers();
  },

  // Setup event handlers for UI elements
  setupEventHandlers: function() {
    this.ui.box.querySelector('.cpb-mute').onclick = () => {
      const btn = this.ui.box.querySelector('.cpb-mute');
      if (window.audioFiles && window.audioFiles.catParade) {
        if (window.audioFiles.catParade.muted) {
          window.audioFiles.catParade.muted = false;
          btn.textContent = "🔊";
        } else {
          window.audioFiles.catParade.muted = true;
          btn.textContent = "🔇";
        }
      }
    };

    this.ui.box.querySelector('.cpb-close').onclick = () => {
      this.endGame();
      if (window.stopGameAudio) window.stopGameAudio();
      const gameOverScreen = document.querySelector('.game-over-screen');
      if (gameOverScreen) gameOverScreen.remove();
      this.ui.box.remove();
    };
  },

  // Start the main game loop
  startGameLoop: function() {
    // Timer countdown
    this.gameState.gameInterval = setInterval(() => {
      if (this.gameState.gameActive) {
        this.gameState.timeLeft--;
        document.getElementById("timer-display").textContent = `⏰ ${this.gameState.timeLeft}s`;
        
        if (this.gameState.timeLeft <= 0) {
          this.endGame();
          
          const timeUpDiv = document.createElement("div");
          timeUpDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #ff0000;
            font-size: 48px;
            font-weight: bold;
            text-shadow: 0 0 20px #ff0000;
            z-index: 9999;
            text-align: center;
            background: rgba(0,0,0,0.8);
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #ff0000;
          `;
          timeUpDiv.textContent = "⏰ TIME'S UP! ⏰";
          this.ui.track.appendChild(timeUpDiv);
          
          setTimeout(() => {
            timeUpDiv.remove();
            this.showGameOver();
          }, 2000);
        }
      }
    }, 1000);

    // Initial cat spawning
    const initialCats = this.gameState.level === 1 ? 15 : Math.min(12 + this.gameState.level, 20);
    for (let i = 0; i < initialCats; i++) {
      setTimeout(() => this.createCat(), i * 100);
    }

    // Continuous cat spawning
    this.startCatSpawning();
  },

  // Start continuous cat spawning
  startCatSpawning: function() {
    const baseSpawnRate = this.gameState.level === 1 ? 700 : Math.max(400, 900 - this.gameState.level * 50);
    
    this.gameState.spawnInterval = setInterval(() => {
      if (this.gameState.gameActive && document.getElementById('cat-track')) {
        this.createCat();
        
        // Chance for double spawn at higher levels
        if (this.gameState.level >= 5 && Math.random() < 0.3) {
          setTimeout(() => this.createCat(), 200);
        }
      }
    }, baseSpawnRate);
  },

  // Particle effect system for successful hits
  createParticleEffect: function(x, y, catType) {
    const colors = {
      'troll': ['#ff0000', '#ff4444'],
      'rare': ['#ffd700', '#ffed4e'],
      'speed': ['#00ff88', '#44ffaa'],
      'giant': ['#ff69b4', '#ff88cc'],
      'normal': ['#ffffff', '#cccccc']
    };
    
    const particleColors = colors[catType] || colors['normal'];
    
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: ${particleColors[Math.floor(Math.random() * particleColors.length)]};
        border-radius: 50%;
        pointer-events: none;
        z-index: 998;
        left: ${x}px;
        top: ${y}px;
      `;
      
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 20 + Math.random() * 30;
      const distance = 30 + Math.random() * 20;
      
      particle.animate([
        { 
          transform: 'translate(0, 0) scale(1)', 
          opacity: 1 
        },
        { 
          transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`, 
          opacity: 0 
        }
      ], {
        duration: 600,
        easing: 'ease-out'
      }).onfinish = () => particle.remove();
      
      this.ui.track.appendChild(particle);
    }
  },

  // Screen flash effect for high-value hits
  createScreenFlash: function(catType) {
    const flash = document.createElement('div');
    const flashColors = {
      'rare': 'rgba(255, 215, 0, 0.15)',
      'giant': 'rgba(255, 105, 180, 0.12)',
      'speed': 'rgba(0, 255, 136, 0.12)',
      'troll': 'rgba(255, 0, 0, 0.1)',
      'combo': 'rgba(255, 0, 255, 0.18)'
    };
    
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: ${flashColors[catType] || 'rgba(255, 255, 255, 0.1)'};
      pointer-events: none;
      z-index: 9999;
      opacity: 1;
    `;
    
    document.body.appendChild(flash);
    
    flash.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: catType === 'combo' ? 400 : 200,
      easing: 'ease-out'
    }).onfinish = () => flash.remove();
  },

  // Firework effect for combo celebrations
  createFirework: function(x, y) {
    const colors = ['#ff0040', '#ff4080', '#ffd700', '#40ff80', '#4080ff', '#ff8040'];
    
    for (let i = 0; i < 12; i++) {
      const spark = document.createElement('div');
      spark.style.cssText = `
        position: absolute;
        width: 3px;
        height: 3px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: 50%;
        pointer-events: none;
        z-index: 999;
        left: ${x}px;
        top: ${y}px;
        box-shadow: 0 0 6px currentColor;
      `;
      
      const angle = (Math.PI * 2 * i) / 12;
      const distance = 40 + Math.random() * 30;
      const duration = 800 + Math.random() * 400;
      
      spark.animate([
        { 
          transform: 'translate(0, 0) scale(1)', 
          opacity: 1 
        },
        { 
          transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 20}px) scale(0)`, 
          opacity: 0 
        }
      ], {
        duration: duration,
        easing: 'ease-out'
      }).onfinish = () => spark.remove();
      
      this.ui.track.appendChild(spark);
    }
  },

  // Create a new cat element
  createCat: function() {
    const cat = document.createElement("div");
    cat.className = "cat";
    
    const currentLevel = Math.min(this.gameState.level, 10);
    const levelConfig = this.LEVEL_CONFIG[currentLevel];
    
    const isTroll = Math.random() < levelConfig.trollChance;
    const isRare = Math.random() < 0.1;
    const isSpeed = Math.random() < 0.15;
    const isGiant = Math.random() < 0.08;
    
    if (isTroll) {
      cat.textContent = this.TROLL_CAT_EMOJIS[Math.floor(Math.random() * this.TROLL_CAT_EMOJIS.length)];
      cat.classList.add("troll-cat");
      const damage = Math.random() < 0.3 ? -10 : Math.random() < 0.6 ? -15 : -25;
      cat.dataset.points = damage;
      cat.dataset.type = "troll";
      cat.style.filter = 'drop-shadow(0 0 6px #ff0000) brightness(1.3) saturate(1.2)';
    } else if (isGiant) {
      cat.textContent = this.CAT_EMOJIS[Math.floor(Math.random() * this.CAT_EMOJIS.length)];
      cat.classList.add("giant-cat");
      cat.dataset.points = "8";
      cat.dataset.type = "giant";
      cat.style.filter = 'drop-shadow(0 0 8px #ff69b4) brightness(1.2) saturate(1.1)';
    } else if (isRare) {
      cat.textContent = this.CAT_EMOJIS[Math.floor(Math.random() * this.CAT_EMOJIS.length)];
      cat.classList.add("rare-cat");
      cat.dataset.points = "6";
      cat.dataset.type = "rare";
      cat.style.filter = 'drop-shadow(0 0 8px #ffd700) brightness(1.4) saturate(1.3)';
    } else if (isSpeed) {
      cat.textContent = this.CAT_EMOJIS[Math.floor(Math.random() * this.CAT_EMOJIS.length)];
      cat.classList.add("speed-cat");
      cat.dataset.points = "4";
      cat.dataset.type = "speed";
      cat.style.filter = 'drop-shadow(0 0 5px #00ff88) brightness(1.2) saturate(1.2)';
    } else {
      cat.textContent = this.CAT_EMOJIS[Math.floor(Math.random() * this.CAT_EMOJIS.length)];
      cat.dataset.points = "1";
      cat.dataset.type = "normal";
    }
    
    const trackHeight = this.ui.track.clientHeight || 650;
    const margin = 80;
    const usableHeight = trackHeight - (margin * 2);
    const top = margin + (Math.random() * usableHeight);
    
    let baseDur;
    if (isGiant) {
      baseDur = Math.max(12, 18 - this.gameState.level * 0.8);
    } else if (isTroll) {
      baseDur = Math.max(1.5, 6 - this.gameState.level * 0.4) * (0.7 + Math.random() * 0.3);
    } else if (isSpeed) {
      baseDur = Math.max(1.2, 4 - this.gameState.level * 0.3) * (0.6 + Math.random() * 0.4);
    } else if (this.gameState.level === 1) {
      baseDur = 8 + Math.random() * 2;
    } else {
      baseDur = Math.max(1.8, 10 - this.gameState.level * 0.8) * levelConfig.speedBonus;
    }
    
    const dur = baseDur.toFixed(2);
    const rtl = Math.random() < 0.5;
    
    cat.style.top = `${top}px`;
    cat.style.animationDuration = `${dur}s`;
    cat.style.left = rtl ? "calc(100% + 80px)" : "-80px";
    if (rtl) cat.classList.add("rtl");
    
    cat.addEventListener('animationend', () => {
      if (cat.parentNode) {
        this.gameState.missedCats++;
        cat.remove();
      }
    });
    
    const maxDuration = parseFloat(dur) + 2;
    setTimeout(() => {
      if (cat.parentNode) {
        cat.remove();
      }
    }, maxDuration * 1000);
    
    this.setupCatClickHandler(cat);
    this.ui.track.appendChild(cat);
  },

  // Setup click handler for a cat
  setupCatClickHandler: function(cat) {
    let clickCount = 0;
    
    cat.onclick = () => {
      if (!this.gameState.gameActive || !this.isValidClick()) return;
      
      clickCount++;
      if (clickCount > 1) return;
      
      this.gameState.totalClicks++;
      cat.classList.add("clicked");
      
      const points = parseInt(cat.dataset.points);
      const catType = cat.dataset.type;
      
      this.handleCatClick(cat, points, catType);
      
      setTimeout(() => {
        cat.remove();
      }, 100);
    };
  },

  // Handle cat click logic
  handleCatClick: function(cat, points, catType) {
    if (catType === "troll") {
      this.handleTrollClick(cat, points);
    } else {
      this.handleNormalClick(cat, points, catType);
    }
  },

  // Handle troll cat click
  handleTrollClick: function(cat, points) {
    const penalty = Math.abs(points);
    this.gameState.score = Math.max(0, this.gameState.score - penalty);
    this.gameState.combo = 0;
    
    this.updateUI();
    
    // Enhanced troll penalty popup
    const penaltyPopup = document.createElement("div");
    penaltyPopup.className = "point-popup troll-penalty";
    penaltyPopup.style.cssText = `
      position: absolute;
      color: #ff0000;
      font-weight: bold;
      font-size: 24px;
      text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
      z-index: 999;
      animation: trollPenaltyFloat 2s ease-out forwards;
      pointer-events: none;
      border: 2px solid #ff0000;
      background: rgba(255, 0, 0, 0.1);
      padding: 4px 8px;
      border-radius: 8px;
    `;
    penaltyPopup.textContent = `-${penalty} GOTCHA!`;
    
    const catLeft = parseFloat(cat.style.left) || 0;
    const catTop = parseFloat(cat.style.top) || 0;
    penaltyPopup.style.left = `${catLeft + 10}px`;
    penaltyPopup.style.top = `${catTop - 20}px`;
    this.ui.track.appendChild(penaltyPopup);
    setTimeout(() => penaltyPopup.remove(), 2000);
    
    // Add screen shake effect using margin
    this.createScreenShake();
  },

  // Handle normal cat click
  handleNormalClick: function(cat, points, catType) {
    this.gameState.combo++;
    this.gameState.maxCombo = Math.max(this.gameState.maxCombo, this.gameState.combo);
    
    // Calculate final points with combo multiplier
    const comboMultiplier = Math.min(Math.floor(this.gameState.combo / 3) + 1, 10);
    const finalPoints = points * comboMultiplier;
    this.gameState.score += finalPoints;
    
    this.updateUI();
    this.createPointPopup(cat, finalPoints, catType, comboMultiplier);
    this.checkLevelUp();
    this.handleComboEffects();
    
    // Reset combo timeout
    if (this.gameState.comboTimeout) {
      clearTimeout(this.gameState.comboTimeout);
    }
    this.gameState.comboTimeout = setTimeout(() => this.resetCombo(), 2000);
  },

  // Create point popup for successful hits
  createPointPopup: function(cat, finalPoints, catType, comboMultiplier) {
    const pointPopup = document.createElement("div");
    pointPopup.className = "point-popup";
    
    let popupColor = '#00ff88';
    let popupSize = '20px';
    let glowEffect = '0 0 8px #00ff88';
    let extraText = '';
    
    if (catType === "rare") {
      popupColor = '#ffd700';
      popupSize = '24px';
      glowEffect = '0 0 15px #ffd700, 0 0 30px #ffd700';
      extraText = ' ✨RARE✨';
    } else if (catType === "speed") {
      popupColor = '#00ff88';
      popupSize = '22px';
      glowEffect = '0 0 12px #00ff88, 0 0 24px #00ff88';
      extraText = ' ⚡FAST⚡';
    } else if (catType === "giant") {
      popupColor = '#ff69b4';
      popupSize = '24px';
      glowEffect = '0 0 12px #ff69b4, 0 0 24px #ff69b4';
      extraText = ' 🔵GIANT🔵';
    } else if (finalPoints >= 10) {
      popupColor = '#ffd700';
      popupSize = '22px';
      glowEffect = '0 0 10px #ffd700';
    }
    
    popupSize = comboMultiplier > 3 ? (parseInt(popupSize) + 4) + 'px' : popupSize;
    
    pointPopup.style.cssText = `
      position: absolute;
      color: ${popupColor};
      font-weight: bold;
      font-size: ${popupSize};
      text-shadow: ${glowEffect};
      z-index: 999;
      animation: ${catType === "rare" ? 'rareScoreFloat' : catType === "speed" ? 'speedScoreFloat' : 'scoreFloat'} 2s ease-out forwards;
      pointer-events: none;
      background: rgba(0,0,0,0.7);
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid ${popupColor};
    `;
    
    pointPopup.textContent = `+${finalPoints}${extraText}`;
    if (comboMultiplier > 1) {
      pointPopup.textContent += ` (${comboMultiplier}x)`;
    }
    
    const catLeft = parseInt(cat.style.left) || 0;
    const catTop = parseInt(cat.style.top) || 0;
    pointPopup.style.left = `${catLeft + 8}px`;
    pointPopup.style.top = `${catTop - 10}px`;
    this.ui.track.appendChild(pointPopup);
    setTimeout(() => pointPopup.remove(), 1500);
    
    // Add particle effect and screen flash
    this.createParticleEffect(catLeft + 25, catTop + 15, catType);
    
    if (catType === "rare" || catType === "giant" || finalPoints >= 10) {
      this.createScreenFlash(catType);
    }
  },

  // Handle combo effects
  handleComboEffects: function() {
    if (this.gameState.combo >= 5 && this.gameState.combo % 5 === 0) {
      const comboPopup = document.createElement("div");
      comboPopup.className = "combo-popup";
      comboPopup.style.cssText = `
        position: absolute;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ff00ff;
        font-weight: bold;
        font-size: 28px;
        text-shadow: 0 0 15px #ff00ff;
        z-index: 1000;
        animation: pulseGlow 2s ease-in-out;
      `;
      comboPopup.textContent = `${this.gameState.combo}x COMBO!`;
      this.ui.track.appendChild(comboPopup);
      setTimeout(() => comboPopup.remove(), 2000);
      
      // Add combo effects
      this.createScreenFlash('combo');
      
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          this.createFirework(Math.random() * this.ui.track.clientWidth, Math.random() * this.ui.track.clientHeight * 0.6);
        }, i * 200);
      }
    }
  },

  // Create screen shake effect
  createScreenShake: function() {
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
      const shakeX = (Math.random() - 0.5) * 10;
      const shakeY = (Math.random() - 0.5) * 6;
      this.ui.box.style.marginLeft = shakeX + 'px';
      this.ui.box.style.marginTop = shakeY + 'px';
      shakeCount++;
      if (shakeCount >= 8) {
        clearInterval(shakeInterval);
        this.ui.box.style.marginLeft = '0px';
        this.ui.box.style.marginTop = '0px';
      }
    }, 60);
  },

  // Update UI displays
  updateUI: function() {
    document.getElementById("score-display").textContent = `Score: ${this.gameState.score}`;
    document.getElementById("combo-display").textContent = `Combo: ${this.gameState.combo}x`;
  },

  // Check for level up
  checkLevelUp: function() {
    const currentLevel = Math.min(this.gameState.level, 10);
    const levelConfig = this.LEVEL_CONFIG[currentLevel];
    
    if (this.gameState.score >= levelConfig.requirement && !this.gameState.levelUpFlag && this.gameState.level < 10) {
      this.gameState.levelUpFlag = true;
      this.gameState.level++;
      
      const levelUpText = document.createElement("div");
      levelUpText.style.cssText = `
        position: absolute;
        top: 30%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ffd700;
        font-weight: bold;
        font-size: 32px;
        text-shadow: 0 0 20px #ffd700;
        z-index: 1001;
        animation: levelUpBounce 3s ease-out;
        text-align: center;
        background: rgba(0,0,0,0.8);
        padding: 15px;
        border-radius: 10px;
        border: 2px solid #ffd700;
      `;
      levelUpText.innerHTML = `🎉 LEVEL UP! 🎉<br>Level ${this.gameState.level}`;
      this.ui.track.appendChild(levelUpText);
      
      setTimeout(() => levelUpText.remove(), 3000);
      document.getElementById("level-display").textContent = `📊 Level: ${this.gameState.level}`;
      
      this.gameState.levelUpFlag = false;
    }
  },

  // Reset combo
  resetCombo: function() {
    this.gameState.combo = 0;
    this.updateUI();
  },

  // Validate click timing
  isValidClick: function() {
    return true; // Simplified for now
  },

  // End the game
  endGame: function() {
    this.gameState.gameActive = false;
    if (this.gameState.gameInterval) clearInterval(this.gameState.gameInterval);
    if (this.gameState.spawnInterval) clearInterval(this.gameState.spawnInterval);
    if (this.gameState.comboTimeout) clearTimeout(this.gameState.comboTimeout);
  },

  // Show game over screen
  showGameOver: function() {
    const gameOverDiv = document.createElement("div");
    gameOverDiv.className = "game-over-screen";
    gameOverDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.95);
      color: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      z-index: 10000;
      border: 2px solid #00ff88;
      min-width: 350px;
    `;
    
    gameOverDiv.innerHTML = `
      <h2 style="color: #00ff88; margin-bottom: 20px; font-size: 28px;">🎮 Game Over! 🎮</h2>
      <p style="margin: 8px 0;"><strong>Final Score:</strong> ${this.gameState.score}</p>
      <p style="margin: 8px 0;"><strong>Max Combo:</strong> ${this.gameState.maxCombo}x</p>
      <p style="margin: 8px 0;"><strong>Level Reached:</strong> ${this.gameState.level}/10 ${this.gameState.level >= 10 ? '✅' : ''}</p>
      <p style="margin: 8px 0;"><strong>Accuracy:</strong> ${this.gameState.totalClicks > 0 ? Math.round(((this.gameState.totalClicks - this.gameState.missedCats) / this.gameState.totalClicks) * 100) : 0}%</p>
    `;
    
    const playAgainBtn = document.createElement("button");
    playAgainBtn.textContent = "🚀 Play Again";
    playAgainBtn.style.cssText = "margin: 15px 8px; padding: 12px 24px; background: #00ff88; color: black; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;";
    playAgainBtn.onclick = () => {
      gameOverDiv.remove();
      this.start(this.ui.box);
    };

    const menuBtn = document.createElement("button");
    menuBtn.textContent = "🏠 Main Menu";
    menuBtn.style.cssText = "margin: 15px 8px; padding: 12px 24px; background: #ff6b35; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;";
    menuBtn.onclick = () => {
      gameOverDiv.remove();
      if (window.showMainMenu) window.showMainMenu();
    };

    gameOverDiv.appendChild(playAgainBtn);
    gameOverDiv.appendChild(menuBtn);
    this.ui.track.appendChild(gameOverDiv);
  }
};