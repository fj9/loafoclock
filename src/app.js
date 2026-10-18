import { recipeFor, loafDescription } from './recipe.js';
import { clockAfter, findRatio, planDeadline, planLimitedStarter, riseLabel } from './feeding.js';

// Bulk fermentation temperature chart
const BULK_FERMENTATION_TEMPS = [
    { temp: 27, hours: 5.5, rise: 30 },
    { temp: 26, hours: 5.5, rise: 30 },
    { temp: 25.5, hours: 6, rise: 40 },
    { temp: 25, hours: 6, rise: 40 },
    { temp: 24.5, hours: 7, rise: 50 },
    { temp: 24, hours: 7, rise: 50 },
    { temp: 23, hours: 8, rise: 55 },
    { temp: 22.5, hours: 9, rise: 60 },
    { temp: 22, hours: 10, rise: 65 },
    { temp: 21.5, hours: 11, rise: 70 },
    { temp: 21, hours: 12, rise: 75 },
    { temp: 20.5, hours: 13, rise: 80 },
    { temp: 20, hours: 14, rise: 85 },
    { temp: 19.5, hours: 15, rise: 90 },
    { temp: 19, hours: 16, rise: 95 },
    { temp: 18, hours: 16, rise: 100 }
];

// Sourdough Baking Steps
const STEPS = [
    {
        id: 1,
        name: "Feed the Starter",
        duration: "Varies by ratio",
        timerMinutes: null,
        hasCalculator: true,
        instructions: [
            "Use the calculator below to determine feeding amounts",
            "Feed starter in the evening",
            "Let ferment until active, bubbly, and at peak"
        ],
        notes: "Feed in the evening to avoid late bulk fermentation. Total baking time: ~8-10 hours"
    },
    {
        id: 2,
        name: "Autolyse",
        duration: "1 hour",
        timerMinutes: 60,
        showAutolyseTime: true,
        getIngredients: (r) => [
            `${r.flour}g flour`,
            `${r.water}g water`
        ],
        instructions: [
            "Mix flour and water until no dry flour remains",
            "Cover and rest for 1 hour"
        ]
    },
    {
        id: 3,
        name: "Fermentolyse",
        duration: "1 hour",
        timerMinutes: 60,
        trackBulkStart: true,
        getIngredients: (r) => [
            `${r.starter}g active starter`
        ],
        instructions: [
            "Add the active starter to the dough",
            "Mix until fully incorporated",
            "Rest for 1 hour"
        ],
        notes: "This marks the start of bulk fermentation"
    },
    {
        id: 4,
        name: "Add Salt & Enrichments",
        duration: "30 minutes rest",
        timerMinutes: 30,
        getIngredients: (r) => [
            `${r.salt}g salt`,
            `${r.honey}g honey`,
            `${r.oil}g extra virgin olive oil`
        ],
        instructions: [
            "Add salt, honey, and olive oil",
            "Work into the dough until evenly distributed",
            "Rest dough for 30 minutes"
        ]
    },
    {
        id: 5,
        name: "Bulk Fermentation - Folds",
        duration: "2 hours (4 folds)",
        timerMinutes: 30,
        isFoldScreen: true,
        instructions: [
            "Perform 4 stretch and folds, 30 minutes apart",
            "Use the timer and checklist below to track your progress",
            "If adding bulky inclusions (cheese, fruit, chocolate), add before fold 4"
        ],
        notes: "Total bulk fermentation: 6-16 hours from adding starter (temperature dependent). This includes fermentolyse, salt rest, and folds."
    },
    {
        id: 6,
        name: "Continue Bulk Fermentation",
        duration: "Until target rise",
        timerMinutes: null,
        hasTempCalculator: true,
        trackBulkEnd: true,
        showPredictedEnd: true,
        instructions: [
            "Let dough continue fermenting until it reaches target rise",
            "Use the temperature calculator below for guidance",
            "Monitor dough temperature with thermometer",
            "The remaining time shown accounts for the 3 hours already spent (fermentolyse + salt + folds)"
        ],
        notes: "Temperature dependent - use proving drawer if needed"
    },
    {
        id: 7,
        name: "Pre-Shape",
        duration: "30 minutes bench rest",
        timerMinutes: 30,
        instructions: [
            "Pre-shape the dough to build gluten structure",
            "Let bench rest for 30 minutes"
        ]
    },
    {
        id: 8,
        name: "Final Shape",
        duration: "Shape",
        timerMinutes: null,
        instructions: [
            "Perform final shaping",
            "Place in banneton or proofing basket",
            "Prepare for cold retardation"
        ]
    },
    {
        id: 9,
        name: "Cold Retardation",
        duration: "8-72 hours",
        timerMinutes: null,
        trackRetardation: true,
        hasRetardationPlanner: true,
        instructions: [
            "Place shaped dough in fridge",
            "Minimum 8 hours overnight",
            "Can extend up to 72 hours for deeper flavour",
            "For 2 loaves: bake one at 8 hours, second at 72 hours"
        ],
        notes: "Longer retards develop flavour but risk gluten breakdown"
    },
    {
        id: 10,
        name: "Baking",
        duration: "50 minutes total",
        timerMinutes: null,
        instructions: [
            "Preheat oven and Dutch oven to 240°C",
            "Place dough directly from fridge into hot Dutch oven",
            "Add ice to Dutch oven for steam",
            "Bake at 240°C for 25 minutes (lid on)",
            "Reduce to 230°C and bake 25 more minutes (lid off)"
        ],
        notes: "Bake directly from fridge - no need to bring to room temperature"
    }
];

