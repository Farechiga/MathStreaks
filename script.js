/**
 * MATH MAGIC: BOUGIE STREAKS 
 * Logic Engine v2.0
 */

const state = {
    phase: 'WARMUP', // WARMUP or CHALLENGE
    level: 1,
    knowns: [[2, 2], [5, 5], [3, 3]],
    learning: [[7, 5], [6, 9], [8, 4], [7, 6]],
    currentProblem: null,
    cccCount: 0,
    streak: 0,
    sets: 0,
    timerId: null,
    isProcessing: false
};

const UNIT_PX = 50;
const streakImages = [
    'assets/Calf crash.png', 'assets/Calf hop.png', 'assets/Calf kick.png', 
    'assets/Calf licking daisy.png', 'assets/Calf Milk.png', 
    'assets/Calf Sitting.png', 'assets/Calf v Butterfly.png'
];

// DOM Elements
const problemText = document.getElementById('problem-text');
const inputArea = document.getElementById('input-area');
const stackEl = document.getElementById('visual-stack');
const rewardOverlay = document.getElementById('reward-overlay');

/**
 * 1. CORE UTILITIES
 */
function speak(text, callback) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-AU';
    msg.rate = 0.9;
    if (callback) msg.onend = callback;
    window.speechSynthesis.speak(msg);
}

function clearAllTimers() {
    if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
    }
}

/**
 * 2. GAME FLOW CONTROLLER
 */
function nextRound() {
    clearAllTimers();
    state.isProcessing = false;

    if (state.cccCount < 20) {
        state.phase = 'WARMUP';
        startWarmup();
    } else {
        state.phase = 'CHALLENGE';
        startChallenge();
    }
}

/**
 * 3. WARMUP MODE (Cover-Copy-Compare with 3 Fields)
 */
function startWarmup() {
    const pool = state.learning;
    const pair = pool[Math.floor(Math.random() * pool.length)];
    state.currentProblem = { a: pair[0], b: pair[1], sum: pair[0] + pair[1] };

    renderStack(pair[0], pair[1]);
    
    // Show and Read aloud
    problemText.innerHTML = `${pair[0]} + ${pair[1]} = ${state.currentProblem.sum}`;
    speak(`${pair[0]} plus ${pair[1]} is ${state.currentProblem.sum}`, () => {
        // After narration, switch to input fields
        setTimeout(() => {
            setupWarmupFields();
        }, 1000);
    });
}

function setupWarmupFields() {
    problemText.innerHTML = `
        <input type="number" id="w1" class="w-field" autofocus> + 
        <input type="number" id="w2" class="w-field"> = 
        <input type="number" id="w3" class="w-field">
    `;
    
    const fields = [document.getElementById('w1'), document.getElementById('w2'), document.getElementById('w3')];
    
    fields.forEach((f, i) => {
        f.addEventListener('input', () => {
            if (f.value.length >= f.dataset.maxlength || (i < 2 && f.value.length === 1) || (i === 2 && f.value.length === 2)) {
                if (fields[i+1]) fields[i+1].focus();
            }
        });
        
        f.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') checkWarmup(fields);
        });
    });
}

function checkWarmup(fields) {
    const v1 = parseInt(fields[0].value);
    const v2 = parseInt(fields[1].value);
    const v3 = parseInt(fields[2].value);

    // Accept 5+7=12 or 7+5=12
    const correctAddends = (v1 === state.currentProblem.a && v2 === state.currentProblem.b) || 
                          (v1 === state.currentProblem.b && v2 === state.currentProblem.a);
    const correctSum = v3 === state.currentProblem.sum;

    if (correctAddends && correctSum) {
        state.cccCount++;
        document.getElementById('ccc-count').innerText = `${state.cccCount}/20`;
        nextRound();
    } else {
        speak(`Let's try that again. ${state.currentProblem.a} plus ${state.currentProblem.b} is ${state.currentProblem.sum}`);
        setTimeout(nextRound, 2000);
    }
}

/**
 * 4. CHALLENGE MODE (3s Timer, No Narration)
 */
function startChallenge() {
    const isLearning = Math.random() < 0.2;
    const pool = isLearning ? state.learning : state.knowns;
    const pair = pool[Math.floor(Math.random() * pool.length)];
    state.currentProblem = { a: pair[0], b: pair[1], sum: pair[0] + pair[1] };

    renderStack(pair[0], pair[1]);
    problemText.innerHTML = `${pair[0]} + ${pair[1]} = <input type="number" id="ans" class="ans-field" autofocus>`;
    
    const ansField = document.getElementById('ans');
    ansField.focus();

    ansField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleChallengeSubmit(ansField.value);
    });

    // Hard 3-second timer
    state.timerId = setTimeout(() => {
        handleChallengeFailure();
    }, 3000);
}

function handleChallengeSubmit(val) {
    clearAllTimers();
    if (state.isProcessing) return;
    state.isProcessing = true;

    if (parseInt(val) === state.currentProblem.sum) {
        state.streak++;
        updateUI();
        if (state.streak === 10) triggerReward("BOUGIE STREAK!", false);
        else if (state.streak === 20) triggerReward("DOUBLE BOUGIE!", true);
        else nextRound();
    } else {
        handleChallengeFailure();
    }
}

function handleChallengeFailure() {
    clearAllTimers();
    state.streak = 0;
    updateUI();
    
    problemText.innerHTML = `${state.currentProblem.a} + ${state.currentProblem.b} = ${state.currentProblem.sum}`;
    speak(`${state.currentProblem.a} plus ${state.currentProblem.b} is ${state.currentProblem.sum}`, () => {
        setTimeout(nextRound, 1000);
    });
}

/**
 * 5. VISUALS & REWARDS
 */
function renderStack(a, b) {
    stackEl.innerHTML = '';
    const h1 = a * UNIT_PX;
    const h2 = b * UNIT_PX;

    const b1 = document.createElement('div');
    b1.className = 'block block-a';
    b1.style.height = `${h1}px`;
    b1.style.bottom = '0';

    const b2 = document.createElement('div');
    b2.className = 'block block-b';
    b2.style.height = `${h2}px`;
    b2.style.bottom = `${h1}px`;

    stackEl.appendChild(b1);
    stackEl.appendChild(b2);
}

function triggerReward(title, isDouble) {
    confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 } });
    
    const img = isDouble ? 'assets/Double Bougie Ramming.png' : streakImages[Math.floor(Math.random() * streakImages.length)];
    rewardOverlay.innerHTML = `<img src="${img}"> <h1>${title}</h1>`;
    rewardOverlay.style.display = 'flex';
    
    speak(title, () => {
        setTimeout(() => {
            rewardOverlay.style.display = 'none';
            if (!isDouble) state.sets++;
            nextRound();
        }, 3000);
    });
}

function updateUI() {
    document.getElementById('streak-val').innerText = state.streak;
    document.getElementById('sets-val').innerText = state.sets;
}

window.onload = nextRound;
