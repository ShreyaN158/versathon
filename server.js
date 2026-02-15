const express = require('express');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ============================================
// XP SYSTEM FUNCTIONS
// ============================================

function calculateXPForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function calculateLevelFromXP(xp) {
  let level = 1;
  while (xp >= calculateXPForLevel(level + 1)) {
    level++;
  }
  return level;
}

function getXPProgress(xp, level) {
  const currentLevelXP = calculateXPForLevel(level);
  const nextLevelXP = calculateXPForLevel(level + 1);
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  return Math.max(0, Math.min(1, xpInCurrentLevel / xpNeededForLevel));
}

const XP_REWARDS = {
  DAILY_LOGIN: 10,
  COMPLETE_TASK: 50,
  COMPLETE_CHALLENGE: 100,
  HELP_OTHER_USER: 30,
  SHARE_CONTENT: 15,
  PROFILE_COMPLETE: 75,
  QUIZ_COMPLETED: 50,
  HIGH_SCORE: 25
};

function initializeUserXP(user) {
  if (typeof user.xp !== 'number') user.xp = 0;
  if (typeof user.level !== 'number') user.level = 1;
  if (!user.lastXpGain) user.lastXpGain = null;
  if (!user.createdAt) user.createdAt = new Date().toISOString();
  return user;
}

// ============================================
// DATA LOADING
// ============================================

let data = JSON.parse(fs.readFileSync('data.json'));

if (!data.users) {
  data.users = [];
}

function saveData() {
  fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

// ============================================
// QUIZ ROUTES (EXISTING)
// ============================================

app.get('/quiz', async (req, res) => {
  const response = await fetch('https://opentdb.com/api.php?amount=5&type=multiple');
  const json = await response.json();

  const questions = json.results.map(q => ({
    question: q.question,
    options: [...q.incorrect_answers, q.correct_answer].sort(),
    answer: q.correct_answer
  }));

  res.json(questions);
});

app.post('/submit', (req, res) => {
  const { name, score } = req.body;

  if (!name || score == null) {
    return res.status(400).json({ error: "Invalid submission" });
  }

  const existingPlayer = data.leaderboard.find(p => p.name === name);

  if (existingPlayer) {
    if (score > existingPlayer.score) {
      existingPlayer.score = score;
      existingPlayer.date = new Date();
    }
  } else {
    data.leaderboard.push({
      name,
      score,
      date: new Date()
    });
  }

  data.leaderboard.sort((a, b) => b.score - a.score);

  // Award XP
  let xpData = null;
  let userIndex = data.users.findIndex(u => u.username === name);
  
  if (userIndex === -1) {
    data.users.push({
      id: `user_${Date.now()}`,
      username: name,
      xp: 0,
      level: 1,
      lastXpGain: null,
      createdAt: new Date().toISOString()
    });
    userIndex = data.users.length - 1;
  }
  
  const user = data.users[userIndex];
  initializeUserXP(user);
  
  const oldLevel = user.level;
  const xpGained = XP_REWARDS.QUIZ_COMPLETED + (score >= 4 ? XP_REWARDS.HIGH_SCORE : 0);
  user.xp += xpGained;
  user.lastXpGain = new Date().toISOString();
  user.level = calculateLevelFromXP(user.xp);
  
  data.users[userIndex] = user;
  
  xpData = {
    xpGained,
    leveledUp: user.level > oldLevel,
    newLevel: user.level,
    totalXP: user.xp
  };

  saveData();

  res.json({ 
    message: "Score saved successfully",
    xp: xpData
  });
});

app.get('/leaderboard', (req, res) => {
  const top10 = data.leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.json(top10);
});

app.post('/generate', (req, res) => {
  const sentences = req.body.text.split('.').filter(s => s.length > 10);
  const questions = sentences.slice(0, 3).map(s => ({
    question: "Choose correct statement",
    options: [s, "Wrong option", "Another wrong", "Random"],
    answer: s
  }));
  res.json(questions);
});

// ============================================
// XP SYSTEM ROUTES (NEW)
// ============================================

app.get('/api/users/:username/xp', (req, res) => {
  try {
    let user = data.users.find(u => u.username === req.params.username);
    
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        username: req.params.username,
        xp: 0,
        level: 1,
        lastXpGain: null,
        createdAt: new Date().toISOString()
      };
      data.users.push(user);
      saveData();
    }
    
    initializeUserXP(user);
    const nextLevelXP = calculateXPForLevel(user.level + 1);
    const currentLevelXP = calculateXPForLevel(user.level);
    const progress = getXPProgress(user.xp, user.level);
    
    res.json({
      xp: user.xp,
      level: user.level,
      xpForNextLevel: nextLevelXP,
      xpForCurrentLevel: currentLevelXP,
      xpInCurrentLevel: user.xp - currentLevelXP,
      xpNeededForNextLevel: nextLevelXP - user.xp,
      progress: progress
    });
  } catch (error) {
    console.error('Error getting user XP:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users/:username/xp', (req, res) => {
  try {
    const { amount, action } = req.body;
    
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid XP amount' });
    }
    
    let userIndex = data.users.findIndex(u => u.username === req.params.username);
    
    if (userIndex === -1) {
      const newUser = {
        id: `user_${Date.now()}`,
        username: req.params.username,
        xp: 0,
        level: 1,
        lastXpGain: null,
        createdAt: new Date().toISOString()
      };
      data.users.push(newUser);
      userIndex = data.users.length - 1;
    }
    
    const user = data.users[userIndex];
    initializeUserXP(user);
    
    const oldLevel = user.level;
    user.xp += amount;
    user.lastXpGain = new Date().toISOString();
    user.level = calculateLevelFromXP(user.xp);
    const leveledUp = user.level > oldLevel;
    
    data.users[userIndex] = user;
    saveData();
    
    const nextLevelXP = calculateXPForLevel(user.level + 1);
    const currentLevelXP = calculateXPForLevel(user.level);
    
    res.json({
      success: true,
      xpGained: amount,
      action: action,
      leveledUp: leveledUp,
      newLevel: user.level,
      totalXP: user.xp,
      xpForNextLevel: nextLevelXP,
      xpForCurrentLevel: currentLevelXP,
      xpInCurrentLevel: user.xp - currentLevelXP,
      xpNeededForNextLevel: nextLevelXP - user.xp,
      progress: getXPProgress(user.xp, user.level)
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const leaderboard = data.users
      .map(user => {
        initializeUserXP(user);
        return {
          id: user.id,
          username: user.username,
          xp: user.xp,
          level: user.level
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/xp-rewards', (req, res) => {
  res.json(XP_REWARDS);
});

// ============================================
// START SERVER
// ============================================

app.listen(3000, () => console.log("Server running on http://localhost:3000"));