// App State
let currentBake = {
    loaves: 1,
    currentStep: 0,
    startTime: null,
    stepNotes: {},
    temperatures: {},
    bulkFermentStart: null,
    bulkFermentEnd: null,
    retardationStart: null,
    retardationEnd: null,
    starterFeedTime: null,
    starterFeedRatio: null,
    doughTemp: null,
    foldsCompleted: [false, false, false, false]
};

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeStartScreen();
    loadBakeLog();
});

function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}

export function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    if (tabName === 'log') {
        loadBakeLog();
    }
}

function initializeStartScreen() {
    document.getElementById('start-bake-btn').addEventListener('click', startBake);
}

function startBake() {
    const loaves = parseInt(document.querySelector('input[name="loaves"]:checked').value);
    const size = document.querySelector('input[name="size"]:checked').value;
    const hydration = parseInt(document.getElementById('hydration').value);
    currentBake = {
        loaves: loaves,
        size: size,
        hydration: hydration,
        currentStep: 0,
        startTime: new Date().toISOString(),
        stepNotes: {},
        temperatures: {},
        bulkFermentStart: null,
        bulkFermentEnd: null,
        retardationStart: null,
        retardationEnd: null,
        starterFeedTime: null,
        starterFeedRatio: null,
        doughTemp: null,
        foldsCompleted: [false, false, false, false]
    };
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('baking-screen').style.display = 'block';
    
    initializeBakingScreen();
    renderStep();
}

function initializeBakingScreen() {
    document.getElementById('prev-step-btn').addEventListener('click', previousStep);
    document.getElementById('next-step-btn').addEventListener('click', nextStep);
    document.getElementById('finish-bake-btn').addEventListener('click', finishBake);
    document.getElementById('timer-start').addEventListener('click', startTimer);
    document.getElementById('timer-pause').addEventListener('click', pauseTimer);
    document.getElementById('timer-reset').addEventListener('click', resetTimer);
}

