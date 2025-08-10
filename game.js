// ====== SETTINGS ======
const GUESSES = 5;
const ROUNDS_PER_SESSION = 13;

// HUD limits
document.getElementById("limit").textContent = GUESSES;
document.getElementById("guessLimit").textContent = GUESSES;
document.getElementById("roundMax").textContent = ROUNDS_PER_SESSION;

// ====== ANSWERS ======
const ANSWERS = [
  {answer:"Lamumu", category:"project", hints:["Cow‑themed NFT collection","Official to COMMON","Starts with L"]},
  {answer:"gmoo", category:"culture", hints:["Community greeting","Rhymes with moo","Starts with g"]},
  {answer:"Common", category:"ecosystem", hints:["Parent project","Venn diagram logo","Starts with C"]},
  {answer:"cow", category:"theme", hints:["Lamumu theme animal","Horns in the art","Starts with c"]},
  {answer:"horn", category:"trait", hints:["On the head of a cow","Pointy","Starts with h"]},
  {answer:"spot", category:"trait", hints:["On the body of a cow","Black/white pattern","Starts with s"]},
  {answer:"hoof", category:"trait", hints:["The feet of a cow","Clippity‑clop","Starts with h"]},
  {answer:"herd", category:"culture", hints:["Group of cows","Group of cows","Starts with h"]},
  {answer:"pasture", category:"vibe", hints:["Where cows chill","Green and open","Starts with p"]},
  {answer:"milk", category:"item", hints:["product from cows","Goes with cereal","Starts with m"]},
  {answer:"mint", category:"nft", hints:["How an nft is gotten","Blockchain action","Starts with m"]},
  {answer:"lamoolist", category:"nft", hints:["Early access","WhiteList role","Starts with l"]},
  {answer:"gm", category:"culture", hints:["Crypto greeting","Two letters","Starts with g"]},
];

// ====== STATE / ELEMENTS ======
let sessionDeck = []; // pre-shuffled 13 unique answers for this session
let started = false;  // waits for Start Game click

let state = {
  streak: 0,
  sessionScore: 0,     // score for current session
  roundIndex: 1,       // 1..ROUNDS_PER_SESSION
  roundResolved: false,// prevents double-scoring after win/lose
  wrong: 0,
  secret: null,
  hints: []
};

const el = (id) => document.getElementById(id);
const input = el("guessInput");
const used = el("used");
const cat = el("category");
const hint = el("hint");
const status = el("status");
const scoreEl = el("score");
const streakEl = el("streak");
const roundEl = el("round");
const lbEl = el("lb");

const startBtn = el("startBtn");
const guessBtn = el("guessBtn");
const playAgainBtn = el("playAgainBtn");
const endSessionBtn = el("endSessionBtn");
const resetBtn = el("resetBtn");

// ====== INIT UI (locked until Start) ======
guessBtn.disabled = true;
input.disabled = true;

// ====== GLOBAL LEADERBOARD (if you wired /api) ======
async function saveRun(name, total, streak){
  try {
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: name, score: total })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to save score");
  } catch (e) {
    console.error(e);
    // fallback local cache
    const runs = JSON.parse(localStorage.getItem("runs")||"[]");
    runs.push({ name, score: total, streak, date: new Date().toISOString().slice(0,10) });
    localStorage.setItem("runs", JSON.stringify(runs));
  }
}
async function renderLeaderboard(){
  try {
    const res = await fetch("/api/leaderboard?limit=10");
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Failed to fetch leaderboard");
    const runs = json.data || [];
    lbEl.innerHTML = runs.length
      ? runs.map(r=>`<li><strong>${r.player}</strong> — ${r.score} pts</li>`).join("")
      : "<li>No runs yet. Be the first!</li>";
  } catch (e) {
    console.error(e);
    // fallback: local
    const runs = JSON.parse(localStorage.getItem("runs")||"[]")
      .sort((a,b)=> b.score - a.score || b.streak - a.streak).slice(0,5);
    lbEl.innerHTML = runs.length
      ? runs.map(r=>`<li><strong>${r.name}</strong> — ${r.score} pts · streak ${r.streak} · ${r.date}</li>`).join("")
      : "<li>No runs yet. Be the first!</li>";
  }
}

