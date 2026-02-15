const express = require('express');
const fs = require('fs');
const fetch = require('node-fetch');

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


  // server.js
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public')); // your HTML/CSS/JS

// Load or initialize MCQ storage
let mcqData = {};
if (fs.existsSync('mcqs.json')) {
  mcqData = JSON.parse(fs.readFileSync('mcqs.json'));
}

// Endpoint to generate MCQs
app.post('/generate', (req, res) => {
  const { text, lesson } = req.body;

  if (!text || !lesson) {
    return res.status(400).json({ error: 'Text and lesson are required' });
  }

  // Simulate MCQ generation (replace with real AI logic if needed)
  const generatedMCQs = [
    {
      question: "What is the main topic?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      answer: "Option A"
    },
    {
      question: "Which is correct statement?",
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      answer: "Option 3"
    }
  ];

  // Save MCQs under the lesson
  if (!mcqData[lesson]) mcqData[lesson] = [];
  mcqData[lesson].push(...generatedMCQs);

  fs.writeFileSync('mcqs.json', JSON.stringify(mcqData, null, 2));

  res.json(generatedMCQs);
});

// Endpoint to get MCQs for a lesson
app.get('/quiz/:lesson', (req, res) => {
  const lesson = req.params.lesson;
  const mcqs = mcqData[lesson] || [];
  res.json(mcqs);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


  res.json(questions);
});

// Submit score
app.post('/submit',(req,res)=>{
  data.leaderboard.push(req.body);
  data.leaderboard.sort((a,b)=>b.score-a.score);
  saveData();
  res.json({msg:"Saved"});
});

// Leaderboard
app.get('/leaderboard',(req,res)=>{
  res.json(data.leaderboard.slice(0,10));
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