function renderStep() {
    const step = STEPS[currentBake.currentStep];
    const stepCard = document.getElementById('current-step');
    
    // Update progress bar
    const progress = ((currentBake.currentStep + 1) / STEPS.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    
    // Build step content
    let html = `
        <h3>
            <span class="step-number">${step.id}</span>
            ${step.name}
        </h3>
        <p><strong>Duration:</strong> ${step.duration}</p>
    `;
    
    // Add starter calculator if applicable
    if (step.hasCalculator) html += feedCalculatorHtml();
    
    // Show suggested autolyse time
    if (step.showAutolyseTime && currentBake.starterFeedTime && currentBake.starterFeedRatio) {
        const feedRatio = findRatio(currentBake.starterFeedRatio);
        const riseTimeRange = feedRatio ? riseLabel(feedRatio) : '6-8 hrs';
        const autolyseTime = clockAfter(currentBake.starterFeedTime, (feedRatio ? feedRatio.minHours : 6) - 1).time;
        
        html += `
            <div class="time-tracker-section" style="background: var(--good-bg); border-left-color: var(--good);">
                <h4>⏰ Suggested Timing</h4>
                <p><strong>You fed your starter at:</strong> ${currentBake.starterFeedTime}</p>
                <p><strong>Suggested autolyse start:</strong> ${autolyseTime}</p>
                <p style="font-size: 14px; color: var(--good-ink); margin-top: 8px;">This is based on your feeding ratio (${currentBake.starterFeedRatio}) rise time of ${riseTimeRange}, minus 1 hour.</p>
            </div>
        `;
    }
    
    // Add temperature calculator if applicable
    if (step.hasTempCalculator) {
        html += `
            <div class="calculator-section">
                <h4>Bulk Fermentation Time Calculator</h4>
                <p>Enter your dough temperature to estimate fermentation time and target rise.</p>
                
                <div class="form-group">
                    <label>Dough temperature (°C):</label>
                    <input type="number" id="dough-temp" value="22" min="18" max="27" step="0.5">
                </div>
                
                <button id="calculate-bulk" class="btn btn-small">Calculate Time</button>
                
                <div id="bulk-result" style="display: none; margin-top: 16px; padding: 16px; background: var(--card); border-radius: 8px;">
                    <p id="bulk-time" style="font-size: 18px; color: var(--accent); font-weight: 600; margin-bottom: 8px;"></p>
                    <p id="bulk-rise" style="font-size: 16px; margin-bottom: 12px;"></p>
                    <p style="font-size: 14px; color: var(--muted);"><em>Note: This is the total bulk fermentation time from when you added the starter (including fermentolyse, salt addition, and folds).</em></p>
                </div>
            </div>
        `;
    }
    
    // Add bulk fermentation start time tracker
    if (step.trackBulkStart) {
        const currentTime = new Date().toTimeString().slice(0, 5);
        html += `
            <div class="time-tracker-section">
                <h4>⏱️ Track Bulk Fermentation Start</h4>
                <p style="margin-bottom: 12px;">Record the time when you add the starter - this marks the beginning of bulk fermentation.</p>
                <div class="form-group">
                    <label>Start time:</label>
                    <input type="time" id="bulk-start-time" value="${currentBake.bulkFermentStart || currentTime}">
                </div>
                <button id="save-bulk-start" class="btn btn-small">Save Start Time</button>
                <div id="bulk-start-prediction" style="display: none; margin-top: 12px; padding: 12px; background: var(--card); border-radius: 6px;"></div>
            </div>
        `;
    }
    
    // Add bulk fermentation end time tracker
    if (step.trackBulkEnd) {
        const currentTime = new Date().toTimeString().slice(0, 5);
        html += `
            <div class="time-tracker-section">
                <h4>⏱️ Track Bulk Fermentation End</h4>
                ${currentBake.bulkFermentStart ? `<p><strong>Started at:</strong> ${currentBake.bulkFermentStart}</p>` : '<p style="color: var(--danger);">⚠️ Start time not recorded</p>'}
                <div class="form-group">
                    <label>End time:</label>
                    <input type="time" id="bulk-end-time" value="${currentBake.bulkFermentEnd || currentTime}">
                </div>
                <button id="save-bulk-end" class="btn btn-small">Save End Time</button>
                <div id="bulk-duration" style="display: none; margin-top: 12px; padding: 12px; background: var(--card); border-radius: 6px; font-weight: 600; color: var(--accent);"></div>
            </div>
        `;
    }
    
    // Show predicted bulk fermentation end time
    if (step.showPredictedEnd && currentBake.bulkFermentStart && currentBake.doughTemp) {
        // Find bulk time for this temperature
        let bulkData = BULK_FERMENTATION_TEMPS.find(d => d.temp === parseFloat(currentBake.doughTemp));
        if (!bulkData) {
            // Find closest
            let minDiff = 999;
            BULK_FERMENTATION_TEMPS.forEach(d => {
                const diff = Math.abs(d.temp - parseFloat(currentBake.doughTemp));
                if (diff < minDiff) {
                    minDiff = diff;
                    bulkData = d;
                }
            });
        }
        
        if (bulkData) {
            const [startHours, startMinutes] = currentBake.bulkFermentStart.split(':').map(Number);
            const predictedDate = new Date();
            predictedDate.setHours(startHours);
            predictedDate.setMinutes(startMinutes);
            predictedDate.setHours(predictedDate.getHours() + Math.floor(bulkData.hours));
            predictedDate.setMinutes(predictedDate.getMinutes() + Math.round((bulkData.hours % 1) * 60));
            const predictedTime = predictedDate.toTimeString().slice(0, 5);
            
            html += `
                <div class="time-tracker-section" style="background: var(--info-bg); border-left-color: var(--info);">
                    <h4>🔮 Predicted End Time</h4>
                    <p><strong>Based on ${currentBake.doughTemp}°C:</strong> ~${predictedTime}</p>
                    <p style="font-size: 14px; color: var(--info-ink); margin-top: 8px;">Estimated ${bulkData.hours} hours from start (${bulkData.rise}% rise target)</p>
                </div>
            `;
        }
    }
    
    // Add retardation time tracker
    if (step.trackRetardation) {
        const currentTime = new Date().toTimeString().slice(0, 5);
        const currentDate = new Date().toISOString().slice(0, 10);
        html += `
            <div class="time-tracker-section">
                <h4>⏱️ Track Cold Retardation</h4>
                <div class="form-group">
                    <label>Start date & time:</label>
                    <input type="datetime-local" id="retard-start-time" value="${currentBake.retardationStart || currentDate + 'T' + currentTime}">
                </div>
                <div class="form-group">
                    <label>End date & time:</label>
                    <input type="datetime-local" id="retard-end-time" value="${currentBake.retardationEnd || ''}">
                </div>
                <button id="save-retard-times" class="btn btn-small">Calculate Duration</button>
                <div id="retard-duration" style="display: none; margin-top: 12px; padding: 12px; background: var(--card); border-radius: 6px; font-weight: 600; color: var(--accent);"></div>
            </div>
        `;
    }
    
    // Add retardation planner
    if (step.hasRetardationPlanner) {
        const currentDate = new Date();
        const currentDateStr = currentDate.toISOString().slice(0, 10);
        const currentTimeStr = currentDate.toTimeString().slice(0, 5);
        
        html += `
            <div class="calculator-section">
                <h4>Bake Time Planner</h4>
                <p>Plan when to bake based on your retardation time.</p>
                
                <div class="form-group">
                    <label>When are you putting dough in fridge?</label>
                    <input type="datetime-local" id="fridge-start" value="${currentDateStr}T${currentTimeStr}">
                </div>
                
                <div class="form-group">
                    <label>How long will you cold ferment?</label>
                    <select id="retard-hours">
                        <option value="8">8 hours (minimum)</option>
                        <option value="12">12 hours</option>
                        <option value="16">16 hours</option>
                        <option value="18">18 hours</option>
                        <option value="24" selected>24 hours</option>
                        <option value="36">36 hours</option>
                        <option value="48">48 hours</option>
                        <option value="72">72 hours (maximum flavour)</option>
                    </select>
                </div>
                
                <button id="calculate-bake-time" class="btn btn-small">Calculate Bake Time</button>
                
                <div id="bake-time-result" style="display: none; margin-top: 16px; padding: 16px; background: var(--card); border-radius: 8px;">
                    <p id="bake-time-display" style="font-size: 18px; color: var(--accent); font-weight: 600;"></p>
                </div>
            </div>
        `;
    }
    
    // Add fold tracker if applicable
    if (step.isFoldScreen) {
        const currentTime = new Date();
        const foldTimes = [];
        
        // Calculate suggested fold times based on bulk start
        // Folds start 90 minutes after fermentolyse (1hr fermentolyse + 30min salt rest)
        if (currentBake.bulkFermentStart) {
            const [startHours, startMinutes] = currentBake.bulkFermentStart.split(':').map(Number);
            for (let i = 0; i < 4; i++) {
                const foldDate = new Date();
                foldDate.setHours(startHours);
                foldDate.setMinutes(startMinutes + 90 + (30 * i)); // 90 min offset + 30 min intervals
                foldTimes.push(foldDate.toTimeString().slice(0, 5));
            }
        }
        
        html += `
            <div class="fold-tracker-section">
                <h4>Fold Checklist</h4>
                ${currentBake.bulkFermentStart ? 
                    `<p style="margin-bottom: 16px; color: var(--muted);">Started bulk fermentation at ${currentBake.bulkFermentStart}</p>` : 
                    `<p style="margin-bottom: 16px; color: var(--danger);">⚠️ Bulk fermentation start time not recorded</p>`
                }
                
                <div class="fold-list">
                    ${[1, 2, 3, 4].map((foldNum, index) => `
                        <div class="fold-item ${currentBake.foldsCompleted[index] ? 'completed' : ''}">
                            <label class="fold-checkbox">
                                <input type="checkbox" 
                                       id="fold-${foldNum}" 
                                       ${currentBake.foldsCompleted[index] ? 'checked' : ''}
                                       onchange="toggleFold(${index})">
                                <span class="fold-label">
                                    <strong>Fold ${foldNum}</strong>
                                    ${foldTimes[index] ? `<span class="fold-time">~${foldTimes[index]}</span>` : ''}
                                </span>
                            </label>
                            ${foldNum === 4 ? '<p style="font-size: 12px; color: var(--muted); margin: 4px 0 0 28px;">Add inclusions before this fold if using</p>' : ''}
                        </div>
                    `).join('')}
                </div>
                <p style="font-size: 13px; color: var(--muted); margin-top: 12px; font-style: italic;">
                    Folds start 1.5 hours after fermentolyse (1hr fermentolyse + 30min salt rest)
                </p>
                
                <div class="fold-timer-section">
                    <h4 style="margin-top: 20px;">30-Minute Timer</h4>
                    <p style="font-size: 14px; color: var(--muted); margin-bottom: 12px;">Use this timer between folds</p>
                </div>
            </div>
        `;
    }
    
    // Add ingredients if applicable
    if (step.getIngredients) {
        const ingredients = step.getIngredients(recipeFor(currentBake));
        html += `
            <div class="ingredients-list">
                <strong>Ingredients:</strong>
                <ul>
                    ${ingredients.map(ing => `<li>${ing}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Add instructions
    html += `
        <div class="instructions-list">
            <strong>Instructions:</strong>
            <ul>
                ${step.instructions.map(inst => `<li>${inst}</li>`).join('')}
            </ul>
        </div>
    `;
    
    // Add notes if applicable
    if (step.notes) {
        html += `
            <div class="note-section">
                <strong>Note:</strong> ${step.notes}
            </div>
        `;
    }
    
    stepCard.innerHTML = html;
    
    // Add calculator event listener if applicable
    if (step.hasCalculator) {
        initFeedCalculator();
    }
    
    // Add temperature calculator event listener if applicable
    if (step.hasTempCalculator) {
        document.getElementById('calculate-bulk').addEventListener('click', calculateBulkTime);
    }
    
    // Add time tracking event listeners
    if (step.trackBulkStart) {
        document.getElementById('save-bulk-start').addEventListener('click', saveBulkStart);
    }
    
    if (step.trackBulkEnd) {
        document.getElementById('save-bulk-end').addEventListener('click', saveBulkEnd);
    }
    
    if (step.trackRetardation) {
        document.getElementById('save-retard-times').addEventListener('click', saveRetardTimes);
    }
    
    if (step.hasRetardationPlanner) {
        document.getElementById('calculate-bake-time').addEventListener('click', calculateBakeTime);
    }
    
    // Handle timer
    const timerSection = document.getElementById('timer-section');
    if (step.timerMinutes) {
        timerSection.style.display = 'block';
        resetTimer();
        timerSeconds = step.timerMinutes * 60;
        updateTimerDisplay();
    } else {
        timerSection.style.display = 'none';
        stopTimer();
    }
    
    // Update navigation buttons
    document.getElementById('prev-step-btn').disabled = currentBake.currentStep === 0;
    
    if (currentBake.currentStep === STEPS.length - 1) {
        document.getElementById('next-step-btn').style.display = 'none';
        document.getElementById('finish-bake-btn').style.display = 'block';
    } else {
        document.getElementById('next-step-btn').style.display = 'block';
        document.getElementById('finish-bake-btn').style.display = 'none';
    }
}

function previousStep() {
    if (currentBake.currentStep > 0) {
        currentBake.currentStep--;
        renderStep();
    }
}

function nextStep() {
    if (currentBake.currentStep < STEPS.length - 1) {
        currentBake.currentStep++;
        renderStep();
    }
}

// Fold tracking
function toggleFold(index) {
    currentBake.foldsCompleted[index] = !currentBake.foldsCompleted[index];
    renderStep();
}

// Starter Calculator
// Two ways in: "limited" (I have X g, I need Y g: when will it be ready?) and
// "deadline" (I need Y g by a time: which ratio, and how much starter?). Maths is in feeding.js.
const FEED_MODES = {
    limited: {
        label: 'Limited starter',
        hint: 'Tell us how much starter you have and need. We feed at 1:6:6 and tell you when it should be ready.'
    },
    deadline: {
        label: 'Deadline',
        hint: 'Tell us when you need the starter. We suggest a feeding ratio and how much starter to use.'
    }
};

function feedCalculatorHtml() {
    const recipeStarter = recipeFor(currentBake).starter;
    const starterNeeded = recipeStarter + 30;
    const currentTime = new Date().toTimeString().slice(0, 5);
    const mode = currentBake.feedMode || 'limited';
    return `
        <div class="calculator-section">
            <h4>Starter Calculator</h4>
            <p><strong>Total starter needed:</strong> ${starterNeeded}g (${recipeStarter}g for dough + 30g carryover)</p>

            <div class="seg" id="feed-mode" role="group" aria-label="Calculator mode">
                ${Object.entries(FEED_MODES).map(([key, m]) =>
                    `<button type="button" data-feed-mode="${key}" aria-pressed="${key === mode}">${m.label}</button>`).join('')}
            </div>
            <p class="hint" id="feed-mode-hint" style="margin: 8px 0 12px;">${FEED_MODES[mode].hint}</p>

            <div class="form-group">
                <label for="current-starter">Starter I have now (g)<span id="have-optional"${mode === 'deadline' ? '' : ' hidden'}> (optional)</span>:</label>
                <input type="number" id="current-starter" value="30" min="1" max="2000">
            </div>

            <div class="form-group">
                <label for="needed-starter">Starter I need (g):</label>
                <input type="number" id="needed-starter" value="${starterNeeded}" min="1" max="2000">
            </div>

            <div class="form-group" id="need-by-row"${mode === 'deadline' ? '' : ' hidden'}>
                <label for="need-by-time">Starter needed by:</label>
                <input type="time" id="need-by-time" value="${currentBake.starterNeededBy || ''}">
            </div>

            <div class="form-group">
                <label for="feed-time">What time are you feeding?</label>
                <input type="time" id="feed-time" value="${currentBake.starterFeedTime || currentTime}">
            </div>

            <button id="calculate-feed" class="btn btn-small">Calculate Feed</button>

            <div id="feed-result" style="display: none; margin-top: 16px; padding: 16px; background: var(--card); border-radius: 8px;" role="status"></div>
            <p class="hint" style="margin-top: 12px; font-size: 13px;">Rise times are for a kitchen around 21–22°C. A warmer kitchen is faster, a cooler one slower.</p>
        </div>
    `;
}

function initFeedCalculator() {
    const modeButtons = document.querySelectorAll('[data-feed-mode]');
    const setMode = (mode) => {
        currentBake.feedMode = mode;
        modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.feedMode === mode)));
        document.getElementById('feed-mode-hint').textContent = FEED_MODES[mode].hint;
        document.getElementById('need-by-row').hidden = mode !== 'deadline';
        document.getElementById('have-optional').hidden = mode !== 'deadline';
        document.getElementById('feed-result').style.display = 'none';
    };
    modeButtons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.feedMode)));
    document.getElementById('calculate-feed').addEventListener('click', calculateFeed);
}

