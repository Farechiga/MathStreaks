/**
 * MATH MAGIC: BOUGIE STREAKS 
 * Logic Engine v6.0 - Reliability & Auto-Advance Focus
 */

const state = {
    phase: 'WARMUP',
    cccCount: 0,
    streak: 0,
    sets: 0,
    timerId: null,
    currentProblem: null,
    isProcessing: false,
    voice: null
};

const display = document.getElementById('problem-display');
const instruct = document.getElementById('instruction-text');
const stackEl = document.getElementById('visual-stack');
const overlay = document.getElementById('reward-overlay');

// 1. SPEECH ENGINE INITIALIZATION
function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    state.voice = voices.find(v => v.lang === 'en-AU' || v.lang === 'en-GB') || voices[0];
}
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

/**
 * Robust Speech: Narrates without blocking game progression.
 */
function speak(text, callback) {
    window.speechSynthesis.cancel();
    let phoneticText = text.replace(/Bougie/g, "Boh-ghee");
    const msg = new SpeechSynthesisUtterance(phoneticText);
    if (state.voice) msg.voice = state.voice;
    msg.lang = 'en-AU';
    msg.rate = 0.9;
    
    // Decoupled: We call the callback after a safety timeout to prevent hanging.
    if (callback) {
        msg.onend = callback;
        // Safety fallback if speech fails to fire 'onend'
        setTimeout(() => {
            if (state.phase === 'WARMUP' && document.getElementById('w1') === null) {
                callback();
            }
        }, 3000);
    }
    window.speechSynthesis.speak(msg);
}

function playSuccessDitty() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; 
    notes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, context.currentTime + i * 0.1 + 0.05);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + i * 0.1 + 0.2);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(context.currentTime + i * 0.1);
        osc.stop(context.currentTime + i * 0.1 + 0.3);
    });
}

/**
 * 80/20 Problem Generation
 */
function generateProblem() {
    let a, b, sum;
    if (state.phase === 'WARMUP') {
        a = Math.floor(Math.random() * 9) + 1; // Addends <= 9
        b = Math.floor(Math.random() * 9) + 1;
    } else {
        const isHard = Math.random() < 0.2;
        const limit = isHard ? 20 : 15;
        do {
            a = Math.floor(Math.random() * 10) + 1; // Addends <= 10
            b = Math.floor(Math.random() * 10) + 1;
            sum = a + b;
        } while (sum > limit || (isHard && sum <= 15));
    }
    return { a, b, sum: a + b };
}

function renderStack(a, b) {
    stackEl.innerHTML = `
        <div class="block block-a" style="height:${a * 50}px; bottom:0;"></div>
        <div class="block block-b" style="height:${b * 50}px; bottom:${a * 50}px;"></div>
    `;
}

/**
 * Global Reset & Round Controller
 */
function initRound() {
    // Kill all "ghost" timers and reset processing lock
    if (state.timerId) clearTimeout(state.timerId);
    state.isProcessing = false; 
    instruct.innerText = ""; 
    
    if (state.cccCount < 20) {
        state.phase = 'WARMUP';
        state.currentProblem = generateProblem();
        renderStack(state.currentProblem.a, state.currentProblem.b);
        display.innerHTML = `${state.currentProblem.a} + ${state.currentProblem.b} = ${state.currentProblem.sum}`;
        instruct.innerText = "Remember the numbers!";
        
        // Decoupled speech
        speak(`${state.currentProblem.a} plus ${state.currentProblem.b} is ${state.currentProblem.sum}`);
        setTimeout(setupWarmupInputs, 2000); 
    } else {
        state.phase = 'CHALLENGE';
        state.currentProblem = generateProblem();
        renderStack(state.currentProblem.a, state.currentProblem.b);
        display.innerHTML = `${state.currentProblem.a} + ${state.currentProblem.b} = <input type="number" id="ans" class="ans-field">`;
        
        // Resource buffer for Chromebook focus
        setTimeout(() => {
            const input = document.getElementById('ans');
            if (input) {
                input.focus();
                // Auto-advance & Enter listeners
                input.oninput = () => {
                    const targetLen = state.currentProblem.sum >= 10 ? 2 : 1;
                    if (input.value.length >= targetLen) checkChallenge(input.value);
                };
                input.onkeydown = (e) => { if (e.key === 'Enter') checkChallenge(input.value); };
            }
        }, 100);

        // 5-second decay timer for challenge
        state.timerId = setTimeout(() => handleFailure(), 5000);
    }
}