// ====== UTILS ======
function scoreFor(wrong, streak){
  const base = Math.max(10, 100 - 15*wrong);
  return base + 20*Math.max(0, streak-1);
}
function closeEnough(a,b){
  a = a.trim().toLowerCase();
  b = b.trim().toLowerCase();
  if (a === b) return {match:true, exact:true}; // case-insensitive exact
  if (Math.abs(a.length-b.length) <= 1){
    let diff = 0;
    for (let i=0;i<Math.min(a.length,b.length);i++){
      if (a[i] !== b[i]) diff++;
    }
    if (diff <= 1) return {match:true, exact:false};
  }
  return {match:false, exact:false};
}
function shuffle(arr){
  const a = [...arr];
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// ====== GAME FLOW ======
function chooseSecret(){
  // pick from the pre-shuffled deck for this session
  const pick = sessionDeck[state.roundIndex - 1]; // 0-based index
  state.secret = pick.answer;
  state.hints  = pick.hints;
  cat.textContent = pick.category;
  startRound();
}

function startSession(){
  started = true;
  state.roundIndex = 1;
  state.sessionScore = 0;
  state.streak = 0;

  scoreEl.textContent = 0;
  streakEl.textContent = 0;
  roundEl.textContent = state.roundIndex;

  // build a unique 13-item deck for the session
  sessionDeck = shuffle(ANSWERS).slice(0, ROUNDS_PER_SESSION);

  chooseSecret();
}

function startRound(){
  state.roundResolved = false;
  guessBtn.disabled = false;
  input.disabled = false;

  state.wrong = 0;
  used.textContent = "0";
  status.textContent = "";
  input.value = "";
  input.focus();

  // ✅ Show the FIRST hint immediately on round start
  const first = state.hints?.[0];
  hint.textContent = first ? ("Hint: " + first) : "No hint available.";
}

function advanceRound(){
  state.roundIndex += 1;
  roundEl.textContent = state.roundIndex;

  if (state.roundIndex > ROUNDS_PER_SESSION){
    finalizeSession();  // saves & restarts from zero
    return;
  }
  chooseSecret();
}

function finalizeSession(){
  const name = prompt("Enter a name for the leaderboard:", "anon-moo") || "anon-moo";
  saveRun(name, state.sessionScore, state.streak);
  renderLeaderboard();
  alert(`Session complete! Score: ${state.sessionScore}`);
  // reset to waiting state (require Start click again)
  started = false;
  guessBtn.disabled = true;
  input.disabled = true;
  hint.textContent = 'Click <strong>Start Game</strong> to show your first hint…';
  // Reset HUD
  cat.textContent = "—";
  used.textContent = "0";
  status.textContent = "";
  scoreEl.textContent = "0";
  streakEl.textContent = "0";
  roundEl.textContent = "1";
}

// ====== ROUND RESULTS ======
function win(){
  state.streak += 1;
  const pts = scoreFor(state.wrong, state.streak);
  state.sessionScore += pts;

  status.textContent = `GMOOO! You nailed it: ${state.secret} 🐄  (+${pts})`;
  scoreEl.textContent = state.sessionScore;
  streakEl.textContent = state.streak;

  // win flash + lock round
  document.body.classList.add("win");
  setTimeout(()=>document.body.classList.remove("win"), 800);

  state.roundResolved = true;
  guessBtn.disabled = true;

  // Auto-advance
  setTimeout(advanceRound, 900);
}

function lose(){
  status.textContent = `Out of guesses! The answer was ${state.secret}. gmoo next time 🐄`;
  state.streak = 0;
  streakEl.textContent = 0;

  state.roundResolved = true;
  guessBtn.disabled = true;

  // Auto-advance
  setTimeout(advanceRound, 600);
}

function onGuess(){
  // block extra clicks after round resolved & block until started
  if (!started) return alert("Click Start Game to begin!");
  if (state.roundResolved) return;

  const val = input.value.trim();
  if (!val) return;

  const {match, exact} = closeEnough(val, state.secret);
  if (exact){ win(); return; }

  state.wrong += 1;
  used.textContent = String(state.wrong);

  if (match){
    status.textContent = "So close! gmoo‑ve again, you’ve almost got it. 🐄";
    return;
  }

  // ✅ Show NEXT hint for each miss (we already showed index 0)
  if (state.wrong < state.hints.length){
    hint.textContent = "Hint: " + state.hints[state.wrong];
  } else {
    hint.textContent = "No more hints!";
  }

  if (state.wrong >= GUESSES){
    lose();
  }
}

// ====== CONTROLS ======
startBtn.onclick = () => {
  if (started) return;      // ignore if already running
  startSession();
};

guessBtn.onclick = onGuess;

// Optional: only works after a round is resolved
playAgainBtn.onclick = () => {
  if (!started) return alert("Click Start Game to begin!");
  if (state.roundResolved) advanceRound();
};

// Save mid-session & restart from zero
endSessionBtn.onclick = () => {
  const name = prompt("Enter a name for the leaderboard:", "anon-moo") || "anon-moo";
  saveRun(name, state.sessionScore, state.streak);
  renderLeaderboard();
  alert(`Session saved early! Score: ${state.sessionScore}`);

  // reset to waiting state
  started = false;
  guessBtn.disabled = true;
  input.disabled = true;
  hint.textContent = 'Click <strong>Start Game</strong> to show your first hint…';
  cat.textContent = "—";
  used.textContent = "0";
  status.textContent = "";
  scoreEl.textContent = "0";
  streakEl.textContent = "0";
  roundEl.textContent = "1";
};

resetBtn.onclick = () => {
  localStorage.removeItem("runs");
  renderLeaderboard();
  alert("Local leaderboard reset.");
};

// ====== INIT ======
renderLeaderboard();
// Notice: we DO NOT auto-start a session here anymore.
// The player must click “Start Game” to begin and see the first hint.