const dayText = (days) => days === 0 ? '' : days === 1 ? ' (next day)' : ` (+${days} days)`;
const clockText = (c) => `${c.time}${dayText(c.days)}`;
const hoursText = (h) => `${Math.floor(h)}h${h % 1 ? ` ${Math.round((h % 1) * 60)}m` : ''}`;

function feedWarning(text) {
    return `<p style="margin: 8px 0; padding: 8px 12px; border-radius: 6px; background: var(--warn-bg); color: var(--warn-ink);">⚠️ ${text}</p>`;
}

function calculateFeed() {
    const result = document.getElementById('feed-result');
    const show = (html) => { result.innerHTML = html; result.style.display = 'block'; };
    const mode = currentBake.feedMode || 'limited';
    const have = parseFloat(document.getElementById('current-starter').value);
    const need = parseFloat(document.getElementById('needed-starter').value);
    const feedTime = document.getElementById('feed-time').value;
    const neededBy = document.getElementById('need-by-time').value;

    if (!(need > 0)) return show(feedWarning('Enter how much starter you need.'));
    if (!feedTime) return show(feedWarning('Enter the time you are feeding.'));
    if (mode === 'limited' && !(have > 0)) return show(feedWarning('Enter how much starter you have now.'));
    if (mode === 'deadline' && !neededBy) return show(feedWarning('Enter the time you need the starter by.'));

    const plan = mode === 'limited'
        ? planLimitedStarter({ have, need, feedTime })
        : planDeadline({ need, feedTime, neededBy, have: have > 0 ? have : null });

    let html = '';
    if (mode === 'limited' && !plan.canReach) {
        html += feedWarning(`With ${have}g you can make about ${plan.reachable}g at most, even at ${plan.ratio.ratio}. To reach ${need}g in one feed you need at least ${plan.minStarter}g of starter, or you can build it up with two feeds.`);
        return show(html);
    }

    const { ratio, feed } = plan;
    if (mode === 'limited' && plan.alreadyEnough) {
        html += `<p class="hint">You already have ${have}g, which is enough. Feeding is only needed to get fresh, active starter.</p>`;
    }
    if (mode === 'limited' && plan.diluted) {
        html += feedWarning(`You don't have enough starter for 1:6:6, so this uses ${ratio.ratio}, which takes longer to rise.`);
    }
    if (mode === 'deadline') {
        html += `<p><strong>Time until you need it:</strong> ${hoursText(plan.hours)}</p>`;
        if (plan.tooShort) html += feedWarning(`That's quicker than a ${ratio.ratio} feed usually takes (${riseLabel(ratio)}). It may not be ready in time, so try feeding earlier or allow more time.`);
        if (plan.tooLong) html += feedWarning(`That's longer than the chart covers. Feeding at ${clockAfter(neededBy, -ratio.maxHours).time} would have it peak closer to when you need it.`);
        if (plan.notEnoughStarter) html += feedWarning(`This needs ${feed.starter}g of your starter but you only have ${have}g.`);
    }

    html += `
        <p><strong>Feed your starter:</strong></p>
        <ul class="feed-list">
            <li><strong>${feed.starter}g</strong> of your starter</li>
            <li><strong>+ ${feed.flour}g</strong> flour</li>
            <li><strong>+ ${feed.water}g</strong> water</li>
            <li style="border-top: 2px solid var(--accent); margin-top: 8px; padding-top: 8px;"><strong>= ${feed.total}g</strong> total starter</li>
        </ul>
        <p style="margin-top: 12px;"><strong>${mode === 'deadline' ? 'Suggested' : 'Feeding'} Ratio:</strong> ${ratio.ratio}</p>
        <p style="margin-top: 8px; color: var(--accent); font-weight: 600;"><strong>Likely ready:</strong> ${clockText(plan.window.from)} to ${clockText(plan.window.to)} (${riseLabel(ratio)} after feeding)</p>
    `;

    // Save for the autolyse suggestion on the next step
    currentBake.starterFeedTime = feedTime;
    currentBake.starterFeedRatio = ratio.ratio;
    if (mode === 'deadline') currentBake.starterNeededBy = neededBy;

    // Autolyse starts an hour before the starter's earliest peak; the loaf is ready for the
    // fridge about 8.5 hours later (1h autolyse + 1h fermentolyse + 6h bulk at 25°C + 0.5h shaping)
    const autolyseHours = ratio.minHours - 1;
    const autolyse = clockAfter(feedTime, autolyseHours);
    const ready = clockAfter(autolyse.time, 8.5);
    const readyDays = autolyse.days + ready.days;
    html += `
        <p style="margin-top: 8px; color: var(--good); font-weight: 600;"><strong>Start Autolyse At:</strong> ${clockText(autolyse)} (${autolyseHours} hours after feeding)</p>
        <p style="margin-top: 8px; color: var(--muted); font-size: 14px;"><strong>Estimated Ready for Fridge:</strong> ~${clockText({ time: ready.time, days: readyDays })} (assuming 25°C dough temp, 6hr bulk fermentation)</p>
    `;
    show(html);
}

