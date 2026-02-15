let questions=[],index=0,score=0;

fetch('/quiz').then(res=>res.json()).then(data=>{questions=data;showQuestion();});

function showQuestion(){
 const q=questions[index];
 question.innerHTML=q.question;
 options.innerHTML='';

 q.options.forEach(o=>{
  const div=document.createElement('div');
  div.className='option';
  div.innerHTML=o;
  div.onclick=()=>{if(o===q.answer)score++;nextQuestion();}
  options.appendChild(div);
 });
}

function nextQuestion(){
 index++;
 if(index<questions.length)showQuestion();
 else{
  const name=prompt("Enter name");
  fetch('/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,score})});
  alert("Score "+score);
  location.href='leaderboard.html';
 }
}
