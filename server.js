const express = require('express');
const fs = require('fs');
const fetch = require('node-fetch');

const path = require("path");


const app = express();
app.use(express.json());
app.use(express.static('public'));

let data = JSON.parse(fs.readFileSync('data.json'));

function saveData(){
  fs.writeFileSync('data.json', JSON.stringify(data,null,2));
}

// Quiz API
app.get('/quiz', async (req,res)=>{
  const response = await fetch('https://opentdb.com/api.php?amount=5&type=multiple');
  const json = await response.json();

  const questions = json.results.map(q=>({
    question:q.question,
    options:[...q.incorrect_answers,q.correct_answer].sort(),
    answer:q.correct_answer
  }));

  res.json(questions);
});

// Submit score
app.post('/submit', (req, res) => {
  const { name, score } = req.body;

  if (!name || score == null) {
    return res.status(400).json({ error: "Invalid submission" });
  }

  const existingPlayer = data.leaderboard.find(p => p.name === name);

  if (existingPlayer) {
    // Keep only highest score
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

  saveData();

  res.json({ message: "Score saved successfully" });
});

// Leaderboard
app.get('/leaderboard', (req, res) => {
  const top10 = data.leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.json(top10);
});

// MCQ Generator
app.post('/generate',(req,res)=>{
  const sentences=req.body.text.split('.').filter(s=>s.length>10);
  const questions=sentences.slice(0,3).map(s=>({
    question:"Choose correct statement",
    options:[s,"Wrong option","Another wrong","Random"],
    answer:s
  }));
  res.json(questions);
});

app.listen(3000,()=>console.log("Server running on http://localhost:3000"));