// Bulk Fermentation Temperature Calculator
function calculateBulkTime() {
    const doughTemp = parseFloat(document.getElementById('dough-temp').value);
    
    if (doughTemp < 18 || doughTemp > 27) {
        alert('Temperature should be between 18°C and 27°C for optimal fermentation.');
        return;
    }
    
    // Save the temperature
    currentBake.doughTemp = doughTemp;
    
    // Find closest temperature match
    let closestTemp = BULK_FERMENTATION_TEMPS[0];
    let minDiff = Math.abs(BULK_FERMENTATION_TEMPS[0].temp - doughTemp);
    
    BULK_FERMENTATION_TEMPS.forEach(data => {
        const diff = Math.abs(data.temp - doughTemp);
        if (diff < minDiff) {
            minDiff = diff;
            closestTemp = data;
        }
    });
    
    // Display results
    // Total bulk time includes: 1hr fermentolyse + 30min salt rest + 1.5hrs folds = 3 hours already done
    const totalBulkHours = closestTemp.hours;
    const remainingHours = totalBulkHours - 3;
    
    const hoursText = closestTemp.hours === Math.floor(closestTemp.hours) 
        ? `${closestTemp.hours} hours` 
        : `${closestTemp.hours} hours`;
    
    const remainingText = remainingHours === Math.floor(remainingHours)
        ? `${remainingHours} hours`
        : `${remainingHours} hours`;
    
    document.getElementById('bulk-time').innerHTML = `
        <strong>Total Bulk Time:</strong> ${hoursText}<br>
        <strong>Remaining after folds:</strong> ${remainingText}
    `;
    
    document.getElementById('bulk-rise').innerHTML = `
        <strong>Target Rise:</strong> ${closestTemp.rise}% increase in volume
    `;
    
    document.getElementById('bulk-result').style.display = 'block';
}