function setupWarmupInputs() {
    instruct.innerText = "Recreate the equation!";
    display.innerHTML = `
        <input type="number" id="w1" class="w-field"> <span>+</span> 
        <input type="number" id="w2" class="w-field"> <span>=</span> 
        <input type="number" id="w3" class="w-field">
    `;
    
    setTimeout(() => {
        const fields = [document.getElementById('w1'), document.getElementById('w2'), document.getElementById('w3')];
        if (fields[0]) fields[0].focus(); 

        fields.forEach((f, i) => {
            // Auto-advance logic
            f.oninput = () => {
                if (i < 2 && f.value.length >= 1) fields[i+1].focus();
                if (i === 2) {
                    const targetLen = state.currentProblem.sum >= 10 ? 2 : 1;
                    if (f.value.length >= targetLen) checkWarmup(fields);
                }
            };
            // Backup Enter key support
            f.onkeydown = (e) => { if (e.key === 'Enter') checkWarmup(fields); };
        });
    }, 100);
}

function checkWarmup(fields) {
    if (state.isProcessing) return;
    const v1 = parseInt(fields[0].value);
    const v2 = parseInt(fields[1].value);
    const v3 = parseInt(fields[2].value);
    const isCorrect = ((v1 === state.currentProblem.a && v2 === state.currentProblem.b) || 
                       (v1 === state.currentProblem.b && v2 === state.currentProblem.a)) && 
                      v3 === state.currentProblem.sum;
    
    if (isCorrect) {
        state.isProcessing = true;
        state.cccCount++;
        document.getElementById('ccc-count').innerText = `${state.cccCount}/20`;
        initRound();
    } else { handleFailure(); }
}

function checkChallenge(val) {
    if (state.isProcessing) return;
    clearTimeout(state.timerId);
    state.isProcessing = true;
    
    if (parseInt(val) === state.currentProblem.sum) {
        state.streak++;
        if (state.streak % 10 === 0) {
            state.sets++; 
            updateStats();
            // Milestone Rewards
            const milestoneMap = {
                10: { title: "Boh-ghee Streak!", img: "CalfCrash.png" },
                20: { title: "Double Boh-ghee!", img: "DoubleBougieRamming.png" },
                30: { title: "Triple Boh-ghee!", img: "TripleBougiePyramid.png" },
                40: { title: "Quad Boh-ghee Squad!", img: "BougieQuadSquad.png" },
                50: { title: "The Perfect Boh-ghee!", img: "ThePerfectBougie.png" }
            };
            const reward = milestoneMap[state.streak] || { title: "Boh-ghee Streak!", img: "CalfCrash.png" };
            triggerReward(reward.title, reward.img);
        } else {
            updateStats();
            initRound();
        }
    } else { handleFailure(); }
}

function handleFailure() {
    if (state.timerId) clearTimeout(state.timerId);
    state.isProcessing = true; // Lock further input during correction
    state.streak = 0; 
    updateStats();
    display.innerHTML = `<span style="color:#e74c3c">${state.currentProblem.a} + ${state.currentProblem.b} = ${state.currentProblem.sum}</span>`;
    speak(`${state.currentProblem.a} plus ${state.currentProblem.b} is ${state.currentProblem.sum}`);
    setTimeout(initRound, 2000); 
}

function triggerReward(title, imgFile) {
    confetti({ particleCount: 250, spread: 100, origin: { y: 0.6 } });
    playSuccessDitty();
    overlay.innerHTML = `<img src="Assets/${imgFile}" style="max-width: 80%; max-height: 70vh; border-radius: 40px;">`;
    overlay.style.display = 'flex';
    
    speak(title);
    setTimeout(() => {
        overlay.style.display = 'none';
        initRound();
    }, 4000);
}

function updateStats() {
    document.getElementById('streak-val').innerText = state.streak;
    document.getElementById('sets-val').innerText = state.sets;
}

function handleFirstClick() {
    if (!state.currentProblem) initRound();
}
