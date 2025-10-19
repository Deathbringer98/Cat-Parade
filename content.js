// Main Game Controller - Cat Parade & Cat Asteroids Chrome Extension
// Entry point that manages game selection and coordination between game modules

(function() {
  'use strict';
  
  const ID = "cat-parade-extension-" + Math.random().toString(36).substring(2, 15);
  
  // Prevent multiple instances
  if (document.getElementById(ID)) return;
  
  // Clean up any existing game over screens
  const existingGameOver = document.querySelector('.game-over-screen');
  if (existingGameOver) existingGameOver.remove();

  const box = document.createElement("div");
  box.className = "cat-parade-box";
  box.id = ID;

  // Make the game box draggable
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  box.addEventListener('mousedown', (e) => {
    // Only allow dragging from the header area or empty spaces (not game content)
    if (e.target === box || e.target.classList.contains('cpb-header') || e.target.classList.contains('main-menu')) {
      isDragging = true;
      const rect = box.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      box.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffsetX;
      const newY = e.clientY - dragOffsetY;
      
      // Keep the box within viewport bounds
      const maxX = window.innerWidth - box.offsetWidth;
      const maxY = window.innerHeight - box.offsetHeight;
      
      box.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
      box.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
      box.style.transform = 'none'; // Remove centering transform when dragging
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      box.style.cursor = 'default';
    }
  });

  // Load CSS file
  const cssLink = document.createElement("link");
  cssLink.rel = "stylesheet";
  cssLink.href = chrome.runtime.getURL("styles.css");
  document.head.appendChild(cssLink);

  // Audio system for both games
  const audioFiles = {
    catParade: null,
    asteroids: null
  };

  // Load audio files
  function loadAudio() {
    try {
      audioFiles.catParade = new Audio(chrome.runtime.getURL("audio/meowmeow-song.mp3"));
      audioFiles.asteroids = new Audio(chrome.runtime.getURL("audio/asteroid-cat-theme.mp3"));
      
      audioFiles.catParade.loop = true;
      audioFiles.asteroids.loop = true;
      audioFiles.catParade.volume = 0.3;
      audioFiles.asteroids.volume = 0.3;
    } catch (e) {
      console.log("Audio loading failed:", e);
    }
  }

  // Audio control functions
  function playGameAudio(gameType) {
    try {
      // Stop other audio first
      Object.values(audioFiles).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      
      // Play requested audio
      if (audioFiles[gameType]) {
        audioFiles[gameType].play().catch(e => console.log("Audio play failed:", e));
      }
    } catch (e) {
      console.log("Audio control failed:", e);
    }
  }

  function stopGameAudio() {
    try {
      Object.values(audioFiles).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    } catch (e) {
      console.log("Audio stop failed:", e);
    }
  }

  function playLaserSound() {
    try {
      // Simple laser sound effect using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.log("Laser sound failed:", e);
    }
  }

  // Make audio functions globally available for game modules
  window.audioFiles = audioFiles;
  window.playGameAudio = playGameAudio;
  window.stopGameAudio = stopGameAudio;
  window.playLaserSound = playLaserSound;

  // Load audio files
  loadAudio();

  // Main menu display function
  function showMainMenu() {
    box.innerHTML = `
      <div class="main-menu">
        <div class="menu-controls" style="position: absolute; top: 10px; left: 10px; z-index: 1000; display: flex; gap: 5px;">
          <button class="menu-control-btn close-btn" style="background: rgba(0,0,0,0.7); border: 1px solid #ff4444; color: #ff4444; border-radius: 3px; padding: 4px 6px; cursor: pointer; font-size: 12px;" title="Close Extension">×</button>
        </div>
        <div class="menu-header">
          <h1>🐱 Cat Games 🐱</h1>
        </div>
        <div class="subtitle">Choose your feline adventure!</div>
        <div class="game-selection">
          <button class="game-btn parade-btn">🎯 Cat Parade</button>
          <button class="game-btn asteroids-btn">🚀 Cat Asteroids</button>
        </div>
      </div>
    `;

    // Menu control handlers
    box.querySelector('.close-btn').onclick = () => {
      stopGameAudio();
      box.remove();
    };

    // Game selection handlers
    box.querySelector('.parade-btn').onclick = () => {
      console.log('Cat Parade button clicked');
      console.log('CatParadeGame available:', !!window.CatParadeGame);
      if (window.CatParadeGame) {
        playGameAudio('catParade');
        window.CatParadeGame.start(box);
      } else {
        console.error('Cat Parade game module not loaded');
        alert('Cat Parade game module not loaded. Please refresh the page and try again.');
      }
    };

    box.querySelector('.asteroids-btn').onclick = () => {
      console.log('Cat Asteroids button clicked');
      console.log('CatAsteroidsGame available:', !!window.CatAsteroidsGame);
      if (window.CatAsteroidsGame) {
        // Let Cat Asteroids manage its own music internally.
        stopGameAudio(); // make sure anything else is stopped
        window.CatAsteroidsGame.start(box);
      } else {
        console.error('Cat Asteroids game module not loaded');
        alert('Cat Asteroids game module not loaded. Please refresh the page and try again.');
      }
    };
  }

  // Make showMainMenu globally available for game modules
  window.showMainMenu = showMainMenu;

  // Function to start the app with retry logic
  function startApp(attempt = 1) {
    console.log(`Starting cat games app (attempt ${attempt})...`);
    console.log('CatParadeGame available:', !!window.CatParadeGame);
    console.log('CatAsteroidsGame available:', !!window.CatAsteroidsGame);
    
    if (window.CatParadeGame && window.CatAsteroidsGame) {
      console.log('All modules loaded, starting app');
      document.body.appendChild(box);
      showMainMenu();
    } else if (attempt < 10) {
      console.log(`Modules not ready, retrying in ${attempt * 100}ms...`);
      setTimeout(() => startApp(attempt + 1), attempt * 100);
    } else {
      console.error('Failed to load game modules after 10 attempts, starting anyway');
      document.body.appendChild(box);
      showMainMenu();
    }
  }

  // Start the application
  startApp();

})();