// Time Tracking Functions
function saveBulkStart() {
    const startTime = document.getElementById('bulk-start-time').value;
    currentBake.bulkFermentStart = startTime;
    
    // Calculate predicted end time based on 25°C (6 hours)
    const defaultBulkHours = 6;
    const [hours, minutes] = startTime.split(':').map(Number);
    const predictedDate = new Date();
    predictedDate.setHours(hours + defaultBulkHours);
    predictedDate.setMinutes(minutes);
    const predictedTime = predictedDate.toTimeString().slice(0, 5);
    
    // Show prediction
    const predictionDiv = document.getElementById('bulk-start-prediction');
    if (predictionDiv) {
        predictionDiv.innerHTML = `
            <p style="color: var(--accent); font-weight: 600;">✓ Start time saved: ${startTime}</p>
            <p style="color: var(--muted); font-size: 14px; margin-top: 8px;">
                <strong>Predicted end time:</strong> ~${predictedTime} (assuming 25°C, 6 hours bulk)
            </p>
        `;
        predictionDiv.style.display = 'block';
    } else {
        alert(`Bulk fermentation start time saved: ${startTime}\nPredicted end: ~${predictedTime} (at 25°C)`);
    }
}

function saveBulkEnd() {
    const endTime = document.getElementById('bulk-end-time').value;
    currentBake.bulkFermentEnd = endTime;
    
    if (currentBake.bulkFermentStart) {
        const duration = calculateTimeDifference(currentBake.bulkFermentStart, endTime);
        document.getElementById('bulk-duration').innerHTML = `Total bulk fermentation: ${duration}`;
        document.getElementById('bulk-duration').style.display = 'block';
    } else {
        alert('End time saved, but start time was not recorded.');
    }
}

