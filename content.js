(() => {
  const ID = "cat-parade-box";
  const existing = document.getElementById(ID);
  if (existing) { 
    // Stop any audio from existing game
    const existingAudio = existing.querySelector('audio') || window.catParadeAudio;
    if (existingAudio) {
      existingAudio.pause();
      existingAudio.src = "";
    }
    existing.remove(); 
    return; 
  }
  
  // Clear any previous audio reference
  if (window.catParadeAudio) {
    window.catParadeAudio.pause();
    window.catParadeAudio.src = "";
    window.catParadeAudio = null;
  }

  const box = document.createElement("div");
  box.id = ID;

  const style = document.createElement("style");
  style.textContent = `
    #${ID} {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 1200px;
      height: 700px;
      overflow: hidden;
      background: rgba(20,20,28,0.9);
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.15);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      z-index: 999999;
      user-select: none;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    }
    #${ID} .cpb-header {
      height: 50px;
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0));
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 5px 10px;
      color: white;
      font-size: 13px;
      cursor: move;
      position: relative;
    }
    #${ID} .cpb-close, #${ID} .cpb-mute {
      background: transparent;
      border: none;
      color: white;
      font-size: 16px;
      cursor: pointer;
      position: absolute;
      top: 5px;
    }
    #${ID} .cpb-mute {
      left: 10px;
      font-size: 18px;
    }
    #${ID} .cpb-close {
      right: 10px;
      font-size: 18px;
    }
    #${ID} .cpb-score-main {
      font-size: 16px;
      font-weight: bold;
      color: #00ff88;
      margin-bottom: 2px;
    }
    #${ID} .cpb-stats-row {
      display: flex;
      gap: 12px;
      font-size: 11px;
    }
    #${ID} .cpb-track {
      position: relative;
      width: 100%;
      height: calc(100% - 50px);
      overflow: hidden;
    }
    #${ID} .cat {
      position: absolute;
      font-size: 32px;
      cursor: pointer;
      animation: runAcross linear infinite;
      transition: transform 0.1s ease;
    }
    #${ID} .cat:hover {
      transform: scale(1.1);
    }
    #${ID} .cat.clicked {
      animation: catPop 0.3s ease;
    }
    @keyframes catPop {
      0% { transform: scale(1); }
      50% { transform: scale(1.4) rotate(20deg); }
      100% { transform: scale(1); }
    }
    @keyframes runAcross {
      from { left: -80px; }
      to   { left: calc(100% + 80px); }
    }
    #${ID} .rtl { 
      transform: scaleX(-1); 
      animation-name: runAcrossRTL;
    }
    @keyframes runAcrossRTL {
      from { left: calc(100% + 80px); }
      to   { left: -80px; }
    }
    #${ID} .meow {
      position: absolute;
      background: #fff;
      color: #000;
      padding: 4px 8px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      animation: meowFade 1.2s ease forwards;
    }
    #${ID} .point-popup {
      position: absolute;
      color: #00ff88;
      font-size: 20px;
      font-weight: bold;
      pointer-events: none;
      animation: pointFloat 1.5s ease forwards;
      left: 50% !important;
      top: 40% !important;
      transform: translateX(-50%);
      text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
    }
    @keyframes pointFloat {
      0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(0.8); }
      50% { opacity: 1; transform: translateX(-50%) translateY(-20px) scale(1.2); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-50px) scale(0.8); }
    }
    @keyframes meowFade {
      0% { opacity: 0; transform: translateY(-24px) scale(0.8); }
      20% { opacity: 1; transform: translateY(-30px) scale(1); }
      80% { opacity: 1; transform: translateY(-30px) scale(1); }
      100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
    }
    #${ID} .combo-popup {
      position: absolute;
      color: #ff6b35;
      font-size: 24px;
      font-weight: bold;
      pointer-events: none;
      animation: comboFloat 2s ease forwards;
      text-shadow: 0 0 15px rgba(255, 107, 53, 0.8);
      left: 50% !important;
      top: 50% !important;
      transform: translateX(-50%) translateY(-50%);
    }
    @keyframes comboFloat {
      0% { opacity: 1; transform: translateX(-50%) translateY(-50%) scale(0.8); }
      30% { opacity: 1; transform: translateX(-50%) translateY(-60%) scale(1.4); }
      70% { opacity: 1; transform: translateX(-50%) translateY(-60%) scale(1.2); }
      100% { opacity: 0; transform: translateX(-50%) translateY(-80%) scale(0.8); }
    }
    #${ID} .level-up {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #35a7ff;
      font-size: 32px;
      font-weight: bold;
      pointer-events: none;
      animation: levelUpFlash 2s ease forwards;
      text-shadow: 0 0 20px rgba(53, 167, 255, 0.8);
    }
    @keyframes levelUpFlash {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
      40% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
      60% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
    #${ID} .rare-cat {
      filter: drop-shadow(0 0 10px gold) hue-rotate(45deg);
      animation-duration: 4s !important;
    }
    #${ID} .speed-cat {
      filter: drop-shadow(0 0 8px #00ff88);
      animation-duration: 2s !important;
    }
    #${ID} .troll-cat {
      filter: drop-shadow(0 0 12px #ff0000) hue-rotate(0deg);
      animation-duration: 3s !important;
    }
    #${ID} .game-over {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      font-size: 18px;
      z-index: 1000;
    }
    #${ID} .achievement {
      position: absolute;
      top: 40px;
      right: 10px;
      background: linear-gradient(45deg, #ff6b35, #ffd700);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: bold;
      animation: achievementSlide 3s ease forwards;
    }
    @keyframes achievementSlide {
      0% { transform: translateX(100%); opacity: 0; }
      20% { transform: translateX(0); opacity: 1; }
      80% { transform: translateX(0); opacity: 1; }
      100% { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.documentElement.appendChild(style);

  // --- AUDIO ---
  const audio = new Audio(chrome.runtime.getURL("audio/meowmeow-song.mp3"));
  audio.loop = true;
  audio.volume = 0.5;
  audio.preload = "auto";
  let audioReady = false;
  
  // Store in global scope to prevent multiple instances
  window.catParadeAudio = audio;

  // Play after user gesture (clicking the extension icon)
  audio.addEventListener("canplaythrough", () => {
    audio.play().catch(() => {});
    audioReady = true;
  });
  audio.addEventListener("error", (e) => {
    console.error("Audio load error:", e);
  });

  // --- ADVANCED GAME SYSTEM ---
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let timeLeft = 60;
  let gameActive = true;
  let level = 1;
  let totalClicks = 0;
  let missedCats = 0;
  
  // --- HEADER & CONTROLS ---
  const header = document.createElement("div");
  header.className = "cpb-header";
  
  // Main score display (centered, prominent)
  const mainScore = document.createElement("div");
  mainScore.className = "cpb-score-main";
  mainScore.id = "score-display";
  mainScore.textContent = "Score: 0";
  
  // Secondary stats row (smaller, below score)
  const statsRow = document.createElement("div");
  statsRow.className = "cpb-stats-row";
  statsRow.innerHTML = `
    <span id="combo-display" style="color: #ff6b35;">Combo: 0x</span>
    <span id="level-display" style="color: #35a7ff;">Level: 1</span>
    <span id="timer-display" style="color: #ffd700;">Time: 60s</span>
  `;
  
  header.appendChild(mainScore);
  header.appendChild(statsRow);

  const muteBtn = document.createElement("button");
  muteBtn.className = "cpb-mute";
  muteBtn.textContent = "🔊";
  muteBtn.title = "Mute / Unmute";

  muteBtn.onclick = () => {
    if (audio.muted) {
      audio.muted = false;
      muteBtn.textContent = "🔊";
    } else {
      audio.muted = true;
      muteBtn.textContent = "�";
    }
  };

  const closeBtn = document.createElement("button");
  closeBtn.className = "cpb-close";
  closeBtn.textContent = "×";
  closeBtn.title = "Close";
  closeBtn.onclick = () => {
    // Properly clean up audio and timers
    audio.pause();
    audio.currentTime = 0;
    audio.src = "";
    clearInterval(gameTimer);
    clearTimeout(comboTimeout);
    window.catParadeAudio = null;
    box.remove();
  };

  header.appendChild(muteBtn);
  header.appendChild(closeBtn);
  box.appendChild(header);

  const track = document.createElement("div");
  track.className = "cpb-track";
  box.appendChild(track);



  const CAT_EMOJIS = ["🐈", "🐈‍⬛", "😺", "😸", "😼", "🙀"];
  const RARE_CAT_EMOJIS = ["😻", "🐯", "🦁"];
  const TROLL_CAT_EMOJIS = ["😈", "👹", "💀"];
  
  // Level progression system (10 levels)
  const LEVEL_CONFIG = {
    1: { requiredScore: 100, trollChance: 0.05, maxMultiplier: 3 },
    2: { requiredScore: 120, trollChance: 0.08, maxMultiplier: 4 },
    3: { requiredScore: 220, trollChance: 0.12, maxMultiplier: 4 },
    4: { requiredScore: 350, trollChance: 0.15, maxMultiplier: 5 },
    5: { requiredScore: 520, trollChance: 0.18, maxMultiplier: 5 },
    6: { requiredScore: 730, trollChance: 0.22, maxMultiplier: 6 },
    7: { requiredScore: 980, trollChance: 0.25, maxMultiplier: 6 },
    8: { requiredScore: 1280, trollChance: 0.28, maxMultiplier: 7 },
    9: { requiredScore: 1630, trollChance: 0.32, maxMultiplier: 7 },
    10: { requiredScore: 2030, trollChance: 0.35, maxMultiplier: 8 }
  };
  
  // Game timer
  const gameTimer = setInterval(() => {
    if (!gameActive) return;
    timeLeft--;
    document.getElementById("timer-display").textContent = `Time: ${timeLeft}s`;
    
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
  
  // Combo timeout and anti-cheat
  let comboTimeout;
  let lastClickTime = 0;
  let rapidClickCount = 0;
  
  function resetCombo() {
    combo = 0;
    document.getElementById("combo-display").textContent = `Combo: ${combo}x`;
  }
  
  function isValidClick() {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    
    // Anti-cheat: Detect rapid clicking (less than 50ms between clicks)
    if (timeSinceLastClick < 50) {
      rapidClickCount++;
      if (rapidClickCount > 3) {
        // Reset combo if too many rapid clicks detected
        resetCombo();
        rapidClickCount = 0;
        return false;
      }
    } else {
      rapidClickCount = 0;
    }
    
    lastClickTime = now;
    return true;
  }
  
  function checkAchievements() {
    if (score >= 100 && !document.querySelector('.achievement')) {
      showAchievement("Cat Master! 🏆");
    }
    if (maxCombo >= 10) {
      showAchievement("Combo King! 🔥");
    }
    if (level >= 5) {
      showAchievement("Speed Demon! ⚡");
    }
  }

  function createGameUI() {
    // Update all displays with current values
    document.getElementById("score-display").textContent = `Score: ${score}`;
    document.getElementById("combo-display").textContent = `Combo: ${comboCount}x`;
    document.getElementById("level-display").textContent = `Level: ${level}`;
    document.getElementById("timer-display").textContent = `Time: ${timeLeft}s`;
  }

  function restartGame() {
    // Reset all game variables
    score = 0;
    level = 1;
    comboCount = 0;
    maxCombo = 0;
    timeLeft = 60;
    totalClicks = 0;
    missedCats = 0;
    lastClickTime = 0;
    levelUpFlag = false;
    gameActive = true;
    rapidClickCount = 0;
    
    // Clear the track of all cats and effects
    track.innerHTML = '';
    
    // Update the UI displays
    createGameUI();
    
    // Restart audio
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Spawn initial cats
    for (let i = 0; i < 8; i++) createCat();
  }
  
  function showAchievement(text) {
    const achievement = document.createElement("div");
    achievement.className = "achievement";
    achievement.textContent = text;
    track.appendChild(achievement);
    setTimeout(() => achievement.remove(), 3000);
  }
  
  function levelUp() {
    if (level >= 10) return; // Max level cap
    
    level++;
    document.getElementById("level-display").textContent = `Level: ${level}`;
    
    const levelUpText = document.createElement("div");
    levelUpText.className = "level-up";
    levelUpText.textContent = `LEVEL ${level}!`;
    track.appendChild(levelUpText);
    setTimeout(() => levelUpText.remove(), 2000);
    
    // Bonus time for leveling up
    timeLeft += 15;
    
    // Show next level requirement if not at max level
    if (level < 10) {
      const nextReq = LEVEL_CONFIG[level].requiredScore;
      setTimeout(() => {
        const reqText = document.createElement("div");
        reqText.className = "level-up";
        reqText.style.fontSize = "18px";
        reqText.textContent = `Need ${nextReq} points for Level ${level + 1}!`;
        track.appendChild(reqText);
        setTimeout(() => reqText.remove(), 2000);
      }, 1000);
    } else {
      // Max level reached
      setTimeout(() => {
        const maxText = document.createElement("div");
        maxText.className = "level-up";
        maxText.style.fontSize = "18px";
        maxText.textContent = `MAX LEVEL REACHED!`;
        track.appendChild(maxText);
        setTimeout(() => maxText.remove(), 2000);
      }, 1000);
    }
    
    checkAchievements();
  }
  
  function endGame() {
    gameActive = false;
    clearInterval(gameTimer);
    
    const gameOverDiv = document.createElement("div");
    gameOverDiv.className = "game-over";
    
    // Determine if player won (reached level 10)
    const isWinner = level >= 10;
    const resultText = isWinner ? "🏆 VICTORY! 🏆" : "🎮 Game Over! 🎮";
    
    gameOverDiv.innerHTML = `
      <h3>${resultText}</h3>
      <p><strong>Final Score:</strong> ${score}</p>
      <p><strong>Max Combo:</strong> ${maxCombo}x</p>
      <p><strong>Level Reached:</strong> ${level}/10</p>
      <p><strong>Accuracy:</strong> ${totalClicks > 0 ? Math.round(((totalClicks - missedCats) / totalClicks) * 100) : 0}%</p>
    `;
    
    const playAgainBtn = document.createElement("button");
    playAgainBtn.textContent = "Play Again";
    playAgainBtn.style.cssText = "margin-top: 10px; padding: 8px 16px; background: #00ff88; color: black; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;";
    playAgainBtn.onclick = () => {
      restartGame();
    };
    
    gameOverDiv.appendChild(playAgainBtn);
    track.appendChild(gameOverDiv);
  }

  function createCat() {
    const cat = document.createElement("div");
    cat.className = "cat";
    
    // Get current level config
    const currentLevel = Math.min(level, 10);
    const levelConfig = LEVEL_CONFIG[currentLevel];
    
    // Special cat types with level-based chances
    const isTroll = Math.random() < levelConfig.trollChance;
    const isRare = Math.random() < 0.1; // 10% chance
    const isSpeed = Math.random() < 0.15; // 15% chance
    
    if (isTroll) {
      cat.textContent = TROLL_CAT_EMOJIS[Math.floor(Math.random() * TROLL_CAT_EMOJIS.length)];
      cat.classList.add("troll-cat");
      cat.dataset.points = "-20"; // Negative points
      cat.dataset.type = "troll";
    } else if (isRare) {
      cat.textContent = RARE_CAT_EMOJIS[Math.floor(Math.random() * RARE_CAT_EMOJIS.length)];
      cat.classList.add("rare-cat");
      cat.dataset.points = "5";
      cat.dataset.type = "rare";
    } else if (isSpeed) {
      cat.textContent = CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)];
      cat.classList.add("speed-cat");
      cat.dataset.points = "3";
      cat.dataset.type = "speed";
    } else {
      cat.textContent = CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)];
      cat.dataset.points = "1";
      cat.dataset.type = "normal";
    }
    
    // Better vertical distribution - avoid top and bottom edges
    const trackHeight = track.clientHeight || 650; // Fallback height
    const margin = 80; // Keep cats away from edges
    const usableHeight = trackHeight - (margin * 2);
    const top = margin + (Math.random() * usableHeight);
    
    // Progressive speed increase: Level 1 = 6-9s, Level 10 = 2-4s
    const baseDur = Math.max(2, 9 - level * 0.7);
    const dur = (Math.random() * 2 + baseDur).toFixed(2);
    const rtl = Math.random() < 0.5;
    
    cat.style.top = `${top}px`;
    cat.style.animationDuration = `${dur}s`;
    cat.style.left = rtl ? "calc(100% + 80px)" : "-80px"; // Wider starting positions for bigger box
    if (rtl) cat.classList.add("rtl");
    
    // Track if cat was missed and force cleanup
    cat.addEventListener('animationend', () => {
      if (cat.parentNode) {
        missedCats++;
        cat.remove();
      }
    });
    
    // Anti-cheat: Force remove cats after maximum duration
    const maxDuration = parseFloat(dur) + 2; // Add 2 seconds buffer
    setTimeout(() => {
      if (cat.parentNode) {
        cat.remove();
      }
    }, maxDuration * 1000);
    
    // Anti-cheat: Track cat clicks to prevent spam
    let clickCount = 0;
    const originalOnClick = cat.onclick;

    cat.onclick = () => {
      if (!gameActive) return;
      
      // Anti-cheat: Validate click timing
      if (!isValidClick()) {
        return;
      }
      
      // Anti-cheat: Prevent multiple clicks on same cat
      clickCount++;
      if (clickCount > 1) {
        return; // Only allow one click per cat
      }
      
      // Add pop animation and immediately remove cat
      cat.classList.add("clicked");
      totalClicks++;
      
      // Calculate points with level-based multipliers
      const points = parseInt(cat.dataset.points);
      const catType = cat.dataset.type;
      const currentLevel = Math.min(level, 10);
      const levelConfig = LEVEL_CONFIG[currentLevel];
      
      if (catType === "troll") {
        // Troll cats: lose points and reset combo
        const penalty = Math.abs(points); // Make sure it's positive for subtraction
        score = Math.max(0, score - penalty); // Subtract penalty from score
        combo = 0; // Reset combo completely
        
        // Update score display immediately
        document.getElementById("score-display").textContent = `Score: ${score}`;
        document.getElementById("combo-display").textContent = `Combo: ${combo}x`;
        
        // Show penalty
        const penaltyPopup = document.createElement("div");
        penaltyPopup.className = "point-popup";
        penaltyPopup.style.color = "#ff0000";
        penaltyPopup.textContent = `-${penalty} OUCH!`;
        track.appendChild(penaltyPopup);
        setTimeout(() => penaltyPopup.remove(), 1500);
        
      } else {
        // Normal cats: apply combo and level multipliers
        const comboMultiplier = Math.min(combo + 1, levelConfig.maxMultiplier);
        const finalPoints = points * comboMultiplier;
        
        score += finalPoints;
        combo++;
        
        // Cap combo at reasonable level
        if (combo > 50) {
          combo = 50;
        }
        
        if (combo > maxCombo) {
          maxCombo = combo;
        }
        
        // Show normal point popup
        const pointPopup = document.createElement("div");
        pointPopup.className = "point-popup";
        pointPopup.textContent = `+${finalPoints}`;
        if (comboMultiplier > 1) {
          pointPopup.textContent += ` (${comboMultiplier}x)`;
        }
        track.appendChild(pointPopup);
        setTimeout(() => pointPopup.remove(), 1500);
      }
      
      // Update displays
      document.getElementById("score-display").textContent = `Score: ${score}`;
      document.getElementById("combo-display").textContent = `Combo: ${combo}x`;
      

      
      // Show combo popup for high combos (centered)
      if (combo >= 5 && combo % 5 === 0) {
        const comboPopup = document.createElement("div");
        comboPopup.className = "combo-popup";
        comboPopup.textContent = `${combo}x COMBO!`;
        track.appendChild(comboPopup);
        setTimeout(() => comboPopup.remove(), 2000);
      }
      
      // Show meow bubble
      const bubble = document.createElement("div");
      bubble.className = "meow";
      
      if (catType === "troll") {
        bubble.textContent = "GOTCHA!";
        bubble.style.background = "#ff4444";
        bubble.style.color = "white";
      } else {
        bubble.textContent = catType === "rare" ? "RARE!" : catType === "speed" ? "FAST!" : "Meow!";
      }
      
      track.appendChild(bubble);
      bubble.style.left = `${rect.left - tr.left + 8}px`;
      bubble.style.top = `${rect.top - tr.top - 10}px`;
      setTimeout(() => bubble.remove(), 1200);
      
      // Level up check - check if player has earned enough points to advance
      if (level < 10) {
        const currentLevelReq = LEVEL_CONFIG[level].requiredScore;
        if (score >= currentLevelReq && !levelUpFlag) {
          levelUpFlag = true;
          levelUp();
          // Reset flag after level up
          setTimeout(() => { levelUpFlag = false; }, 1000);
        }
      }
      
      // Reset combo timeout (only for non-troll cats)
      if (catType !== "troll") {
        clearTimeout(comboTimeout);
        comboTimeout = setTimeout(resetCombo, 2000);
      }
      
      checkAchievements();
      
      // Immediately remove cat after click
      cat.remove();
    };

    track.appendChild(cat);
  }

  for (let i = 0; i < 8; i++) createCat();
  setInterval(() => {
    if (document.getElementById(ID)) createCat();
  }, 1200);

  // Make the box draggable anywhere
  let isDragging = false, offsetX = 0, offsetY = 0;
  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = box.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = "none";
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    box.style.left = e.clientX - offsetX + "px";
    box.style.top = e.clientY - offsetY + "px";
    box.style.bottom = "auto";
    box.style.right = "auto";
    box.style.transform = "none";
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
    document.body.style.userSelect = "auto";
  });

  document.body.appendChild(box);
})();
