const GUESSES = 5;
document.getElementById("limit").textContent = GUESSES;
document.getElementById("guessLimit").textContent = GUESSES;

const ANSWERS = [
  {answer:"Lamumu", category:"project", hints:["Cow‑themed NFT collection","Official to COMMON","Starts with L"]},
  {answer:"gmoo", category:"culture", hints:["Community greeting","Rhymes with moo","Starts with g"]},
  {answer:"Common", category:"ecosystem", hints:["Parent project","Venn diagram logo","Starts with C"]},
  {answer:"cow", category:"theme", hints:["The animal","Horns in the art","Starts with c"]},
  {answer:"horns", category:"trait", hints:["On the head","Pointy","Starts with h"]},
  {answer:"spots", category:"trait", hints:["On the body","Black/white pattern","Starts with s"]},
  {answer:"hoof", category:"trait", hints:["On the feet","Clippity‑clop","Starts with h"]},
  {answer:"herd", category:"culture", hints:["The community","Group of cows","Starts with h"]},
  {answer:"pasture", category:"vibe", hints:["Where cows chill","Green and open","Starts with p"]},
  {answer:"milk", category:"item", hints:["From cows","Goes with cereal","Starts with m"]},
  {answer:"mint", category:"nft", hints:["How you get one","Blockchain action","Starts with m"]},
  {answer:"lamoolist", category:"nft", hints:["Early access","WhiteList role","Starts with l"]},
  {answer:"gm", category:"culture", hints:["Crypto greeting","Two letters","Starts with g"]},
];

let state = {
  streak: Number(localStorage.getItem("streak")||0),
  totalScore: Number(localStorage.getItem("totalScore")||0),
  wrong: 0,
  secret: null,
  hints: [],
  runningScore: 0
};

const el = (id) => document.getElementById(id);
const input = el("guessInput");
const used = el("used");
const limit = el("limit");
const cat = el("category");
const hint = el("hint");
const status = el("status");
const scoreEl = el("score");
const streakEl = el("streak");
const lbEl = el("lb");

function chooseSecret(){
  const pick = ANSWERS[Math.floor(Math.random()*ANSWERS.length)];
  state.secret = pick.answer;
  state.hints  = pick.hints;
  cat.textContent = pick.category;
  state.wrong = 0; used.textContent = "0";
  hint.textContent = "Hint appears here after a miss…";
  status.textContent = "";
  input.value = ""; input.focus();
}

function scoreFor(wrong, streak){
  const base = Math.max(10, 100 - 15*wrong);
  return base + 20*Math.max(0, streak-1);
}

function saveRun(name, total, streak){
  const runs = JSON.parse(localStorage.getItem("runs")||"[]");
  runs.push({name, score: total, streak, date: new Date().toISOString().slice(0,10)});
  localStorage.setItem("runs", JSON.stringify(runs));
}

function renderLeaderboard(){
  const runs = JSON.parse(localStorage.getItem("runs")||"[]")
    .sort((a,b)=> b.score - a.score || b.streak - a.streak).slice(0,5);
  lbEl.innerHTML = runs.length ? runs.map(r=>`<li><strong>${r.name}</strong> — ${r.score} pts · streak ${r.streak} · ${r.date}</li>`).join("") : "<li>No runs yet. Be the first!</li>";
}

function closeEnough(a,b){
  a = a.trim().toLowerCase(); b = b.trim().toLowerCase();
  if (a === b) return {match:true, exact:true};
  // simple closeness
  if (Math.abs(a.length-b.length)<=1){
    let diff=0;
    for (let i=0;i<Math.min(a.length,b.length);i++) if (a[i]!==b[i]) diff++;
    if (diff<=1) return {match:true, exact:false};
  }
  return {match:false, exact:false};
}

function win(){
  state.streak += 1;
  const pts = scoreFor(state.wrong, state.streak);
  state.totalScore += pts;
  status.textContent = `GMOOO! You nailed it: ${state.secret} 🐄  (+${pts})`;
  scoreEl.textContent = state.totalScore;
  streakEl.textContent = state.streak;
  localStorage.setItem("streak", state.streak);
  localStorage.setItem("totalScore", state.totalScore);
  
  // 🔹 Trigger the win flash
  document.body.classList.add("win");
  setTimeout(() => document.body.classList.remove("win"), 800);

}

function lose(){
  status.textContent = `Out of guesses! The answer was ${state.secret}. gmoo next time 🐄`;
  state.streak = 0; streakEl.textContent = 0;
  localStorage.setItem("streak", 0);
}

function onGuess(){
  const val = input.value.trim();
  if (!val) return;
  const {match, exact} = closeEnough(val, state.secret);
  if (exact){ win(); return; }
  state.wrong += 1; used.textContent = String(state.wrong);
  if (match){ status.textContent = "So close! gmoo‑ve again, you’ve almost got it. 🐄"; return; }
  // show hint
  if (state.wrong <= state.hints.length){ hint.textContent = "Hint: " + state.hints[state.wrong-1]; }
  if (state.wrong >= GUESSES){ lose(); }
}

function newRound(){
  chooseSecret();
  renderLeaderboard();
}

function resetScores(){
  localStorage.removeItem("runs");
  localStorage.setItem("streak", "0");
  localStorage.setItem("totalScore", "0");
  state.streak = 0; state.totalScore = 0;
  scoreEl.textContent = 0; streakEl.textContent = 0;
  renderLeaderboard();
}

document.getElementById("guessBtn").onclick = onGuess;
document.getElementById("playAgainBtn").onclick = ()=>{
  const name = prompt("Enter a name for the leaderboard:", "anon-moo") || "anon-moo";
  saveRun(name, state.totalScore, state.streak);
  renderLeaderboard();
  newRound();
};
document.getElementById("resetBtn").onclick = resetScores;

// init
scoreEl.textContent = state.totalScore;
streakEl.textContent = state.streak;
limit.textContent = GUESSES;
renderLeaderboard();
newRound();