function saveRetardTimes() {
    const startTime = document.getElementById('retard-start-time').value;
    const endTime = document.getElementById('retard-end-time').value;
    
    if (!startTime || !endTime) {
        alert('Please enter both start and end times.');
        return;
    }
    
    currentBake.retardationStart = startTime;
    currentBake.retardationEnd = endTime;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    
    if (diffMs < 0) {
        alert('End time must be after start time.');
        return;
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    document.getElementById('retard-duration').innerHTML = `Cold retardation duration: ${hours}h ${minutes}m`;
    document.getElementById('retard-duration').style.display = 'block';
}

function calculateBakeTime() {
    const fridgeStart = document.getElementById('fridge-start').value;
    const retardHours = parseInt(document.getElementById('retard-hours').value);
    
    if (!fridgeStart) {
        alert('Please enter when you\'re putting the dough in the fridge.');
        return;
    }
    
    const startDate = new Date(fridgeStart);
    const bakeDate = new Date(startDate.getTime() + (retardHours * 60 * 60 * 1000));
    
    const dateStr = bakeDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const timeStr = bakeDate.toTimeString().slice(0, 5);
    
    document.getElementById('bake-time-display').innerHTML = `
        <strong>Bake at:</strong> ${dateStr} at ${timeStr}
    `;
    document.getElementById('bake-time-result').style.display = 'block';
    
    // Auto-fill the retardation tracker
    document.getElementById('retard-start-time').value = fridgeStart;
    document.getElementById('retard-end-time').value = bakeDate.toISOString().slice(0, 16);
}

function calculateTimeDifference(startTime, endTime) {
    // Parse times (HH:MM format)
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    // Handle overnight (negative result means crossed midnight)
    if (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours}h ${minutes}m`;
}

// Timer Functions
function startTimer() {
    if (!timerRunning) {
        timerRunning = true;
        document.getElementById('timer-start').style.display = 'none';
        document.getElementById('timer-pause').style.display = 'inline-block';
        
        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateTimerDisplay();
            } else {
                stopTimer();
                playNotification();
            }
        }, 1000);
    }
}

function pauseTimer() {
    stopTimer();
    document.getElementById('timer-start').style.display = 'inline-block';
    document.getElementById('timer-pause').style.display = 'none';
}

function stopTimer() {
    timerRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    stopTimer();
    const step = STEPS[currentBake.currentStep];
    if (step.timerMinutes) {
        timerSeconds = step.timerMinutes * 60;
        updateTimerDisplay();
    }
    document.getElementById('timer-start').style.display = 'inline-block';
    document.getElementById('timer-pause').style.display = 'none';
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timer-display').textContent = display;
}

function playNotification() {
    // Visual notification
    document.getElementById('timer-display').style.color = '#ffc107';
    setTimeout(() => {
        document.getElementById('timer-display').style.color = 'white';
    }, 1000);
    
    // Audio notification (if supported)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Sourdough Timer', {
            body: 'Time for the next step!',
            icon: '🍞'
        });
    }
}

function finishBake() {
    // Create a review modal
    const bulkDuration = currentBake.bulkFermentStart && currentBake.bulkFermentEnd 
        ? calculateTimeDifference(currentBake.bulkFermentStart, currentBake.bulkFermentEnd)
        : 'Not recorded';
    
    let retardDuration = 'Not recorded';
    if (currentBake.retardationStart && currentBake.retardationEnd) {
        const start = new Date(currentBake.retardationStart);
        const end = new Date(currentBake.retardationEnd);
        const diffMs = end - start;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        retardDuration = `${hours}h ${minutes}m`;
    }
    
    // Show review screen
    const reviewHtml = `
        <div style="background: var(--card); padding: 24px; border-radius: 12px; margin: 20px 0;">
            <h3 style="color: var(--accent); margin-bottom: 16px;">Review Your Bake</h3>
            
            <div style="margin-bottom: 16px;">
                <p><strong>Loaves:</strong> ${loafDescription(currentBake)}</p>
                <p><strong>Hydration:</strong> ${currentBake.hydration}%</p>
                <p><strong>Bulk Fermentation:</strong> ${bulkDuration}</p>
                <p><strong>Cold Retardation:</strong> ${retardDuration}</p>
            </div>
            
            <div class="form-group">
                <label>Dough temperature during bulk (°C):</label>
                <input type="number" id="final-dough-temp" value="${currentBake.doughTemp || ''}" step="0.5" min="18" max="27">
            </div>
            
            <div class="form-group">
                <label>How did the loaf turn out?</label>
                <select id="bake-outcome">
                    <option value="">Select outcome...</option>
                    <option value="Excellent">Excellent - Perfect rise, crust, and crumb</option>
                    <option value="Good">Good - Minor improvements needed</option>
                    <option value="Fair">Fair - Some issues to address</option>
                    <option value="Poor">Poor - Needs significant changes</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Additional notes:</label>
                <textarea id="bake-notes" rows="4" placeholder="Any observations about the bake? Changes you made? Results?"></textarea>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button id="save-bake-log" class="btn btn-primary" style="flex: 1;">Save to Log</button>
                <button id="cancel-log" class="btn" style="flex: 1;">Cancel</button>
            </div>
        </div>
    `;
    
    const stepCard = document.getElementById('current-step');
    stepCard.innerHTML = reviewHtml;
    
    document.getElementById('save-bake-log').addEventListener('click', saveFinalBakeLog);
    document.getElementById('cancel-log').addEventListener('click', () => {
        renderStep(); // Go back to current step
    });
    
    // Hide navigation buttons
    document.getElementById('finish-bake-btn').style.display = 'none';
}

function saveFinalBakeLog() {
    const finalTemp = document.getElementById('final-dough-temp').value;
    const outcome = document.getElementById('bake-outcome').value;
    const notes = document.getElementById('bake-notes').value;
    
    if (!outcome) {
        alert('Please select how the bake turned out.');
        return;
    }
    
    // Calculate durations
    let bulkDuration = null;
    if (currentBake.bulkFermentStart && currentBake.bulkFermentEnd) {
        bulkDuration = calculateTimeDifference(currentBake.bulkFermentStart, currentBake.bulkFermentEnd);
    }
    
    let retardDuration = null;
    if (currentBake.retardationStart && currentBake.retardationEnd) {
        const start = new Date(currentBake.retardationStart);
        const end = new Date(currentBake.retardationEnd);
        const diffMs = end - start;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        retardDuration = `${hours}h ${minutes}m`;
    }
    
    const bakeRecord = {
        date: new Date().toISOString(),
        loaves: currentBake.loaves,
        size: currentBake.size,
        hydration: currentBake.hydration,
        outcome: outcome,
        notes: notes || '',
        temperature: finalTemp || currentBake.doughTemp || '',
        startTime: currentBake.startTime,
        bulkFermentStart: currentBake.bulkFermentStart,
        bulkFermentEnd: currentBake.bulkFermentEnd,
        bulkDuration: bulkDuration,
        retardationStart: currentBake.retardationStart,
        retardationEnd: currentBake.retardationEnd,
        retardDuration: retardDuration
    };
    
    saveBakeLog(bakeRecord);
    
    // Reset to start screen
    document.getElementById('baking-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
    
    alert('Bake logged successfully! 🍞');
}

// Local Storage Functions
function saveBakeLog(bakeRecord) {
    let logs = JSON.parse(localStorage.getItem('sourdoughLogs') || '[]');
    logs.unshift(bakeRecord);
    localStorage.setItem('sourdoughLogs', JSON.stringify(logs));
}

export function loadBakeLog() {
    const logs = JSON.parse(localStorage.getItem('sourdoughLogs') || '[]');
    const logList = document.getElementById('bake-log-list');
    
    if (logs.length === 0) {
        logList.innerHTML = `
            <div class="empty-state">
                <p>🍞</p>
                <p>No bakes logged yet. Start your first bake!</p>
            </div>
        `;
        return;
    }
    
    logList.innerHTML = logs.map((log, index) => {
        const date = new Date(log.date);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        // Color code outcome
        let outcomeColor = 'var(--muted)';
        if (log.outcome === 'Excellent') outcomeColor = 'var(--good)';
        else if (log.outcome === 'Good') outcomeColor = 'var(--info)';
        else if (log.outcome === 'Fair') outcomeColor = '#ffc107';
        else if (log.outcome === 'Poor') outcomeColor = 'var(--danger)';
        
        return `
            <div class="bake-log-item">
                <h3>Bake #${logs.length - index}</h3>
                <div class="log-meta">${dateStr}</div>
                <div class="log-details">
                    <p><strong>Loaves:</strong> ${loafDescription(log)}</p>
                    ${log.hydration ? `<p><strong>Hydration:</strong> ${log.hydration}%</p>` : ''}
                    ${log.outcome ? `<p><strong>Outcome:</strong> <span style="color: ${outcomeColor}; font-weight: 600;">${log.outcome}</span></p>` : ''}
                    ${log.temperature ? `<p><strong>Dough Temperature:</strong> ${log.temperature}°C</p>` : ''}
                    ${log.bulkDuration ? `<p><strong>Bulk Fermentation:</strong> ${log.bulkDuration}</p>` : ''}
                    ${log.retardDuration ? `<p><strong>Cold Retardation:</strong> ${log.retardDuration}</p>` : ''}
                    ${log.notes ? `<p><strong>Notes:</strong> ${log.notes}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Notification permission is requested from the Settings tab (see shell.js)

// Used by inline handlers in the rendered step markup
window.toggleFold = toggleFold;
