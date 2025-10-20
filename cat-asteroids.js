// Cat Asteroids Game - Cat-themed Asteroids-style Space Shooter
// Features: 360° ship movement, manual shooting, boss battles every 10k points
// Ship movement: Free movement with thrust, rotation, and screen wrapping
// Lives lost only when hit by cat asteroids, not when they go off-screen

// Cat Asteroids Game Engine
window.CatAsteroidsGame = {
  // Shared helper function for getting extension URLs
  getExtensionURL: function(path) {
    try {
      // Method 1: Use chrome.runtime.getURL (should work in content scripts)
      if (chrome && chrome.runtime && chrome.runtime.getURL) {
        const url = chrome.runtime.getURL(path);
        console.log(`✅ Using chrome.runtime.getURL for ${path}: ${url}`);
        return url;
      }
      // Method 2: Use the helper injected by background.js
      if (window.getExtensionURL) {
        const url = window.getExtensionURL(path);
        console.log(`✅ Using background.js URL helper for ${path}: ${url}`);
        return url;
      }
      // Method 3: Try to construct URL manually if we have extension ID
      if (window.CAT_EXTENSION_ID) {
        const url = `chrome-extension://${window.CAT_EXTENSION_ID}/${path}`;
        console.log(`✅ Using manual URL construction for ${path}: ${url}`);
        return url;
      }
      
      console.error(`❌ No method available to get extension URL for ${path}`);
      return null;
    } catch (e) {
      console.error(`❌ Failed to get extension URL for ${path}:`, e);
      return null;
    }
  },

  // Core game state
  gameState: {
    gameActive: false,
    score: 0,
    lives: 3,
    ship: {
      x: 600, // Horizontal position 
      y: 350, // Vertical position (free movement)
      angle: 0, // Ship rotation in radians
      velocityX: 0, // Horizontal velocity
      velocityY: 0, // Vertical velocity
      thrust: 0.3, // Thrust power
      maxSpeed: 8, // Maximum velocity
      friction: 0.98, // Velocity decay
      turnSpeed: 0.15, // Rotation speed
      width: 30,
      height: 22
    },
    keys: {},
    asteroids: [], // Cat emojis falling from top
    lasers: [], // Player projectiles
    bossProjectiles: [], // Boss cat emoji projectiles
    explosions: [],
    
    // Difficulty and spawning
    spawnRate: 1000, // Base spawn rate (decreases as game progresses)
    baseSpawnRate: 1000,
    asteroidSpeed: 2, // Base falling speed
    difficultyMultiplier: 1, // Controls multiple simultaneous spawns
    lastShotTime: 0,
    shotCooldown: 150, // Auto-fire rate
    
    // Boss battle system
    boss: null,
    bossActive: false,
    bossHP: 0,
    bossMaxHP: 0,
    nextBossScore: 10000,
    bossMultiplier: 1, // Increases HP for each subsequent boss
    
    // Game loops and timing
    gameLoop: null,
    spawnLoop: null,
    difficultyLoop: null,
    
    // Screen dimensions
    gameWidth: 1200,
    gameHeight: 700,
    
    // Effects
    screenShake: 0,
    flashEffect: 0
  },

  // Audio system
  audio: {
    context: null,
    sounds: {},
    music: {
      normal: null,
      boss: null,
      bossWarning: null,
      currentTrack: null
    },
    isPlaying: false, // Flag to prevent multiple music instances
    initialized: false, // Flag to prevent multiple audio initialization
    muted: false
  },

  // UI elements
  ui: {
    box: null,
    gameArea: null,
    scoreDisplay: null,
    livesDisplay: null,
    bossHealthBar: null
  },

  // Initialize and start the Cat Asteroids game
  start: function(gameBox) {
    console.log('Starting Cat Asteroids - Extreme Mode');
    this.ui.box = gameBox;
    this.cleanup(); // Clean any previous game state
    this.initAudio();
    this.createGameUI();
    this.bindUIControls();
    this.resetGameState();
    this.setupEventListeners();
    this.startGameLoop();
    this.playMusic('normal');
  },

  // Clean up previous game state
  cleanup: function() {
    console.log('Cleaning up previous game state');
    
    // Clear all intervals and loops
    if (this.gameState.gameLoop) clearInterval(this.gameState.gameLoop);
    if (this.gameState.spawnLoop) clearInterval(this.gameState.spawnLoop);
    if (this.gameState.difficultyLoop) clearInterval(this.gameState.difficultyLoop);
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    
    // Clear audio completely - stop all audio on page
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Stop our specific tracks
    if (this.audio.music.currentTrack) {
      this.audio.music.currentTrack.pause();
      this.audio.music.currentTrack.currentTime = 0;
      this.audio.music.currentTrack = null;
    }
    
    // Stop all music tracks
    if (this.audio.music.normal) {
      this.audio.music.normal.pause();
      this.audio.music.normal.currentTime = 0;
    }
    if (this.audio.music.boss) {
      this.audio.music.boss.pause();
      this.audio.music.boss.currentTime = 0;
    }
    if (this.audio.music.bossWarning) {
      this.audio.music.bossWarning.pause();
      this.audio.music.bossWarning.currentTime = 0;
    }
    
    // Reset audio flags
    this.audio.isPlaying = false;
    
    console.log('All audio stopped and cleaned up');
    
    // Clean up boss projectiles
    this.gameState.bossProjectiles.forEach(projectile => {
      if (projectile.element) projectile.element.remove();
    });
    this.gameState.bossProjectiles = [];
    
    // Remove any existing game over overlays
    const gameOverScreens = document.querySelectorAll('.game-over-screen, .boss-warning');
    gameOverScreens.forEach(screen => screen.remove());
  },

  // Initialize audio system (only if not already initialized)
  initAudio: function() {
    if (this.audio.initialized) {
      console.log('Audio already initialized, skipping...');
      return;
    }
    
    try {
      // Only create audio context if it doesn't exist
      if (!this.audio.context) {
        this.audio.context = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio context initialized');
      }
      
      // FORCE CREATE ALL AUDIO - NO CONDITIONS
      console.log('🎵 FORCE loading all audio tracks...');
      
      // Normal background music with improved URL handling
      this.audio.music.normal = new Audio();
      const normalMusicUrl = this.getExtensionURL('audio/asteroid-cat-theme.mp3');
      if (normalMusicUrl) {
        this.audio.music.normal.src = normalMusicUrl;
        this.audio.music.normal.loop = true;
        this.audio.music.normal.volume = 0.3;
        this.audio.music.normal.preload = 'auto';
        this.audio.music.normal.load();
        console.log('🎵 FORCED Normal music loaded:', normalMusicUrl);
        
        // Add load event listeners for normal music
        this.audio.music.normal.onloadeddata = () => {
          console.log('✅ Normal music loaded successfully');
        };
        this.audio.music.normal.oncanplaythrough = () => {
          console.log('✅ Normal music ready to play');
        };
        this.audio.music.normal.onerror = (error) => {
          console.error('❌ Normal music failed to load:', error);
          console.error('❌ Normal music URL was:', normalMusicUrl);
          console.error('❌ Check if audio/asteroid-cat-theme.mp3 exists in extension');
        };
      } else {
        console.error('❌ Failed to get normal music URL - no extension URL helper available');
      }

      // Boss battle music
      this.audio.music.boss = new Audio();
      const bossMusicUrl = this.getExtensionURL('audio/BossBattle.mp3');
      if (bossMusicUrl) {
        this.audio.music.boss.src = bossMusicUrl;
        this.audio.music.boss.loop = true;
        this.audio.music.boss.volume = 0.5;
        this.audio.music.boss.preload = 'auto';
        this.audio.music.boss.load();
        console.log('🎵 FORCED Boss music loaded from:', bossMusicUrl);
        
        // Add load event listeners
        this.audio.music.boss.onloadeddata = () => {
          console.log('✅ Boss music loaded successfully');
        };
        this.audio.music.boss.oncanplaythrough = () => {
          console.log('✅ Boss music ready to play');
        };
        this.audio.music.boss.onerror = (error) => {
          console.error('❌ Boss music failed to load:', error);
          console.error('❌ Boss music URL was:', bossMusicUrl);
          console.error('❌ Check if audio/BossBattle.mp3 exists in extension');
        };
      } else {
        console.error('❌ Failed to get boss music URL - no extension URL helper available');
      }
      
      // Boss warning sound (3 seconds)
      this.audio.music.bossWarning = new Audio();
      const bossWarningUrl = this.getExtensionURL('audio/boss-warning.mp3');
      if (bossWarningUrl) {
        this.audio.music.bossWarning.src = bossWarningUrl;
        this.audio.music.bossWarning.loop = false;
        this.audio.music.bossWarning.volume = 0.7;
        this.audio.music.bossWarning.preload = 'auto';
        this.audio.music.bossWarning.load();
        console.log('🎵 FORCED Boss warning loaded from:', bossWarningUrl);
        
        // Add load event listeners
        this.audio.music.bossWarning.onloadeddata = () => {
          console.log('✅ Boss warning audio loaded successfully');
        };
        this.audio.music.bossWarning.oncanplaythrough = () => {
          console.log('✅ Boss warning audio ready to play');
        };
        this.audio.music.bossWarning.onerror = (error) => {
          console.error('❌ Boss warning audio failed to load:', error);
          console.error('❌ Boss warning URL was:', bossWarningUrl);
          console.error('❌ Check if audio/boss-warning.mp3 exists in extension');
        };
      } else {
        console.error('❌ Failed to get boss warning URL - no extension URL helper available');
      }
      
      this.audio.initialized = true;
      console.log('Audio system fully initialized');
    } catch (e) {
      console.log('Audio initialization failed:', e);
    }
  },

  // Create the game UI
  createGameUI: function() {
    this.ui.box.innerHTML = `
      <div class="asteroids-game" style="position: relative; width: 100%; height: 100%; background: linear-gradient(180deg, #000428 0%, #004e92 50%, #000428 100%); overflow: hidden; box-sizing: border-box;">
        
        <!-- Top Score Display -->
        <div class="center-score" style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); color: #00ff88; font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; z-index: 1000; text-shadow: 0 0 10px #00ff88;">
          SCORE: <span id="score-value">0</span>
        </div>
        
        <!-- Lives Display -->
        <div class="lives-display" style="position: absolute; top: 20px; left: 20px; color: #ff4444; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; z-index: 1000;">
          LIVES: <span id="lives-value">3</span>
        </div>
        
        <!-- Boss Health Bar (hidden initially) -->
        <div class="boss-health-container" style="position: absolute; top: 70px; left: 50%; transform: translateX(-50%); width: 400px; height: 20px; background: rgba(0,0,0,0.7); border: 2px solid #ff0000; border-radius: 10px; z-index: 1000; display: none;">
          <div class="boss-health-label" style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); color: #ff0000; font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold;">
            BOSS HP: <span id="boss-hp-value">50</span>
          </div>
          <div class="boss-health-bar" style="width: 100%; height: 100%; background: #ff0000; border-radius: 8px; transition: width 0.3s;"></div>
        </div>
        
        <!-- Control Instructions -->
        <div class="controls-info" style="position: absolute; bottom: 20px; left: 20px; color: #ffffff; font-family: 'Courier New', monospace; font-size: 12px; z-index: 1000; opacity: 0.7;">
          A/D to rotate • W/S to thrust • SPACE to shoot • Cats attack from ALL sides!
        </div>
        
        <!-- Top Right UI Controls -->
        <div class="top-right-controls" style="position: absolute; top: 20px; right: 20px; z-index: 1000; display: flex; gap: 10px;">
          <button id="test-boss-btn" style="background: rgba(255,255,0,0.2); border: 2px solid #ffff00; color: #ffff00; padding: 8px 12px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 12px; cursor: pointer; transition: all 0.3s;">TEST BOSS</button>
          <button id="leaderboards-btn" style="background: rgba(0,255,136,0.2); border: 2px solid #00ff88; color: #00ff88; padding: 8px 12px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 12px; cursor: pointer; transition: all 0.3s;">Leaderboards</button>
          <button id="mute-btn" style="background: rgba(255,255,255,0.2); border: 2px solid #ffffff; color: #ffffff; padding: 8px 12px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 12px; cursor: pointer; transition: all 0.3s;">🔊</button>
          <button id="main-menu-btn" style="background: rgba(255,68,68,0.2); border: 2px solid #ff4444; color: #ff4444; padding: 8px 12px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 12px; cursor: pointer; transition: all 0.3s;">Main Menu</button>
        </div>
        
        <!-- Game Area -->
        <div class="game-area" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 100;">
          <!-- Ship -->
          <div class="player-ship" style="position: absolute; left: 585px; top: 335px; width: 30px; height: 22px; z-index: 200; transform-origin: center;">
            <!-- Main ship triangle -->
            <div class="ship-body" style="width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-bottom: 22px solid #00ff88; filter: drop-shadow(0 0 5px #00ff88);"></div>
            <!-- Thrust flame (hidden by default) -->
            <div class="ship-thrust" style="position: absolute; left: 50%; top: 100%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 16px solid #ff6600; filter: drop-shadow(0 0 8px #ff6600); display: none; z-index: 199;"></div>
          </div>
        </div>
        
        <!-- Stars Background -->
        <div class="stars-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;">
          ${this.generateStars()}
        </div>
      </div>
    `;
    
    // Cache UI elements
    this.ui.gameArea = this.ui.box.querySelector('.game-area');
    this.ui.scoreDisplay = this.ui.box.querySelector('#score-value');
    this.ui.livesDisplay = this.ui.box.querySelector('#lives-value');
    this.ui.bossHealthBar = this.ui.box.querySelector('.boss-health-container');
  },

  // Bind UI control events
  bindUIControls: function() {
    const testBossBtn = this.ui.box.querySelector('#test-boss-btn');
    const leaderboardsBtn = this.ui.box.querySelector('#leaderboards-btn');
    const muteBtn = this.ui.box.querySelector('#mute-btn');
    const mainMenuBtn = this.ui.box.querySelector('#main-menu-btn');

    // Test Boss button (temporary for testing)
    if (testBossBtn) {
      testBossBtn.addEventListener('click', () => {
        this.gameState.score = 10000;
        this.updateUI();
        console.log('Score set to 10k for boss testing');
      });
      
      // Hover effects
      testBossBtn.addEventListener('mouseenter', () => {
        testBossBtn.style.background = 'rgba(255,255,0,0.4)';
        testBossBtn.style.transform = 'scale(1.05)';
      });
      testBossBtn.addEventListener('mouseleave', () => {
        testBossBtn.style.background = 'rgba(255,255,0,0.2)';
        testBossBtn.style.transform = 'scale(1)';
      });
    }

    // Leaderboards button
    if (leaderboardsBtn) {
      leaderboardsBtn.addEventListener('click', () => {
        alert('Leaderboards feature coming soon!');
      });
      
      // Hover effects
      leaderboardsBtn.addEventListener('mouseenter', () => {
        leaderboardsBtn.style.background = 'rgba(0,255,136,0.4)';
        leaderboardsBtn.style.transform = 'scale(1.05)';
      });
      leaderboardsBtn.addEventListener('mouseleave', () => {
        leaderboardsBtn.style.background = 'rgba(0,255,136,0.2)';
        leaderboardsBtn.style.transform = 'scale(1)';
      });
    }

    // Mute button
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.toggleMute();
      });
      
      // Hover effects
      muteBtn.addEventListener('mouseenter', () => {
        muteBtn.style.background = 'rgba(255,255,255,0.4)';
        muteBtn.style.transform = 'scale(1.05)';
      });
      muteBtn.addEventListener('mouseleave', () => {
        muteBtn.style.background = 'rgba(255,255,255,0.2)';
        muteBtn.style.transform = 'scale(1)';
      });
    }

    // Main Menu button
    if (mainMenuBtn) {
      mainMenuBtn.addEventListener('click', () => {
        this.cleanup();
        if (window.showMainMenu) {
          window.showMainMenu();
        } else {
          console.log('Main menu function not available');
        }
      });
      
      // Hover effects
      mainMenuBtn.addEventListener('mouseenter', () => {
        mainMenuBtn.style.background = 'rgba(255,68,68,0.4)';
        mainMenuBtn.style.transform = 'scale(1.05)';
      });
      mainMenuBtn.addEventListener('mouseleave', () => {
        mainMenuBtn.style.background = 'rgba(255,68,68,0.2)';
        mainMenuBtn.style.transform = 'scale(1)';
      });
    }
  },

  // Generate animated star background
  generateStars: function() {
    let starsHtml = '';
    for (let i = 0; i < 100; i++) {
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 3;
      
      starsHtml += `
        <div style="
          position: absolute; 
          left: ${x}%; 
          top: ${y}%; 
          width: ${size}px; 
          height: ${size}px; 
          background: white; 
          border-radius: 50%;
          opacity: 0.8;
          animation: twinkle 3s infinite ${delay}s;
        "></div>
      `;
    }
    return starsHtml;
  },

  // Reset game state for new game
  resetGameState: function() {
    console.log('Resetting game state');
    this.gameState.gameActive = true;
    this.gameState.score = 0;
    this.gameState.lives = 3;
    this.gameState.ship.x = 600;
    this.gameState.ship.y = 350;
    this.gameState.ship.angle = 0;
    this.gameState.ship.velocityX = 0;
    this.gameState.ship.velocityY = 0;
    this.gameState.asteroids = [];
    this.gameState.lasers = [];
    this.gameState.bossProjectiles = [];
    this.gameState.explosions = [];
    this.gameState.boss = null;
    this.gameState.bossActive = false;
    this.gameState.bossHP = 0;
    this.gameState.bossMaxHP = 0;
    this.gameState.nextBossScore = 10000;
    this.gameState.bossMultiplier = 1;
    this.gameState.spawnRate = this.gameState.baseSpawnRate;
    this.gameState.asteroidSpeed = 2;
    this.gameState.difficultyMultiplier = 1;
    this.gameState.screenShake = 0;
    this.gameState.flashEffect = 0;
    
    this.updateUI();
  },

  // Setup keyboard event listeners
  setupEventListeners: function() {
    // Bind functions to preserve 'this' context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  },

  // Handle key press events
  handleKeyDown: function(e) {
    if (!this.gameState.gameActive) return;
    
    this.gameState.keys[e.key.toLowerCase()] = true;
    this.gameState.keys[e.code] = true;
    
    // Handle spacebar specifically
    if (e.key === ' ') {
      this.gameState.keys['space'] = true;
    }
    
    // Prevent default for game keys
    if (['a', 'd', 'w', 's', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(e.key.toLowerCase()) || e.key === ' ') {
      e.preventDefault();
    }
  },

  // Handle key release events
  handleKeyUp: function(e) {
    this.gameState.keys[e.key.toLowerCase()] = false;
    this.gameState.keys[e.code] = false;
    
    // Handle spacebar specifically
    if (e.key === ' ') {
      this.gameState.keys['space'] = false;
    }
  },

  // Start main game loop
  startGameLoop: function() {
    console.log('Starting game loops');
    
    // Main game update loop (60 FPS)
    this.gameState.gameLoop = setInterval(() => this.update(), 16);
    
    // Asteroid spawning loop (varies by difficulty)
    this.gameState.spawnLoop = setInterval(() => this.spawnAsteroid(), this.gameState.spawnRate);
    
    // Difficulty progression loop (every 10 seconds)
    this.gameState.difficultyLoop = setInterval(() => this.increaseDifficulty(), 10000);
  },

  // Main game update function
  update: function() {
    if (!this.gameState.gameActive) return;
    
    this.updateShipMovement();
    this.updateShooting();
    this.updateLasers();
    this.updateAsteroids();
    this.updateBoss();
    this.updateBossProjectiles();
    this.updateExplosions();
    this.checkCollisions();
    this.updateEffects();
    this.checkBossSpawn();
    this.updateUI();
  },

  // Update ship movement with Asteroids-style physics
  updateShipMovement: function() {
    const ship = this.gameState.ship;
    const keys = this.gameState.keys;
    
    // Rotation controls (A/D or Left/Right arrows)
    if (keys['a'] || keys['arrowleft']) {
      ship.angle -= ship.turnSpeed;
    }
    if (keys['d'] || keys['arrowright']) {
      ship.angle += ship.turnSpeed;
    }
    
    // Thrust controls (W/S or Up/Down arrows)
    if (keys['w'] || keys['arrowup']) {
      // Forward thrust
      ship.velocityX += Math.cos(ship.angle - Math.PI/2) * ship.thrust;
      ship.velocityY += Math.sin(ship.angle - Math.PI/2) * ship.thrust;
    }
    if (keys['s'] || keys['arrowdown']) {
      // Reverse thrust
      ship.velocityX -= Math.cos(ship.angle - Math.PI/2) * ship.thrust;
      ship.velocityY -= Math.sin(ship.angle - Math.PI/2) * ship.thrust;
    }
    
    // Apply friction
    ship.velocityX *= ship.friction;
    ship.velocityY *= ship.friction;
    
    // Limit maximum speed
    const speed = Math.sqrt(ship.velocityX * ship.velocityX + ship.velocityY * ship.velocityY);
    if (speed > ship.maxSpeed) {
      ship.velocityX = (ship.velocityX / speed) * ship.maxSpeed;
      ship.velocityY = (ship.velocityY / speed) * ship.maxSpeed;
    }
    
    // Update position
    ship.x += ship.velocityX;
    ship.y += ship.velocityY;
    
    // Screen wrapping (classic Asteroids behavior)
    if (ship.x < -20) ship.x = this.gameState.gameWidth + 20;
    if (ship.x > this.gameState.gameWidth + 20) ship.x = -20;
    if (ship.y < -20) ship.y = this.gameState.gameHeight + 20;
    if (ship.y > this.gameState.gameHeight + 20) ship.y = -20;
    
    // Update ship visual position and rotation
    const shipElement = this.ui.box.querySelector('.player-ship');
    const thrustElement = this.ui.box.querySelector('.ship-thrust');
    if (shipElement) {
      shipElement.style.left = ship.x + 'px';
      shipElement.style.top = ship.y + 'px';
      shipElement.style.transform = `rotate(${ship.angle}rad)`;
      
      // Show/hide thrust flame based on input
      if (thrustElement) {
        if (keys['w'] || keys['arrowup'] || keys['s'] || keys['arrowdown']) {
          thrustElement.style.display = 'block';
          // Add flickering effect
          thrustElement.style.borderTopColor = Math.random() > 0.5 ? '#ff6600' : '#ffaa00';
        } else {
          thrustElement.style.display = 'none';
        }
      }
    }
  },

  // Manual shooting system (spacebar)
  updateShooting: function() {
    const keys = this.gameState.keys;
    const now = Date.now();
    
    // Shoot when spacebar is pressed (with cooldown)
    if (keys[' '] || keys['space'] || keys['Space']) {
      if (now - this.gameState.lastShotTime > this.gameState.shotCooldown) {
        this.fireLaser();
        this.gameState.lastShotTime = now;
      }
    }
  },

  // Fire laser projectile in ship's facing direction
  fireLaser: function() {
    const ship = this.gameState.ship;
    
    // Calculate laser spawn position (front of smaller ship)
    const spawnDistance = 20;
    const spawnX = ship.x + 15 + Math.cos(ship.angle - Math.PI/2) * spawnDistance;
    const spawnY = ship.y + 11 + Math.sin(ship.angle - Math.PI/2) * spawnDistance;
    
    const laser = {
      x: spawnX,
      y: spawnY,
      velocityX: Math.cos(ship.angle - Math.PI/2) * 15, // Laser velocity in ship's direction
      velocityY: Math.sin(ship.angle - Math.PI/2) * 15,
      width: 4,
      height: 8,
      life: 60, // Frames before laser expires
      element: null
    };
    
    // Create laser element
    laser.element = document.createElement('div');
    laser.element.style.cssText = `
      position: absolute;
      left: ${laser.x}px;
      top: ${laser.y}px;
      width: ${laser.width}px;
      height: ${laser.height}px;
      background: linear-gradient(0deg, #00ff88, #ffffff);
      border-radius: 2px;
      box-shadow: 0 0 10px #00ff88;
      z-index: 150;
      transform: rotate(${ship.angle}rad);
    `;
    
    this.ui.gameArea.appendChild(laser.element);
    this.gameState.lasers.push(laser);
    
    // Play laser sound
    this.playSound('laser');
  },

  // Update all lasers with directional movement
  updateLasers: function() {
    for (let i = this.gameState.lasers.length - 1; i >= 0; i--) {
      const laser = this.gameState.lasers[i];
      
      // Move laser in its direction
      laser.x += laser.velocityX;
      laser.y += laser.velocityY;
      laser.life--;
      
      // Update visual position
      laser.element.style.left = laser.x + 'px';
      laser.element.style.top = laser.y + 'px';
      
      // Remove if off screen or life expired
      if (laser.life <= 0 || 
          laser.x < -50 || laser.x > this.gameState.gameWidth + 50 ||
          laser.y < -50 || laser.y > this.gameState.gameHeight + 50) {
        laser.element.remove();
        this.gameState.lasers.splice(i, 1);
      }
    }
  },

  // Spawn asteroid (cat emoji)
  spawnAsteroid: function() {
    if (!this.gameState.gameActive || this.gameState.bossActive) return;
    
    const spawnCount = 1 + Math.floor(Math.random() * this.gameState.difficultyMultiplier);
    for (let i = 0; i < spawnCount; i++) {
      setTimeout(() => this.createSingleAsteroid(), i * 200);
    }
  },

  // Create a single asteroid from any side with proper directional movement
  createSingleAsteroid: function() {
    if (!this.gameState.gameActive || this.gameState.bossActive) return;
    
    // Different cat types with varying difficulty
    const catEmojis = ['😾', '🙀', '😿', '😸', '😺', '😼', '🐱', '🐈', '😻', '😽'];
    const rareCats = ['👹', '😈', '💀']; // Dangerous cats (more points, faster)
    
    // Determine cat type based on difficulty
    const difficultyLevel = Math.floor(this.gameState.score / 5000);
    const isRare = Math.random() < (0.1 + difficultyLevel * 0.05);
    const emoji = isRare ? rareCats[Math.floor(Math.random() * rareCats.length)] : 
                          catEmojis[Math.floor(Math.random() * catEmojis.length)];
    
    // Randomly choose spawn side: 0=top, 1=right, 2=bottom, 3=left
    const spawnSide = Math.floor(Math.random() * 4);
    const baseSpeed = this.gameState.asteroidSpeed + Math.random() * 2 + (isRare ? 2 : 0);
    
    const asteroid = {
      size: 30 + Math.random() * 20,
      emoji: emoji,
      isRare: isRare,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 5,
      spawnSide: spawnSide,
      element: null
    };
    
    // Set spawn position and velocity based on spawn side
    switch (spawnSide) {
      case 0: // Top
        asteroid.x = Math.random() * (this.gameState.gameWidth - 60);
        asteroid.y = -50;
        asteroid.velocityX = (Math.random() - 0.5) * 2; // Slight horizontal drift
        asteroid.velocityY = baseSpeed;
        break;
      case 1: // Right
        asteroid.x = this.gameState.gameWidth + 50;
        asteroid.y = Math.random() * (this.gameState.gameHeight - 60);
        asteroid.velocityX = -baseSpeed;
        asteroid.velocityY = (Math.random() - 0.5) * 2; // Slight vertical drift
        break;
      case 2: // Bottom
        asteroid.x = Math.random() * (this.gameState.gameWidth - 60);
        asteroid.y = this.gameState.gameHeight + 50;
        asteroid.velocityX = (Math.random() - 0.5) * 2; // Slight horizontal drift
        asteroid.velocityY = -baseSpeed;
        break;
      case 3: // Left
        asteroid.x = -50;
        asteroid.y = Math.random() * (this.gameState.gameHeight - 60);
        asteroid.velocityX = baseSpeed;
        asteroid.velocityY = (Math.random() - 0.5) * 2; // Slight vertical drift
        break;
    }
    
    // Add subtle homing behavior to prevent camping
    const shipCenterX = this.gameState.ship.x + 15; // Ship center
    const shipCenterY = this.gameState.ship.y + 11; // Ship center
    const deltaX = shipCenterX - asteroid.x;
    const deltaY = shipCenterY - asteroid.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Apply slight homing drift (10% of movement toward player)
    const homingStrength = 0.1;
    if (distance > 0) {
      asteroid.velocityX += (deltaX / distance) * baseSpeed * homingStrength;
      asteroid.velocityY += (deltaY / distance) * baseSpeed * homingStrength;
    }
    
    // Create asteroid element
    asteroid.element = document.createElement('div');
    asteroid.element.style.cssText = `
      position: absolute;
      left: ${asteroid.x}px;
      top: ${asteroid.y}px;
      font-size: ${asteroid.size}px;
      user-select: none;
      pointer-events: none;
      z-index: 120;
      transform: rotate(${asteroid.rotation}deg);
      filter: ${isRare ? 'drop-shadow(0 0 10px red)' : 'drop-shadow(0 0 5px rgba(255,255,255,0.5))'};
    `;
    asteroid.element.textContent = emoji;
    
    this.ui.gameArea.appendChild(asteroid.element);
    this.gameState.asteroids.push(asteroid);
  },

  // Update all asteroids
  updateAsteroids: function() {
    for (let i = this.gameState.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.gameState.asteroids[i];
      
      // Use velocity-based movement for multi-directional spawning
      if (asteroid.velocityX !== undefined && asteroid.velocityY !== undefined) {
        asteroid.x += asteroid.velocityX;
        asteroid.y += asteroid.velocityY;
      } else {
        // Fallback for any old asteroids still using speed-only system
        asteroid.y += asteroid.speed || 3;
      }
      
      asteroid.rotation += asteroid.rotationSpeed;
      
      // Update visual position and rotation
      asteroid.element.style.left = asteroid.x + 'px';
      asteroid.element.style.top = asteroid.y + 'px';
      asteroid.element.style.transform = `rotate(${asteroid.rotation}deg)`;
      
      // Remove asteroid if it goes off screen from any direction (no life loss)
      const margin = 100; // Extra margin to ensure smooth off-screen removal
      if (asteroid.x < -margin || asteroid.x > this.gameState.gameWidth + margin ||
          asteroid.y < -margin || asteroid.y > this.gameState.gameHeight + margin) {
        asteroid.element.remove();
        this.gameState.asteroids.splice(i, 1);
      }
    }
  },

  // Check boss spawn conditions
  checkBossSpawn: function() {
    if (!this.gameState.bossActive && this.gameState.score >= this.gameState.nextBossScore) {
      this.spawnBoss();
    }
  },

  // Spawn boss battle
  spawnBoss: function() {
    console.log('BOSS APPROACHING!');
    this.gameState.bossActive = true;
    
    // Calculate boss HP (50 * 2^bossMultiplier)
    this.gameState.bossMaxHP = 50 * Math.pow(2, this.gameState.bossMultiplier - 1);
    this.gameState.bossHP = this.gameState.bossMaxHP;
    
    // Show boss warning and wait for it to finish
    this.showBossWarning(() => {
      this.createBoss();
      this.playMusic('boss');
    });
  },

  // Show boss warning overlay
  showBossWarning: function(onFinish) {
    const warning = document.createElement('div');
    warning.className = 'boss-warning';
    warning.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(255,0,0,0.8);
      z-index: 5000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: bossWarningFlash 3s;
    `;

    const bossImageUrl = this.getExtensionURL('assets/cat-boss.png');
    warning.innerHTML = `
      <div style="font-family:'Courier New',monospace;
                  font-size:48px;color:white;
                  font-weight:bold;text-shadow:0 0 20px red;
                  margin-bottom:20px;">⚠️ BOSS APPROACHING ⚠️</div>
      <img src="${bossImageUrl}" 
           style="width:120px;height:120px;
                  filter:drop-shadow(0 0 20px red);
                  animation: bossEmojiGlow 1s infinite;"
           onerror="this.style.display='none';">
    `;

    this.ui.box.appendChild(warning);

    // Add CSS animations if not already present
    if (!document.querySelector('#boss-warning-styles')) {
      const style = document.createElement('style');
      style.id = 'boss-warning-styles';
      style.textContent = `
        @keyframes bossWarningFlash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes bossEmojiGlow {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px red); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 20px red); }
        }
      `;
      document.head.appendChild(style);
    }

    const proceed = () => {
      warning.remove();
      if (typeof onFinish === 'function') onFinish();
    };

    const warningAudio = this.audio.music.bossWarning;
    if (!warningAudio) {
      console.warn('⚠️ No boss warning audio loaded.');
      setTimeout(proceed, 1500);
      return;
    }

    warningAudio.volume = this.audio.muted ? 0 : 0.7;
    warningAudio.currentTime = 0;

    const safeEnd = () => {
      warningAudio.removeEventListener('ended', safeEnd);
      proceed();
    };

    warningAudio.addEventListener('ended', safeEnd);
    warningAudio.play().catch(err => {
      console.error('Boss warning playback failed:', err);
      proceed();
    });

    // Safety fallback (4s)
    setTimeout(proceed, 4000);
  },

  // Create boss enemy
  createBoss: function() {
    console.log('Creating boss...');
    this.gameState.boss = {
      x: this.gameState.gameWidth / 2 - 60,
      y: 100,
      width: 120,
      height: 120,
      moveDirection: 1,
      speed: 3,
      lastShotTime: 0,
      shotCooldown: 1500, // Fire every 1.5 seconds
      element: null
    };
    
    console.log('Boss object created, adding visual element...');

    // Create boss element - PNG image with fallback and debug logging
    this.gameState.boss.element = document.createElement('img');
    const bossImageUrl = this.getExtensionURL('assets/cat-boss.png');
    console.log('🖼️ Loading boss image from:', bossImageUrl);

    if (!bossImageUrl) {
      console.error('❌ Boss image URL not found, using fallback emoji.');
      const fallback = document.createElement('div');
      fallback.textContent = '😼';
      Object.assign(fallback.style, {
        position: 'absolute',
        left: `${this.gameState.boss.x}px`,
        top: `${this.gameState.boss.y}px`,
        fontSize: '120px',
        zIndex: 300,
        userSelect: 'none',
        pointerEvents: 'none',
        animation: 'bossFloat 2s ease-in-out infinite',
        filter: 'drop-shadow(0 0 20px red)'
      });
      this.ui.gameArea.appendChild(fallback);
      this.gameState.boss.element = fallback;
    } else {
      this.gameState.boss.element.src = bossImageUrl;
      Object.assign(this.gameState.boss.element.style, {
        position: 'absolute',
        left: `${this.gameState.boss.x}px`,
        top: `${this.gameState.boss.y}px`,
        width: `${this.gameState.boss.width}px`,
        height: `${this.gameState.boss.height}px`,
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex: 300,
        animation: 'bossFloat 2s ease-in-out infinite',
        filter: 'drop-shadow(0 0 20px red)'
      });

      this.gameState.boss.element.onload = () =>
        console.log('✅ Boss image loaded successfully.');
      this.gameState.boss.element.onerror = (e) =>
        console.error('❌ Boss image failed to load:', e);
      this.ui.gameArea.appendChild(this.gameState.boss.element);
    }
    
    // Show boss health bar
    this.ui.bossHealthBar.style.display = 'block';
    this.updateBossHealthBar();
    console.log('Boss health bar displayed');
    
    // Add boss floating animation
    const bossStyle = document.createElement('style');
    bossStyle.textContent = `
      @keyframes bossFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
      }
    `;
    document.head.appendChild(bossStyle);
  },

  // Update boss behavior
  updateBoss: function() {
    if (!this.gameState.boss) return;
    
    const boss = this.gameState.boss;
    
    // Boss movement (left-right)
    boss.x += boss.speed * boss.moveDirection;
    
    // Bounce off walls
    if (boss.x <= 0 || boss.x >= this.gameState.gameWidth - boss.width) {
      boss.moveDirection *= -1;
    }
    
    // Boss projectile firing system
    const now = Date.now();
    if (now - boss.lastShotTime > boss.shotCooldown) {
      // Random chance to fire projectiles
      if (Math.random() < 0.3) { // 30% chance per firing cycle
        // Random pattern: single shot or row of shots
        if (Math.random() < 0.7) {
          // Single shot toward player
          this.fireBossProjectile(boss.x + boss.width / 2, boss.y + boss.height);
        } else {
          // Row of shots (spread pattern)
          this.fireBossProjectileRow(boss.x + boss.width / 2, boss.y + boss.height);
        }
        boss.lastShotTime = now;
      }
    }
    
    // Update visual position
    boss.element.style.left = boss.x + 'px';
  },

  // Update boss health bar
  updateBossHealthBar: function() {
    const healthBar = this.ui.box.querySelector('.boss-health-bar');
    const healthValue = this.ui.box.querySelector('#boss-hp-value');
    
    if (healthBar && healthValue) {
      const healthPercent = (this.gameState.bossHP / this.gameState.bossMaxHP) * 100;
      healthBar.style.width = healthPercent + '%';
      healthValue.textContent = this.gameState.bossHP;
    }
  },

  // Fire single boss projectile toward player
  fireBossProjectile: function(startX, startY) {
    // Calculate direction toward player
    const playerCenterX = this.gameState.ship.x + this.gameState.ship.width / 2;
    const playerCenterY = this.gameState.ship.y + this.gameState.ship.height / 2;
    
    const deltaX = playerCenterX - startX;
    const deltaY = playerCenterY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    const speed = 4;
    const velocityX = (deltaX / distance) * speed;
    const velocityY = (deltaY / distance) * speed;
    
    this.createBossProjectile(startX, startY, velocityX, velocityY, '😿');
  },

  // Fire row of boss projectiles in spread pattern
  fireBossProjectileRow: function(startX, startY) {
    const projectileCount = 5;
    const spreadAngle = Math.PI / 3; // 60 degrees spread
    const speed = 4;
    
    for (let i = 0; i < projectileCount; i++) {
      const angle = -spreadAngle / 2 + (spreadAngle / (projectileCount - 1)) * i + Math.PI / 2; // Downward direction
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;
      
      setTimeout(() => {
        this.createBossProjectile(startX + (i - 2) * 15, startY, velocityX, velocityY, '😾');
      }, i * 100); // Stagger the shots
    }
  },

  // Create individual boss projectile
  createBossProjectile: function(x, y, velocityX, velocityY, emoji) {
    const projectile = {
      x: x,
      y: y,
      velocityX: velocityX,
      velocityY: velocityY,
      size: 25,
      width: 25,  // Explicit width for collision detection
      height: 25, // Explicit height for collision detection
      emoji: emoji,
      element: null
    };
    
    // Create projectile element
    projectile.element = document.createElement('div');
    projectile.element.style.cssText = `
      position: absolute;
      left: ${projectile.x}px;
      top: ${projectile.y}px;
      font-size: ${projectile.size}px;
      user-select: none;
      pointer-events: none;
      z-index: 250;
      filter: drop-shadow(0 0 8px rgba(255, 100, 100, 0.8));
    `;
    projectile.element.textContent = emoji;
    
    this.ui.gameArea.appendChild(projectile.element);
    this.gameState.bossProjectiles.push(projectile);
    
    // Play projectile sound
    this.playSound('laser');
  },

  // Update boss projectiles
  updateBossProjectiles: function() {
    for (let i = this.gameState.bossProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.gameState.bossProjectiles[i];
      
      // Update position
      projectile.x += projectile.velocityX;
      projectile.y += projectile.velocityY;
      
      // Update visual position
      projectile.element.style.left = projectile.x + 'px';
      projectile.element.style.top = projectile.y + 'px';
      
      // Remove if off screen
      const margin = 100;
      if (projectile.x < -margin || projectile.x > this.gameState.gameWidth + margin ||
          projectile.y < -margin || projectile.y > this.gameState.gameHeight + margin) {
        projectile.element.remove();
        this.gameState.bossProjectiles.splice(i, 1);
      }
    }
  },

  // Check collision detection
  checkCollisions: function() {
    // Laser vs Asteroid collisions
    for (let i = this.gameState.lasers.length - 1; i >= 0; i--) {
      const laser = this.gameState.lasers[i];
      let laserDestroyed = false;
      
      // Check asteroid collisions
      for (let j = this.gameState.asteroids.length - 1; j >= 0; j--) {
        const asteroid = this.gameState.asteroids[j];
        
        if (this.isColliding(laser, asteroid)) {
          // Create explosion
          this.createExplosion(asteroid.x + asteroid.size/2, asteroid.y + asteroid.size/2);
          
          // Award points
          const points = asteroid.isRare ? 200 : 100;
          this.gameState.score += points;
          
          // Remove laser and asteroid
          laser.element.remove();
          asteroid.element.remove();
          this.gameState.lasers.splice(i, 1);
          this.gameState.asteroids.splice(j, 1);
          
          this.playSound('explosion');
          this.addScreenShake(5);
          laserDestroyed = true;
          break;
        }
      }
      
      // Skip further checks if laser was already destroyed
      if (laserDestroyed) continue;
      
      // Check boss collision
      if (this.gameState.boss && this.isColliding(laser, this.gameState.boss)) {
        this.hitBoss();
        laser.element.remove();
        this.gameState.lasers.splice(i, 1);
        laserDestroyed = true;
      }
      
      // Skip further checks if laser was already destroyed
      if (laserDestroyed) continue;
      
      // Check boss projectile collisions - MISSING FEATURE ADDED!
      for (let k = this.gameState.bossProjectiles.length - 1; k >= 0; k--) {
        const bossProjectile = this.gameState.bossProjectiles[k];
        
        // Debug logging
        console.log(`🔍 Checking collision: Laser(${laser.x},${laser.y},${laser.width||4}x${laser.height||20}) vs BossProjectile(${bossProjectile.x},${bossProjectile.y},${bossProjectile.size}x${bossProjectile.size})`);
        
        if (this.isColliding(laser, bossProjectile)) {
          // Create explosion at projectile location
          this.createExplosion(bossProjectile.x + 12, bossProjectile.y + 12);
          
          // Award points for destroying boss projectile
          this.gameState.score += 50;
          
          // Remove both laser and boss projectile
          laser.element.remove();
          bossProjectile.element.remove();
          this.gameState.lasers.splice(i, 1);
          this.gameState.bossProjectiles.splice(k, 1);
          
          this.playSound('hit');
          this.addScreenShake(3);
          
          console.log('🎯 Boss projectile destroyed by laser!');
          laserDestroyed = true;
          break;
        }
      }
    }
    
    // Ship vs Asteroid collisions
    for (let i = this.gameState.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.gameState.asteroids[i];
      
      if (this.isCollidingWithShip(asteroid)) {
        // Create explosion at ship (adjusted for smaller ship)
        this.createExplosion(this.gameState.ship.x + 15, this.gameState.ship.y + 11);
        
        // Remove asteroid
        asteroid.element.remove();
        this.gameState.asteroids.splice(i, 1);
        
        this.loseLife();
        this.addScreenShake(15);
        this.addFlashEffect();
      }
    }
    
    // Ship vs Boss Projectile collisions
    for (let i = this.gameState.bossProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.gameState.bossProjectiles[i];
      
      if (this.isCollidingWithShip(projectile)) {
        // Create explosion at ship
        this.createExplosion(this.gameState.ship.x + 15, this.gameState.ship.y + 11);
        
        // Remove projectile
        projectile.element.remove();
        this.gameState.bossProjectiles.splice(i, 1);
        
        this.loseLife();
        this.addScreenShake(15);
        this.addFlashEffect();
      }
    }
  },

  // Check if two objects are colliding
  isColliding: function(obj1, obj2) {
    // Handle laser dimensions (default small)
    const obj1Width = obj1.width || 4;
    const obj1Height = obj1.height || 20;
    
    // Handle various object types (asteroids use 'size', boss projectiles use 'size', boss uses width/height)
    const obj2Width = obj2.width || obj2.size || 30;
    const obj2Height = obj2.height || obj2.size || 30;
    
    const obj1Rect = {
      left: obj1.x,
      top: obj1.y,
      right: obj1.x + obj1Width,
      bottom: obj1.y + obj1Height
    };
    
    const obj2Rect = {
      left: obj2.x,
      top: obj2.y,
      right: obj2.x + obj2Width,
      bottom: obj2.y + obj2Height
    };
    
    console.log(`🔍 Collision check: obj1(${obj1Rect.left},${obj1Rect.top},${obj1Rect.right},${obj1Rect.bottom}) vs obj2(${obj2Rect.left},${obj2Rect.top},${obj2Rect.right},${obj2Rect.bottom})`);
    
    const isColliding = !(obj1Rect.right < obj2Rect.left || 
                         obj1Rect.left > obj2Rect.right || 
                         obj1Rect.bottom < obj2Rect.top || 
                         obj1Rect.top > obj2Rect.bottom);
    
    console.log(`🔍 Collision result: ${isColliding}`);
    return isColliding;
  },

  // Check collision with ship
  isCollidingWithShip: function(asteroid) {
    const shipRect = {
      left: this.gameState.ship.x,
      top: this.gameState.ship.y,
      right: this.gameState.ship.x + this.gameState.ship.width,
      bottom: this.gameState.ship.y + this.gameState.ship.height
    };
    
    const asteroidRect = {
      left: asteroid.x,
      top: asteroid.y,
      right: asteroid.x + asteroid.size,
      bottom: asteroid.y + asteroid.size
    };
    
    return !(shipRect.right < asteroidRect.left || 
             shipRect.left > asteroidRect.right || 
             shipRect.bottom < asteroidRect.top || 
             shipRect.top > asteroidRect.bottom);
  },

  // Hit boss with laser
  hitBoss: function() {
    this.gameState.bossHP--;
    this.updateBossHealthBar();
    
    // Boss hit effect
    if (this.gameState.boss.element) {
      this.gameState.boss.element.style.filter = 'drop-shadow(0 0 30px white)';
      setTimeout(() => {
        if (this.gameState.boss.element) {
          this.gameState.boss.element.style.filter = 'drop-shadow(0 0 20px red)';
        }
      }, 100);
    }
    
    this.playSound('hit');
    this.addScreenShake(8);
    
    // Check boss defeat
    if (this.gameState.bossHP <= 0) {
      this.defeatBoss();
    }
  },

  // Defeat boss
  defeatBoss: function() {
    console.log('Boss defeated!');
    
    // Award massive points
    const bonusPoints = 5000 * this.gameState.bossMultiplier;
    this.gameState.score += bonusPoints;
    
    // Create massive explosion
    this.createExplosion(this.gameState.boss.x + 60, this.gameState.boss.y + 60, true);
    
    // Remove boss
    this.gameState.boss.element.remove();
    this.gameState.boss = null;
    this.gameState.bossActive = false;
    
    // Hide boss health bar
    this.ui.bossHealthBar.style.display = 'none';
    
    // Set next boss
    this.gameState.bossMultiplier++;
    this.gameState.nextBossScore += 10000;
    
    // Return to normal music
    setTimeout(() => {
      this.playMusic('normal');
    }, 2000);
    
    this.playSound('victory');
    this.addScreenShake(20);
    this.addFlashEffect();
  },

  // Create explosion effect
  createExplosion: function(x, y, isBoss = false) {
    const explosion = {
      x: x,
      y: y,
      size: isBoss ? 100 : 30,
      life: isBoss ? 60 : 20,
      maxLife: isBoss ? 60 : 20,
      element: null
    };
    
    explosion.element = document.createElement('div');
    explosion.element.style.cssText = `
      position: absolute;
      left: ${x - explosion.size/2}px;
      top: ${y - explosion.size/2}px;
      width: ${explosion.size}px;
      height: ${explosion.size}px;
      background: radial-gradient(circle, #ffff00, #ff4400, #ff0000);
      border-radius: 50%;
      z-index: 400;
      animation: explode ${explosion.maxLife/60}s ease-out;
    `;
    
    // Add explosion animation
    const explosionStyle = document.createElement('style');
    explosionStyle.textContent = `
      @keyframes explode {
        0% { transform: scale(0); opacity: 1; }
        50% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(2); opacity: 0; }
      }
    `;
    document.head.appendChild(explosionStyle);
    
    this.ui.gameArea.appendChild(explosion.element);
    this.gameState.explosions.push(explosion);
  },

  // Update explosions
  updateExplosions: function() {
    for (let i = this.gameState.explosions.length - 1; i >= 0; i--) {
      const explosion = this.gameState.explosions[i];
      explosion.life--;
      
      if (explosion.life <= 0) {
        explosion.element.remove();
        this.gameState.explosions.splice(i, 1);
      }
    }
  },

  // Lose a life
  loseLife: function() {
    this.gameState.lives--;
    
    if (this.gameState.lives <= 0) {
      this.gameOver();
    } else {
      this.playSound('damage');
    }
  },

  // Increase difficulty over time - enhanced to prevent camping
  increaseDifficulty: function() {
    // Increase asteroid speed more aggressively
    this.gameState.asteroidSpeed += 0.8;
    
    // Decrease spawn rate more dramatically (spawn more frequently)
    this.gameState.spawnRate = Math.max(200, this.gameState.spawnRate - 150);
    
    // Increase difficulty multiplier for more simultaneous spawns
    this.gameState.difficultyMultiplier = Math.min(4, this.gameState.difficultyMultiplier + 0.3);
    
    // Update spawn loop with new rate
    if (this.gameState.spawnLoop) {
      clearInterval(this.gameState.spawnLoop);
      this.gameState.spawnLoop = setInterval(() => this.spawnAsteroid(), this.gameState.spawnRate);
    }
    
    console.log(`Difficulty increased: Speed ${this.gameState.asteroidSpeed}, Spawn rate ${this.gameState.spawnRate}, Multi-spawn ${this.gameState.difficultyMultiplier}`);
  },

  // Add screen shake effect
  addScreenShake: function(intensity) {
    this.gameState.screenShake = Math.max(this.gameState.screenShake, intensity);
  },

  // Add flash effect
  addFlashEffect: function() {
    this.gameState.flashEffect = 10;
  },

  // Update visual effects
  updateEffects: function() {
    const gameArea = this.ui.box.querySelector('.asteroids-game');
    
    // Screen shake
    if (this.gameState.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.gameState.screenShake;
      const shakeY = (Math.random() - 0.5) * this.gameState.screenShake;
      gameArea.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
      this.gameState.screenShake *= 0.9;
      
      if (this.gameState.screenShake < 0.1) {
        this.gameState.screenShake = 0;
        gameArea.style.transform = 'translate(0px, 0px)';
      }
    }
    
    // Flash effect
    if (this.gameState.flashEffect > 0) {
      const opacity = this.gameState.flashEffect / 10;
      gameArea.style.boxShadow = `inset 0 0 100px rgba(255, 255, 255, ${opacity})`;
      this.gameState.flashEffect--;
      
      if (this.gameState.flashEffect <= 0) {
        gameArea.style.boxShadow = 'none';
      }
    }
  },

  // Update UI elements
  updateUI: function() {
    if (this.ui.scoreDisplay) {
      this.ui.scoreDisplay.textContent = this.gameState.score;
    }
    if (this.ui.livesDisplay) {
      this.ui.livesDisplay.textContent = this.gameState.lives;
    }
  },

  // Play sound effect with improved error handling
  playSound: function(soundType) {
    if (this.audio.muted) {
      console.log('🔇 Mute active, skipping SFX:', soundType);
      return;
    }

    try {
      if (!this.audio.context) {
        console.warn('⚠️ Audio context not available for sound:', soundType);
        return;
      }
      
      if (this.audio.muted) {
        console.log('🔇 Audio muted, skipping sound:', soundType);
        return;
      }
      
      // Resume audio context if suspended (required for user interaction)
      if (this.audio.context.state === 'suspended') {
        this.audio.context.resume().then(() => {
          console.log('🎵 Audio context resumed');
          this.playSound(soundType); // Retry after resume
        }).catch(e => {
          console.error('❌ Failed to resume audio context:', e);
        });
        return;
      }
      
      const oscillator = this.audio.context.createOscillator();
      const gainNode = this.audio.context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audio.context.destination);
      
      switch (soundType) {
        case 'laser':
          oscillator.frequency.setValueAtTime(800, this.audio.context.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, this.audio.context.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, this.audio.context.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audio.context.currentTime + 0.1);
          oscillator.start(this.audio.context.currentTime);
          oscillator.stop(this.audio.context.currentTime + 0.1);
          console.log('🔫 Laser sound played');
          break;
          
        case 'explosion':
          oscillator.frequency.setValueAtTime(150, this.audio.context.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, this.audio.context.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.2, this.audio.context.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audio.context.currentTime + 0.3);
          oscillator.start(this.audio.context.currentTime);
          oscillator.stop(this.audio.context.currentTime + 0.3);
          break;
          
        case 'hit':
          oscillator.frequency.setValueAtTime(300, this.audio.context.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(100, this.audio.context.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.15, this.audio.context.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audio.context.currentTime + 0.2);
          oscillator.start(this.audio.context.currentTime);
          oscillator.stop(this.audio.context.currentTime + 0.2);
          break;
          
        case 'damage':
          oscillator.frequency.setValueAtTime(200, this.audio.context.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, this.audio.context.currentTime + 0.5);
          gainNode.gain.setValueAtTime(0.3, this.audio.context.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, this.audio.context.currentTime + 0.5);
          oscillator.start(this.audio.context.currentTime);
          oscillator.stop(this.audio.context.currentTime + 0.5);
          break;
          
        case 'victory':
          // Victory fanfare
          const notes = [523, 659, 784, 1047]; // C, E, G, C
          notes.forEach((freq, index) => {
            setTimeout(() => {
              const osc = this.audio.context.createOscillator();
              const gain = this.audio.context.createGain();
              osc.connect(gain);
              gain.connect(this.audio.context.destination);
              osc.frequency.setValueAtTime(freq, this.audio.context.currentTime);
              gain.gain.setValueAtTime(0.1, this.audio.context.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, this.audio.context.currentTime + 0.3);
              osc.start();
              osc.stop(this.audio.context.currentTime + 0.3);
            }, index * 200);
          });
          return; // Don't start oscillator below
      }
      
      oscillator.start(this.audio.context.currentTime);
    } catch (e) {
      console.log('Sound play failed:', e);
    }
  },

  // Play background music with proper cleanup - FORCE BOSS MUSIC
  playMusic: function(trackType) {
    try {
      console.log(`FORCING ${trackType} music to play`);
      
      // Stop ALL audio completely first
      if (this.audio.music.normal) {
        this.audio.music.normal.pause();
        this.audio.music.normal.currentTime = 0;
      }
      if (this.audio.music.boss) {
        this.audio.music.boss.pause();
        this.audio.music.boss.currentTime = 0;
      }
      
      // Clear current track reference
      this.audio.music.currentTrack = null;
      this.audio.isPlaying = false;
      
      // Get the requested track
      const track = this.audio.music[trackType];
      if (!track) {
        console.error(`❌ Track ${trackType} not found!`);
        console.error('❌ Available tracks:', Object.keys(this.audio.music));
        return;
      }
      
      // Check if track has a valid source
      if (!track.src) {
        console.error(`❌ Track ${trackType} has no source URL!`);
        return;
      }
      
      console.log(`🎵 Found ${trackType} track, forcing playback...`);
      console.log(`🎵 Track source: ${track.src}`);
      console.log(`🎵 Track ready state: ${track.readyState}`);
      console.log(`🎵 Track network state: ${track.networkState}`);
      
      // FORCE the track to play
      track.currentTime = 0;
      track.volume = this.audio.muted ? 0 : (trackType === 'boss' ? 0.6 : 0.3);
      
      if (this.audio.muted) {
        console.log('🔇 Mute active, skipping music:', trackType);
        return;
      }
      
      // Check if track is ready before attempting to play
      if (track.readyState >= 2) { // HAVE_CURRENT_DATA
        const playPromise = track.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.audio.music.currentTrack = track;
            this.audio.isPlaying = true;
            console.log(`✅ SUCCESS: ${trackType} music is now playing!`);
          }).catch(e => {
            console.error(`❌ FAILED to play ${trackType} music:`, e);
            console.error(`❌ Track error code:`, track.error?.code);
            console.error(`❌ Track error message:`, track.error?.message);
            console.error(`❌ Track current time:`, track.currentTime);
            console.error(`❌ Track duration:`, track.duration);
            this.audio.isPlaying = false;
          });
        }
      } else {
        console.warn(`⚠️ ${trackType} track not ready, waiting for load...`);
        track.addEventListener('canplaythrough', () => {
          console.log(`🎵 ${trackType} track now ready, attempting play...`);
          track.play().catch(e => {
            console.error(`❌ FAILED to play ${trackType} music after load:`, e);
          });
        }, { once: true });
      }
      
    } catch (e) {
      console.error('Music play failed:', e);
      this.audio.isPlaying = false;
    }
  },

  // Toggle mute functionality
  toggleMute: function() {
    this.audio.muted = !this.audio.muted;
    
    // Update all active audio objects
    Object.values(this.audio.music).forEach(track => {
      if (track && !track.paused) {
        track.volume = this.audio.muted ? 0 : 0.5;
      }
    });
    
    // Update mute button icon
    const muteBtn = this.ui.box.querySelector('#mute-btn');
    if (muteBtn) {
      muteBtn.textContent = this.audio.muted ? '🔇' : '🔊';
    }
    
    console.log(this.audio.muted ? 'Audio muted' : 'Audio unmuted');
  },

  // Game over
  gameOver: function() {
    console.log('Game Over! Final Score:', this.gameState.score);
    this.gameState.gameActive = false;
    
    // Stop all loops
    if (this.gameState.gameLoop) clearInterval(this.gameState.gameLoop);
    if (this.gameState.spawnLoop) clearInterval(this.gameState.spawnLoop);
    if (this.gameState.difficultyLoop) clearInterval(this.gameState.difficultyLoop);
    
    // Stop music completely
    const allAudio = document.querySelectorAll('audio');
    allAudio.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    if (this.audio.music.currentTrack) {
      this.audio.music.currentTrack.pause();
      this.audio.music.currentTrack.currentTime = 0;
      this.audio.music.currentTrack = null;
    }
    
    // Reset audio flags
    this.audio.isPlaying = false;
    
    console.log('Game over - all audio stopped');
    
    // Show game over screen
    setTimeout(() => this.showGameOverScreen(), 1000);
  },

  // Show game over screen
  showGameOverScreen: function() {
    const gameOverHtml = `
      <div class="game-over-screen" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 5000; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="font-family: 'Courier New', monospace; font-size: 48px; color: #ff4444; font-weight: bold; text-shadow: 0 0 20px #ff4444; margin-bottom: 20px;">
          GAME OVER
        </div>
        <div style="font-family: 'Courier New', monospace; font-size: 24px; color: #00ff88; margin-bottom: 10px;">
          Final Score: ${this.gameState.score}
        </div>
        <div style="font-family: 'Courier New', monospace; font-size: 18px; color: #ffaa00; margin-bottom: 40px;">
          Bosses Defeated: ${this.gameState.bossMultiplier - 1}
        </div>
        <div style="display: flex; gap: 20px;">
          <button class="play-again-btn" style="padding: 15px 30px; background: #00ff88; color: #000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px; font-family: 'Courier New', monospace;">
            PLAY AGAIN
          </button>
          <button class="main-menu-btn" style="padding: 15px 30px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px; font-family: 'Courier New', monospace;">
            MAIN MENU
          </button>
        </div>
      </div>
    `;
    
    this.ui.box.insertAdjacentHTML('beforeend', gameOverHtml);
    
    // Setup button handlers
    this.ui.box.querySelector('.play-again-btn').onclick = () => {
      this.ui.box.querySelector('.game-over-screen').remove();
      this.start(this.ui.box);
    };
    
    this.ui.box.querySelector('.main-menu-btn').onclick = () => {
      this.cleanup();
      if (window.showMainMenu) {
        window.showMainMenu();
      }
    };
  }
};