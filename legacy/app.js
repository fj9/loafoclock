import { bakePlan, recipeFor, loafDescription } from '../src/domain/recipe';
import { bulkHoursBeforeRemaining, clampRest, firstFoldMinutes, REST_DEFAULT, REST_MAX, REST_MIN, restEnd, restText, tidyRest } from '../src/domain/timing';
import { STEP_TIPS, tipHtml } from '../src/domain/tips';
import { BULK_FERMENTATION_TEMPS, PLAN_DEFAULTS, buildSchedule, feedAnchorMs } from './schedule.js';
import { countdownText, progressLabel, timelineHtml } from './timeline.js';
import { clearActiveBake, loadActiveBake, pausedTimer, saveActiveBake, savedAgo, startedTimer, timerNow } from '../src/domain/persist';
import { loadSettings, rememberChoices } from '../src/domain/settings';
import { FEEDING_RATIOS, clockAfter, defaultFeedOption, feedTimeOptions, findRatio, isAwkwardHour, planAlreadyFed, planFeedForAutolyse, planLimitedStarter, riseLabel } from '../src/domain/feeding';
import { feedBarHtml } from './feedbar.js';
import { fmtShort, fmtTime } from '../src/domain/clock';
import { AUTOLYSE_CHIPS, DAYS_AHEAD, DAYS_BACK, FEED_CHIPS, JUST_NOW_CHIPS, bindDateTimePicker, bindTimePicker, dateTimePickerHtml, localDateTime, nearestMinutes, nearestQuarter, setDateTimePicker, setTimePicker, timePickerHtml } from './timepicker.js';

// Sourdough Baking Steps
const STEPS = [
    {
        id: 1,
        name: "Feed the Starter",
        duration: "Varies by ratio",
        timerMinutes: null,
        hasCalculator: true,
        instructions: [
            "Use the calculator above to determine feeding amounts",
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
        restKey: 'autolyseMinutes',
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
        restKey: 'fermentolyseMinutes',
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
            "Use the checklist above and the timer below to track your progress",
            "If adding bulky inclusions (cheese, fruit, chocolate), add during fold 4"
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
            "Use the temperature calculator above for guidance",
            "Monitor dough temperature with thermometer",
            "The remaining time shown accounts for the time already spent (fermentolyse + salt + folds)"
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
        duration: "40-50 minutes total",
        timerMinutes: null,
        getBakePlan: true, // times depend on the loaf size, see bakePlan()
        instructions: [],
        notes: "Bake directly from fridge - no need to bring to room temperature"
    }
];

// A typical home kitchen: dough comes out of mixing at about 24°C. The quick choices are for
// anyone without a thermometer.
const DEFAULT_DOUGH_TEMP = 24;
const DOUGH_TEMP_PRESETS = [
    { label: 'Cool kitchen', temp: 21 },
    { label: 'Typical', temp: 24 },
    { label: 'Warm kitchen', temp: 26 }
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
    autolyseMinutes: REST_DEFAULT,
    fermentolyseMinutes: REST_DEFAULT,
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
    initializeBakingScreen(); // bound once; the buttons are reused by every bake
    loadBakeLog();
    applyBakeChoices(loadSettings().lastBake || {});
    renderResumeCard();
    initPersistence();
    initLogActions();
});

function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            // Tapping Bake while you are already on it takes you back to the beginning
            if (tabName === 'bake' && btn.classList.contains('active') && bakeInProgress()) {
                if (confirm('Go back to the start? This clears the bake you are working on.')) backToSetup();
                return;
            }
            switchTab(tabName);
        });
    });
}

export function switchTab(tabName) {
    // Update tab buttons (the About page has no tab of its own, so Help stays lit)
    const lit = tabName === 'about' ? 'help' : tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === lit);
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

// A new bake with every field in its starting state
function freshBake({ loaves, size, hydration, feedMode, feedHave }) {
    return {
        loaves,
        size,
        hydration,
        feedMode,
        feedHave,
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
        autolyseMinutes: REST_DEFAULT,
        fermentolyseMinutes: REST_DEFAULT,
        doughTemp: null,
        foldsCompleted: [false, false, false, false]
    };
}

function startBake() {
    const loaves = parseInt(document.querySelector('input[name="loaves"]:checked').value);
    const size = document.querySelector('input[name="size"]:checked').value;
    const hydration = parseInt(document.getElementById('hydration').value);
    const last = loadSettings().lastBake || {};
    // Feed mode and the starter in your jar carry over from last time
    currentBake = freshBake({ loaves, size, hydration, feedMode: last.feedMode, feedHave: last.feedHave });
    rememberChoices(currentBake);
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('baking-screen').style.display = 'block';
    
    renderStep();
    persistBake();
}

// Put the loaf choices on the start screen (from last time, or from a bake in the log)
function applyBakeChoices({ loaves, size, hydration }) {
    const radio = (name, value) => { const r = document.querySelector(`input[name="${name}"][value="${value}"]`); if (r) r.checked = true; };
    if (loaves) radio('loaves', loaves);
    radio('size', size || 'regular');
    const select = document.getElementById('hydration');
    if (hydration && [...select.options].some(o => Number(o.value) === Number(hydration))) select.value = String(hydration);
}

// ---- Keeping the bake across reloads ----
function persistBake() {
    if (bakeInProgress()) saveActiveBake(currentBake);
}

function renderResumeCard() {
    const card = document.getElementById('resume-card');
    if (!card) return;
    const saved = loadActiveBake(STEPS.length);
    if (!saved || bakeInProgress()) { card.innerHTML = ''; return; }
    const step = STEPS[saved.bake.currentStep];
    card.innerHTML = `
        <div class="resume-card">
            <h3>Resume your bake</h3>
            <p>${loafDescription(saved.bake)} · step ${step.id} of ${STEPS.length}, ${step.name}<br>
               <small>Saved ${savedAgo(saved.savedAt)}</small></p>
            <div class="btn-row">
                <button type="button" class="btn btn-primary btn-small" id="resume-btn">Resume</button>
                <button type="button" class="btn btn-outline btn-small" id="discard-btn">Start fresh</button>
            </div>
        </div>`;
    document.getElementById('resume-btn').addEventListener('click', () => {
        currentBake = { ...freshBake(saved.bake), ...saved.bake };
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('baking-screen').style.display = 'block';
        renderStep();
    });
    document.getElementById('discard-btn').addEventListener('click', () => {
        if (!confirm('Delete your saved bake and start fresh?')) return;
        clearActiveBake();
        renderResumeCard();
    });
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
            ${step.name}${tipHtml(STEP_TIPS[step.id])}
        </h3>
        <p><strong>Duration:</strong> <span id="step-duration">${step.restKey ? restText(restMinutes(step)) : step.getBakePlan ? bakePlan(currentBake).duration : step.duration}</span></p>
    `;

    if (step.restKey) html += restPickerHtml(step);
    
    // Add starter calculator if applicable
    if (step.hasCalculator) html += feedCalculatorHtml();
    
    // Show suggested autolyse time
    if (step.showAutolyseTime) html += autolyseSuggestionHtml();
    
    // Add temperature calculator if applicable
    if (step.hasTempCalculator) {
        html += `
            <div class="calculator-section">
                <h4>Bulk Fermentation Time Calculator${tipHtml('bulk')}</h4>
                <p>Enter your dough temperature to estimate fermentation time and target rise.</p>
                
                <div class="form-group">
                    <label for="dough-temp">Dough temperature (°C):${tipHtml('doughTemp')}</label>
                    <input type="number" id="dough-temp" value="${currentBake.doughTemp || DEFAULT_DOUGH_TEMP}" min="18" max="27" step="0.5">
                </div>
                <div class="seg" id="temp-presets" role="group" aria-label="Quick temperature choices">
                    ${DOUGH_TEMP_PRESETS.map(p => `<button type="button" data-temp="${p.temp}">${p.label}<br><small>${p.temp}°C</small></button>`).join('')}
                </div>
                
                <button id="calculate-bulk" class="btn btn-small">Calculate Time</button>
                
                <div id="bulk-result" style="display: none; margin-top: 16px; padding: 16px; background: var(--card); border-radius: 8px;">
                    <p id="bulk-time" style="font-size: calc(18px * var(--ts, 1)); color: var(--accent); font-weight: 600; margin-bottom: 8px;"></p>
                    <p id="bulk-rise" style="font-size: calc(16px * var(--ts, 1)); margin-bottom: 12px;"></p>
                    <p style="font-size: calc(14px * var(--ts, 1)); color: var(--muted);"><em>Note: This is the total bulk fermentation time from when you added the starter (including fermentolyse, salt addition, and folds).</em></p>
                </div>
            </div>
        `;
    }
    
    // Add bulk fermentation start time tracker
    if (step.trackBulkStart) {
        html += `
            <div class="time-tracker-section">
                <h4>⏱️ Track Bulk Fermentation Start</h4>
                <p style="margin-bottom: 12px;">Record the time when you add the starter - this marks the beginning of bulk fermentation.</p>
                ${timePickerHtml({ id: 'bulk-start-time', key: 'day', label: 'Start time:', value: currentBake.bulkFermentStart || nearestMinutes(new Date(), 5), chips: JUST_NOW_CHIPS })}
                <button id="save-bulk-start" class="btn btn-small">Save Start Time</button>
                <div id="bulk-start-prediction" style="display: none; margin-top: 12px; padding: 12px; background: var(--card); border-radius: 6px;"></div>
            </div>
        `;
    }
    
    // Add bulk fermentation end time tracker
    if (step.trackBulkEnd) {
        html += `
            <div class="time-tracker-section">
                <h4>⏱️ Track Bulk Fermentation End</h4>
                ${currentBake.bulkFermentStart ? `<p><strong>Started at:</strong> ${fmtTime(currentBake.bulkFermentStart)}</p>` : '<p style="color: var(--danger);">⚠️ Start time not recorded</p>'}
                ${timePickerHtml({ id: 'bulk-end-time', key: 'day', label: 'End time:', value: currentBake.bulkFermentEnd || nearestMinutes(new Date(), 5), chips: JUST_NOW_CHIPS })}
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
                    <p><strong>Based on ${currentBake.doughTemp}°C:</strong> ~${fmtTime(predictedTime)}</p>
                    <p style="font-size: calc(14px * var(--ts, 1)); color: var(--info-ink); margin-top: 8px;">Estimated ${bulkData.hours} hours from start (${bulkData.rise}% rise target)</p>
                </div>
            `;
        }
    }
    
    // Add retardation time tracker
    if (step.trackRetardation) {
        html += `
            <div class="time-tracker-section">
                <h4>⏱️ Track Cold Retardation</h4>
                ${dateTimePickerHtml({ id: 'retard-start-time', label: 'Start:', value: currentBake.retardationStart || '', chips: JUST_NOW_CHIPS, days: DAYS_BACK })}
                ${dateTimePickerHtml({ id: 'retard-end-time', label: 'End:', value: currentBake.retardationEnd || '', chips: [{ now: true }, { time: '06:00' }, { time: '07:00' }, { time: '08:00' }, { time: '18:00' }], days: DAYS_AHEAD })}
                <button id="save-retard-times" class="btn btn-small">Calculate Duration</button>
                <div id="retard-duration" style="display: none; margin-top: 12px; padding: 12px; background: var(--card); border-radius: 6px; font-weight: 600; color: var(--accent);"></div>
            </div>
        `;
    }
    
    // Add retardation planner
    if (step.hasRetardationPlanner) {
        html += `
            <div class="calculator-section">
                <h4>Bake Time Planner${tipHtml('fridgePlanner')}</h4>
                <p>Plan when to bake based on your retardation time.</p>
                
                ${dateTimePickerHtml({ id: 'fridge-start', label: 'When are you putting dough in fridge?', value: '', chips: [{ now: true }, { time: '16:00' }, { time: '18:00' }, { time: '20:00' }, { time: '22:00' }], days: DAYS_AHEAD })}
                
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
                    <p id="bake-time-display" style="font-size: calc(18px * var(--ts, 1)); color: var(--accent); font-weight: 600;"></p>
                </div>
            </div>
        `;
    }
    
    // Add fold tracker if applicable
    if (step.isFoldScreen) {
        const currentTime = new Date();
        const foldTimes = [];
        
        // Calculate suggested fold times based on bulk start
        // Folds start after the fermentolyse rest plus a 30 min salt rest (90 min with a full hour)
        if (currentBake.bulkFermentStart) {
            const [startHours, startMinutes] = currentBake.bulkFermentStart.split(':').map(Number);
            for (let i = 0; i < 4; i++) {
                const foldDate = new Date();
                foldDate.setHours(startHours);
                foldDate.setMinutes(startMinutes + firstFoldMinutes(restMinutes(STEPS[2])) + (30 * i)); // first fold, then 30 min intervals
                foldTimes.push(fmtTime(foldDate.toTimeString().slice(0, 5)));
            }
        }
        
        html += `
            <div class="fold-tracker-section">
                <h4>Fold Checklist</h4>
                ${currentBake.bulkFermentStart ? 
                    `<p style="margin-bottom: 16px; color: var(--muted);">Started bulk fermentation at ${fmtTime(currentBake.bulkFermentStart)}</p>` : 
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
                            ${foldNum === 4 ? '<p style="font-size: calc(12px * var(--ts, 1)); color: var(--muted); margin: 4px 0 0 28px;">Add inclusions during this fold if using</p>' : ''}
                        </div>
                    `).join('')}
                </div>
                <p style="font-size: calc(13px * var(--ts, 1)); color: var(--muted); margin-top: 12px; font-style: italic;">
                    Folds start ${firstFoldMinutes(restMinutes(STEPS[2]))} minutes after you add the starter (${restText(restMinutes(STEPS[2]))} fermentolyse + 30 min salt rest)
                </p>
                
                <div class="fold-timer-section">
                    <h4 style="margin-top: 20px;">30-Minute Timer</h4>
                    <p style="font-size: calc(14px * var(--ts, 1)); color: var(--muted); margin-bottom: 12px;">Use this timer between folds</p>
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
                ${(step.getBakePlan ? bakePlan(currentBake).instructions : step.instructions).map(inst => `<li>${step.restKey ? inst.replace('1 hour', restText(restMinutes(step))) : inst}</li>`).join('')}
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
        initTempPresets();
    }
    
    // Add time tracking event listeners
    // The time pickers hold their value in a hidden field; the Save buttons read it
    const noop = () => {};
    if (step.trackBulkStart) {
        bindTimePicker('bulk-start-time', 'day', noop);
        document.getElementById('save-bulk-start').addEventListener('click', saveBulkStart);
    }
    
    if (step.trackBulkEnd) {
        bindTimePicker('bulk-end-time', 'day', noop);
        document.getElementById('save-bulk-end').addEventListener('click', saveBulkEnd);
    }
    
    if (step.trackRetardation) {
        bindDateTimePicker('retard-start-time', noop);
        bindDateTimePicker('retard-end-time', noop);
        document.getElementById('save-retard-times').addEventListener('click', saveRetardTimes);
    }
    
    if (step.hasRetardationPlanner) {
        bindDateTimePicker('fridge-start', noop);
        document.getElementById('calculate-bake-time').addEventListener('click', calculateBakeTime);
    }
    
    if (step.restKey) initRestPicker(step);
    
    // Handle timer
    const timerSection = document.getElementById('timer-section');
    if (step.timerMinutes) {
        timerSection.style.display = 'block';
        restoreTimer(step);
    } else {
        timerSection.style.display = 'none';
        stopTimer();
    }
    
    refreshTimeline();
    
    // Update navigation buttons
    document.getElementById('prev-step-btn').textContent = currentBake.currentStep === 0 ? '← Change loaves' : '← Previous';
    
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
    } else {
        backToSetup();
    }
}

// From the first step, go back to choosing loaves, size and hydration. The choices are still
// selected, and starting again begins a fresh bake with the new amounts.
function backToSetup() {
    stopTimer();
    clearActiveBake();
    document.getElementById('baking-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
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

// ---- Timeline under the progress bar ----
let timelineOpen = false;

const bakeInProgress = () => document.getElementById('baking-screen').style.display === 'block';

// The plan follows what you tell the app. Until the feed is worked out there is nothing to plan from.
function currentPlan() {
    return {
        feedTime: currentBake.starterFeedTime,
        temp: currentBake.planTemp ?? PLAN_DEFAULTS.doughTemp,
        bakeAt: currentBake.planBakeAt || PLAN_DEFAULTS.bakeAt,
        extraFridgeDays: currentBake.planExtraFridgeDays || 0
    };
}

function currentSchedule() {
    const ratio = findRatio(currentBake.starterFeedRatio);
    if (!currentBake.starterFeedTime || !ratio) return null;
    const plan = currentPlan();
    return buildSchedule({
        feedTime: plan.feedTime,
        riseMinHours: ratio.minHours,
        autolyseMin: restMinutes(STEPS[1]),
        fermentolyseMin: restMinutes(STEPS[2]),
        doughTemp: plan.temp,
        bakeAt: plan.bakeAt,
        extraFridgeDays: plan.extraFridgeDays,
        bakeMinutes: bakePlan(currentBake).totalMinutes,
        plannedAutolyse: currentBake.plannedAutolyse || null,
        actuals: { starterIn: currentBake.bulkFermentStart, bulkEnd: currentBake.bulkFermentEnd }
    });
}

// The feed moment, fixed the first time it is needed so it doesn't drift as days pass
function currentFeedAnchor() {
    if (!currentBake.feedAnchor || currentBake.feedAnchorFor !== currentBake.starterFeedTime) {
        currentBake.feedAnchor = feedAnchorMs(currentBake.starterFeedTime);
        currentBake.feedAnchorFor = currentBake.starterFeedTime;
    }
    return currentBake.feedAnchor;
}

function tickCountdown() {
    const el = document.getElementById('tl-countdown');
    if (el) el.textContent = countdownText(Number(el.dataset.ms), Date.now());
}

// Save the bake every few seconds and whenever the page is hidden; keep the countdown fresh
function initPersistence() {
    setInterval(() => { tickCountdown(); persistBake(); }, 3000);
    document.addEventListener('visibilitychange', () => {
        persistBake();
        if (document.visibilityState === 'visible' && bakeInProgress()) { timerTick(); tickCountdown(); }
    });
    window.addEventListener('pagehide', persistBake);
}

export function refreshTimeline() {
    const container = document.getElementById('timeline');
    if (!container) return;
    const existing = document.getElementById('timeline-details');
    if (existing) timelineOpen = existing.open; // keep it open across updates
    const schedule = currentSchedule();
    const step = STEPS[currentBake.currentStep];
    container.innerHTML = timelineHtml({
        schedule, currentStepId: step.id, plan: currentPlan(), open: timelineOpen, defaultFeedTime: nowClock(),
        anchorMs: schedule ? currentFeedAnchor() : null, nowMs: Date.now()
    });
    document.getElementById('progress-label').textContent =
        progressLabel({ schedule, currentStepId: step.id, totalSteps: STEPS.length });
    if (!schedule) {
        if (document.getElementById('tl-fed-time')) bindTimePicker('tl-fed-time', 'feed', () => {}, { live: false });
        document.getElementById('tl-fed-go')?.addEventListener('click', () => {
            const time = document.getElementById('tl-fed-time').value;
            if (!time) return;
            currentBake.starterFeedTime = time;
            currentBake.starterFeedRatio = document.getElementById('tl-fed-ratio').value;
            const suggestion = document.getElementById('autolyse-suggestion');
            if (suggestion) suggestion.outerHTML = autolyseSuggestionHtml();
            refreshTimeline();
        });
        return;
    }

    document.getElementById('timeline-details').addEventListener('toggle', e => { timelineOpen = e.target.open; });
    const bind = (id, apply) => document.getElementById(id).addEventListener('change', e => { apply(e.target.value); refreshTimeline(); });
    // These pickers sit inside the timeline, which is redrawn when they change, so act on release
    bindTimePicker('tl-feed', 'feed', v => {
        currentBake.starterFeedTime = v;
        const suggestion = document.getElementById('autolyse-suggestion');
        if (suggestion) suggestion.outerHTML = autolyseSuggestionHtml();
        refreshTimeline();
    }, { live: false });
    bindTimePicker('tl-bake', 'autolyse', v => { currentBake.planBakeAt = v; refreshTimeline(); }, { live: false });
    bind('tl-temp', v => { currentBake.planTemp = parseFloat(v); });
    bind('tl-extra', v => { currentBake.planExtraFridgeDays = parseInt(v); });
}

// ---- Rest length for autolyse and fermentolyse (30-60 min) ----
const restMinutes = (step) => clampRest(currentBake[step.restKey] ?? REST_DEFAULT);
const timerMinutesFor = (step) => (step.restKey ? restMinutes(step) : step.timerMinutes);
const nowClock = () => new Date().toTimeString().slice(0, 5);

function restPickerHtml(step) {
    const label = step.restKey === 'autolyseMinutes' ? 'autolyse' : 'fermentolyse';
    return `
        <div class="time-tracker-section" style="background: var(--calc-bg); border-left-color: var(--accent);">
            <h4>⏲️ Rest length${tipHtml('restLength')}</h4>
            <p style="font-size: calc(14px * var(--ts, 1)); color: var(--muted); margin-bottom: 8px;">The ${label} rest can be shortened to ${REST_MIN}–${REST_MAX} minutes, for example to bring the next steps back to tidy times.</p>
            <div class="form-group">
                <label for="rest-minutes">Minutes (${REST_MIN}–${REST_MAX}):</label>
                <input type="number" id="rest-minutes" value="${restMinutes(step)}" min="${REST_MIN}" max="${REST_MAX}" step="1" inputmode="numeric">
            </div>
            <p class="hint" id="rest-preview" role="status"></p>
            <button type="button" id="rest-tidy" class="btn btn-small btn-outline"></button>
        </div>
    `;
}

function initRestPicker(step) {
    const input = document.getElementById('rest-minutes');
    const preview = document.getElementById('rest-preview');
    const tidyBtn = document.getElementById('rest-tidy');

    // `changed` is true when you edit the minutes; drawing the step must not reset a saved timer
    const refresh = (changed = false) => {
        const minutes = restMinutes(step);
        const end = restEnd(nowClock(), minutes);
        const tidy = tidyRest(nowClock());
        preview.textContent = `If you start now, the ${minutes} minute rest ends at ${clockText(end)}.`;
        tidyBtn.hidden = tidy.minutes === minutes;
        tidyBtn.textContent = `Use ${tidy.minutes} minutes (ends ${clockText(tidy.end)})`;
        document.getElementById('step-duration').textContent = restText(minutes);
        document.querySelectorAll('.instructions-list li').forEach(li => {
            li.textContent = li.textContent.replace(/(1 hour|\d+ minutes)(?= *$)/, restText(minutes));
        });
        const suggestion = document.getElementById('autolyse-suggestion');
        if (suggestion) suggestion.outerHTML = autolyseSuggestionHtml();
        refreshTimeline();
        if (changed && !timerInterval) { stopTimer(); resetTimer(); }
    };
    const set = (minutes) => {
        currentBake[step.restKey] = clampRest(minutes);
        input.value = currentBake[step.restKey];
        refresh(true);
    };
    input.addEventListener('input', () => {
        if (input.value === '') return;
        currentBake[step.restKey] = clampRest(input.value);
        refresh(true);
    });
    input.addEventListener('change', () => set(input.value));
    // The tidy suggestion depends on the time you press it, so work it out then
    tidyBtn.addEventListener('click', () => set(tidyRest(nowClock()).minutes));
    refresh();
}

// Starter's earliest peak is feed + rise. The starter goes in when the autolyse rest ends,
// so autolyse should start `rest` minutes before that peak.
function autolyseSuggestionHtml() {
    if (!currentBake.starterFeedTime || !currentBake.starterFeedRatio) return '<div id="autolyse-suggestion"></div>';
    const feedRatio = findRatio(currentBake.starterFeedRatio);
    const riseTimeRange = feedRatio ? riseLabel(feedRatio) : '6-8 hrs';
    const rest = restMinutes(STEPS[1]);
    if (currentBake.plannedAutolyse) {
        return `
        <div id="autolyse-suggestion" class="time-tracker-section" style="background: var(--good-bg); border-left-color: var(--good);">
            <h4>⏰ Suggested Timing</h4>
            <p><strong>You fed your starter at:</strong> ${fmtTime(currentBake.starterFeedTime)}</p>
            <p><strong>You planned to start autolyse at:</strong> ${fmtTime(currentBake.plannedAutolyse)}</p>
            <p style="font-size: calc(14px * var(--ts, 1)); color: var(--good-ink); margin-top: 8px;">Your starter (${currentBake.starterFeedRatio}) should be ready when the ${restText(rest)} autolyse ends.</p>
        </div>
    `;
    }
    const start = clockAfter(currentBake.starterFeedTime, ((feedRatio ? feedRatio.minHours : 6) * 60 - rest) / 60).time;
    return `
        <div id="autolyse-suggestion" class="time-tracker-section" style="background: var(--good-bg); border-left-color: var(--good);">
            <h4>⏰ Suggested Timing</h4>
            <p><strong>You fed your starter at:</strong> ${fmtTime(currentBake.starterFeedTime)}</p>
            <p><strong>Suggested autolyse start:</strong> ${fmtTime(start)}</p>
            <p style="font-size: calc(14px * var(--ts, 1)); color: var(--good-ink); margin-top: 8px;">This is based on your feeding ratio (${currentBake.starterFeedRatio}) rise time of ${riseTimeRange}, minus your ${restText(rest)} autolyse.</p>
        </div>
    `;
}

// ---- Starter calculator ----
// Simple: say when you are feeding; we say when to start autolyse (a standard 1:6:6 feed).
// Advanced: say when you want to autolyse and when you will feed; we pick the right feed.
// Already fed: say what you did; we say when it will be ready. Maths is in feeding.js.
const FEED_MODES = {
    limited: {
        label: 'Simple',
        hint: "Tell us when you're feeding and we'll say when to start your autolyse.",
        button: 'Work out my plan'
    },
    deadline: {
        label: 'Advanced',
        hint: "Choose when you want to start autolyse and when you'll feed. We'll work out the right feed."
    },
    fed: {
        label: 'Already fed',
        hint: "Tell us when you fed and which feed you used. We'll say when it should be ready.",
        button: 'Work out my plan'
    }
};

// Sensible starting values so nobody has to type to get an answer
const DEFAULT_STARTER_HAVE = 100;      // grams in a typical jar; plenty for even two large loaves
const DEFAULT_AUTOLYSE_TIME = '08:00'; // a morning start
const DEFAULT_PLAN_FEED_TIME = '22:00'; // used only if no suitable feed time can be listed

const FEED_TIME_LABELS = {
    limited: () => 'What time are you feeding?',
    deadline: () => `I'm feeding at:${tipHtml('feedAt')}`,
    fed: () => 'What time did you feed?'
};

const starterNeededTotal = () => recipeFor(currentBake).starter + 30;
const nowTime = () => nearestQuarter();

// Advanced: pick the autolyse time first; only the feed times that suit it are offered
function advancedFeedOptions(autolyseAt) {
    return feedTimeOptions({
        autolyseAt,
        autolyseMin: restMinutes(STEPS[1]),
        need: currentBake.feedNeed ?? starterNeededTotal(),
        have: currentBake.feedHave ?? DEFAULT_STARTER_HAVE
    });
}

// Keep the feed time you chose if it still suits; otherwise the latest standard 1:6:6 feed
const pickAdvancedFeed = (options, wanted) =>
    options.find(o => o.feedTime === wanted)?.feedTime ?? defaultFeedOption(options)?.feedTime ?? wanted ?? DEFAULT_PLAN_FEED_TIME;

function feedOptionChipsHtml(options, selected) {
    if (!options.length) {
        return '<p class="hint">No feed fits that autolyse time between 6 am and 10 pm. Try another autolyse time, or pick a feed time below.</p>';
    }
    return options.map(o =>
        `<button type="button" class="tp-chip" data-feed-option="${o.feedTime}" aria-pressed="${o.feedTime === selected}"${o.notEnoughStarter ? ` title="Needs ${o.feed.starter}g of your starter"` : ''}>${fmtShort(o.feedTime)} <small>${o.ratio.ratio}${o.notEnoughStarter ? ' ⚠' : ''}</small></button>`).join('');
}

function feedCalculatorHtml() {
    const recipeStarter = recipeFor(currentBake).starter;
    const mode = currentBake.feedMode || 'limited';
    const adv = mode === 'deadline';
    const fed = mode === 'fed';
    const autolyseDefault = currentBake.autolyseDraft || DEFAULT_AUTOLYSE_TIME;
    const feedOptions = adv ? advancedFeedOptions(autolyseDefault) : [];
    const feedDefault = adv ? pickAdvancedFeed(feedOptions, currentBake.feedDraft) : (currentBake.feedDraft || nowTime());
    const have = currentBake.feedHave ?? DEFAULT_STARTER_HAVE;
    const need = currentBake.feedNeed ?? starterNeededTotal();
    const showButton = !adv;
    return `
        <div class="calculator-section" id="feed-calc">
            <h4>Starter Calculator</h4>
            <p>Your loaf needs <strong>${starterNeededTotal()}g</strong> of starter: ${recipeStarter}g for the dough and 30g to keep back for next time.</p>

            ${fed ? '<button type="button" class="link-btn" id="fed-back">← Back</button>' : `
            <div class="seg" id="feed-mode" role="group" aria-label="Calculator mode">
                ${['limited', 'deadline'].map(key =>
                    `<button type="button" data-feed-mode="${key}" aria-pressed="${key === mode}">${FEED_MODES[key].label}</button>`).join('')}
            </div>`}
            <p class="hint" style="margin: 8px 0 12px;">${FEED_MODES[mode].hint}</p>

            ${adv ? timePickerHtml({ id: 'need-by-time', key: 'autolyse', label: `I want to start autolyse at:${tipHtml('autolyseAt')}`, value: autolyseDefault, chips: AUTOLYSE_CHIPS }) : ''}

            ${adv ? `
            <div class="form-group" id="feed-pick">
                <span class="tp-label">${FEED_TIME_LABELS.deadline()}</span>
                <div class="tp-chips" id="feed-options" role="group" aria-label="Suitable feed times">${feedOptionChipsHtml(feedOptions, feedDefault)}</div>
                <details class="amounts" id="other-feed">
                    <summary>Pick another time</summary>
                    ${timePickerHtml({ id: 'feed-time', key: 'feed', label: 'Feed time', value: feedDefault, chips: FEED_CHIPS })}
                </details>
            </div>` : timePickerHtml({ id: 'feed-time', key: 'feed', label: FEED_TIME_LABELS[mode](), value: feedDefault, chips: FEED_CHIPS })}

            ${fed ? `
            <div class="form-group">
                <label for="fed-ratio">Feed I used:${tipHtml('ratio')}</label>
                <select id="fed-ratio">${FEEDING_RATIOS.map(r => `<option value="${r.ratio}"${r.ratio === (currentBake.starterFeedRatio || '1:6:6') ? ' selected' : ''}>${r.ratio}</option>`).join('')}</select>
            </div>` : ''}

            ${adv ? `
            <details class="amounts" id="amounts-box">
                <summary id="amounts-summary">Starter amounts: ${have}g in your jar, ${need}g needed. Change</summary>
                <div class="form-group">
                    <label for="current-starter">Starter I have now (g):${tipHtml('haveStarter')}</label>
                    <input type="number" id="current-starter" value="${have}" min="1" max="2000">
                </div>
                <div class="form-group">
                    <label for="needed-starter">Starter I need (g):${tipHtml('needStarter')}</label>
                    <input type="number" id="needed-starter" value="${need}" min="1" max="2000">
                </div>
            </details>` : ''}

            ${showButton ? `<button id="calculate-feed" class="btn btn-small">${FEED_MODES[mode].button}</button>` : ''}

            <div id="feed-result" style="display: none; margin-top: 16px; padding: 16px; background: var(--card); border-radius: 8px;" role="status"></div>
            ${fed ? '' : '<p style="margin-top: 12px;"><button type="button" class="link-btn" id="fed-link">Already fed your starter? Tell us when</button></p>'}
            <p class="hint" style="margin-top: 12px; font-size: calc(13px * var(--ts, 1));">Times are for a kitchen around 21–22°C. A warmer kitchen is faster, a cooler one slower.</p>
        </div>
    `;
}

function switchFeedMode(mode) {
    if (mode === 'fed') currentBake.feedModeBeforeFed = currentBake.feedMode || 'limited';
    currentBake.feedMode = mode;
    if (!currentBake.feedTouched) currentBake.feedDraft = undefined; // untouched times follow the mode's default
    currentBake.feedShown = false;
    document.getElementById('feed-calc').outerHTML = feedCalculatorHtml();
    initFeedCalculator();
}

function initFeedCalculator() {
    const $ = (id) => document.getElementById(id);
    const mode = currentBake.feedMode || 'limited';
    // Show the result again after the step is re-opened, and keep it live once it has been shown
    const live = () => { if (mode === 'deadline' || currentBake.feedShown) calculateFeed(); };

    document.querySelectorAll('[data-feed-mode]').forEach(b => b.addEventListener('click', () => switchFeedMode(b.dataset.feedMode)));
    $('fed-link')?.addEventListener('click', () => switchFeedMode('fed'));
    $('fed-back')?.addEventListener('click', () => switchFeedMode(currentBake.feedModeBeforeFed || 'limited'));
    $('calculate-feed')?.addEventListener('click', calculateFeed);
    $('feed-result').addEventListener('click', e => {
        const go = e.target.closest('[data-feed-go]');
        if (go) switchFeedMode(go.dataset.feedGo);
    });

    // Advanced: the feed-time list follows the autolyse time. Elsewhere, a plain time picker.
    const syncFeedChips = () => document.querySelectorAll('#feed-options [data-feed-option]').forEach(c =>
        c.setAttribute('aria-pressed', String(c.dataset.feedOption === $('feed-time').value)));
    const refreshFeedOptions = () => {
        if (!$('feed-options')) return;
        const options = advancedFeedOptions($('need-by-time').value);
        const selected = pickAdvancedFeed(options, currentBake.feedDraft);
        currentBake.feedDraft = selected;
        setTimePicker('feed-time', 'feed', selected);
        $('feed-options').innerHTML = feedOptionChipsHtml(options, selected);
    };
    const feedChosen = (value) => {
        currentBake.feedTouched = true;
        currentBake.feedDraft = value;
        syncFeedChips();
        live();
    };
    bindTimePicker('feed-time', 'feed', feedChosen);
    $('feed-options')?.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-feed-option]');
        if (!chip) return;
        setTimePicker('feed-time', 'feed', chip.dataset.feedOption);
        feedChosen(chip.dataset.feedOption);
    });
    if ($('need-by-time')) {
        bindTimePicker('need-by-time', 'autolyse', (value) => {
            currentBake.autolyseDraft = value;
            refreshFeedOptions();
            live();
        });
    }
    $('fed-ratio')?.addEventListener('change', live);

    // Starter amounts live in a closed box in Advanced; keep its summary in step
    const have = $('current-starter');
    const need = $('needed-starter');
    const onAmounts = () => {
        currentBake.feedHave = parseFloat(have.value) || undefined;
        currentBake.feedNeed = parseFloat(need.value) || undefined;
        $('amounts-summary').textContent = `Starter amounts: ${have.value || '?'}g in your jar, ${need.value || '?'}g needed. Change`;
        refreshFeedOptions();
        live();
    };
    have?.addEventListener('input', onAmounts);
    need?.addEventListener('input', onAmounts);

    if (mode === 'deadline' || currentBake.feedShown) calculateFeed(); // advanced shows the plan straight away
}

const dayText = (days) => days === 0 ? '' : days === 1 ? ' (next day)' : ` (+${days} days)`;
const clockText = (c) => `${fmtTime(c.time)}${dayText(c.days)}`;
// "05:30 to 07:30 (next day)": say the day once when both ends fall on the same day
const rangeText = (from, to, dayFn = dayText) =>
    from.days === to.days
        ? `${fmtTime(from.time)} to ${fmtTime(to.time)}${dayFn(to.days)}`
        : `${fmtTime(from.time)}${dayFn(from.days)} to ${fmtTime(to.time)}${dayFn(to.days)}`;
const hoursText = (h) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return hh && mm ? `${hh}h ${mm}m` : hh ? `${hh}h` : `${mm}m`;
};

function feedWarning(text) {
    return `<p style="margin: 8px 0; padding: 8px 12px; border-radius: 6px; background: var(--warn-bg); color: var(--warn-ink);">⚠️ ${text}</p>`;
}

// "06:00 and 08:00 (next day)" for use inside a sentence
const betweenText = (from, to) => rangeText(from, to).replace(' to ', ' and ');

// A gentle nudge towards Advanced when the simple plan lands at an awkward hour
function awkwardCallout({ feedTime, autolyse }) {
    const reasons = [];
    if (isAwkwardHour(autolyse.time)) reasons.push(`start your autolyse at ${clockText(autolyse)}`);
    if (isAwkwardHour(feedTime)) reasons.push(`feed at ${fmtTime(feedTime)}`);
    if (!reasons.length) return '';
    return `<div class="fp-callout"><span aria-hidden="true">ⓘ</span><div>That means you would ${reasons.join(' and ')}, which is in the middle of the night.
        <button type="button" class="link-btn" data-feed-go="deadline">Try Advanced</button> to pick the times that suit you.</div></div>`;
}

// The answer, in plain words
function answerHtml({ feedTime, feed, window, autolyse }) {
    return `
        <p class="fp-answer">Feed your starter at <strong>${fmtTime(feedTime)}</strong>. Mix <strong>${feed.starter}g</strong> of your starter with <strong>${feed.flour}g</strong> flour and <strong>${feed.water}g</strong> water.</p>
        <p class="fp-sub">It will be ready between <strong>${betweenText(window.from, window.to)}</strong>. Start your autolyse at <strong>${clockText(autolyse)}</strong>.</p>
        <p class="fp-next">Next: set a reminder for ${fmtTime(feedTime)}, then come back at ${fmtTime(autolyse.time)} and tap Next.</p>
    `;
}

function feedDetailsHtml({ feedTime, ratio, autolyseHours, starterInHours, autolyse, extra = '' }) {
    return `
        <details class="fp-more">
            <summary>See how this works</summary>
            <p style="margin-bottom: 4px;">You're using a <strong>${ratio.ratio}</strong> feed${tipHtml('ratio')}. It takes ${riseLabel(ratio)} to be ready.</p>
            ${feedBarHtml({ feedTime, ratio, autolyseHours, starterInHours })}
            ${fridgeEstimateHtml(autolyse)}
            ${extra}
        </details>`;
}

function calculateFeed() {
    const result = document.getElementById('feed-result');
    const show = (html) => { result.innerHTML = html; result.style.display = 'block'; currentBake.feedShown = true; };
    const mode = currentBake.feedMode || 'limited';
    const feedTime = document.getElementById('feed-time').value;
    const rest = restMinutes(STEPS[1]);

    if (!feedTime) return show(feedWarning(mode === 'fed' ? 'Enter the time you fed your starter.' : 'Enter the time you are feeding.'));

    if (mode === 'fed') {
        const plan = planAlreadyFed({ feedTime, ratio: document.getElementById('fed-ratio').value });
        const autolyseHours = plan.ratio.minHours - rest / 60;
        const autolyse = clockAfter(feedTime, autolyseHours);
        currentBake.starterFeedTime = feedTime;
        currentBake.starterFeedRatio = plan.ratio.ratio;
        currentBake.plannedAutolyse = null;
        show(`
            <p class="fp-answer">You fed at <strong>${fmtTime(feedTime)}</strong>.</p>
            <p class="fp-sub">Your starter should be ready between <strong>${betweenText(plan.window.from, plan.window.to)}</strong>. Start your autolyse at <strong>${clockText(autolyse)}</strong>.</p>
            <p class="fp-next">Next: come back at ${fmtTime(autolyse.time)} and tap Next.</p>
            ${feedDetailsHtml({ feedTime, ratio: plan.ratio, autolyseHours, starterInHours: plan.ratio.minHours, autolyse })}
        `);
        refreshTimeline();
        return;
    }

    if (mode === 'deadline') {
        const have = parseFloat(document.getElementById('current-starter').value);
        const need = parseFloat(document.getElementById('needed-starter').value);
        const neededBy = document.getElementById('need-by-time').value;
        if (!(need > 0)) return show(feedWarning('Enter how much starter you need.'));
        if (!neededBy) return show(feedWarning('Enter the time you want to start your autolyse.'));
        show(renderFeedPlan({ need, have, feedTime, neededBy }));
        refreshTimeline();
        return;
    }

    // Simple: a standard feed using as little of your starter as it needs
    const plan = planLimitedStarter({ have: currentBake.feedHave ?? DEFAULT_STARTER_HAVE, need: starterNeededTotal(), feedTime });
    if (!plan.canReach) {
        return show(feedWarning(`That is more starter than a single feed can make. Try Advanced and set how much starter you have.`));
    }
    const { ratio, feed } = plan;
    const autolyseHours = ratio.minHours - rest / 60;
    const autolyse = clockAfter(feedTime, autolyseHours);
    currentBake.starterFeedTime = feedTime;
    currentBake.starterFeedRatio = ratio.ratio;
    currentBake.plannedAutolyse = null;
    show(`
        ${answerHtml({ feedTime, feed, window: plan.window, autolyse })}
        ${awkwardCallout({ feedTime, autolyse })}
        ${feedDetailsHtml({ feedTime, ratio, autolyseHours, starterInHours: ratio.minHours, autolyse })}
    `);
    refreshTimeline();
}

// The loaf is ready for the fridge about 8.5 hours after autolyse starts
// (1h autolyse + 1h fermentolyse + 6h bulk at 25°C + 0.5h shaping)
function fridgeEstimateHtml(autolyse) {
    const ready = clockAfter(autolyse.time, 8.5);
    return `<p style="margin-top: 8px; color: var(--muted); font-size: calc(14px * var(--ts, 1));"><strong>Dough ready for the fridge:</strong> about ${clockText({ time: ready.time, days: autolyse.days + ready.days })} (if your dough is 25°C and bulk takes 6 hours)</p>`;
}

function renderFeedPlan({ need, have, feedTime, neededBy }) {
    const restMin = restMinutes(STEPS[1]);
    const plan = planFeedForAutolyse({ need, feedTime, autolyseAt: neededBy, autolyseMin: restMin, have: have > 0 ? have : null });
    const { best, problem } = plan;
    const shown = best || problem.fallback;
    const autolyseHours = plan.gapHours - restMin / 60;
    const autolyse = clockAfter(feedTime, autolyseHours);
    let html = '';

    if (!best) {
        html += problem.kind === 'tooShort'
            ? feedWarning(`That's only ${hoursText(plan.gapHours)} between feeding and adding the starter. Even the quickest feed needs about ${shown.ratio.minHours} hours. Feed by ${fmtTime(problem.feedBy)}, or start your autolyse later.`)
            : feedWarning(`That's ${hoursText(plan.gapHours)} between feeding and adding the starter, longer than any feed lasts (up to ${shown.ratio.maxHours} hours). Feed from ${fmtTime(problem.feedFrom)}, or start your autolyse earlier.`);
    } else {
        const six = plan.sixOption;
        if (best.ratio.n !== six.ratio.n) {
            html += `<p class="hint" style="margin-bottom: 6px;">A ${six.ratio.ratio} feed would be ${hoursText(six.offHours)} too ${six.status === 'tooFast' ? 'early' : 'late'} for your autolyse, so this uses ${best.ratio.ratio}.</p>`;
        }
        if (best.notEnoughStarter) {
            html += feedWarning(`This needs ${best.feed.starter}g of your starter but you only have ${have}g. Try a different feed time, or change the starter amounts below.`);
        }
        html += answerHtml({ feedTime, feed: best.feed, window: best.window, autolyse });
    }

    let ladder = `<h4 style="margin-top: 12px;">Other feeds</h4>
        <p class="hint" style="margin-bottom: 6px;">How each feed fits your times. Slower feeds use less of your own starter.</p>
        <ul class="feed-list fp-ladder">`;
    for (const o of plan.options) {
        const note = o.fits
            ? (o.notEnoughStarter ? `needs ${o.feed.starter}g, more than you have` : `fits · use ${o.feed.starter}g starter`)
            : o.status === 'tooSlow' ? `ready ${hoursText(o.offHours)} too late` : `ready ${hoursText(o.offHours)} too early`;
        ladder += `<li class="${o === best ? 'fp-best' : o.fits ? '' : 'fp-no'}"><span>${o === best ? '✓ ' : ''}${o.ratio.ratio} <small>${riseLabel(o.ratio)}</small></span><span>${note}</span></li>`;
    }
    ladder += '</ul>';

    html += feedDetailsHtml({ feedTime, ratio: shown.ratio, autolyseHours, starterInHours: plan.gapHours, autolyse: { time: neededBy, days: autolyse.days }, extra: ladder });

    // Save for the autolyse step and the timeline
    if (best) {
        currentBake.starterFeedTime = feedTime;
        currentBake.starterFeedRatio = best.ratio.ratio;
        currentBake.starterNeededBy = neededBy;
        currentBake.plannedAutolyse = neededBy;
    }
    return html;
}

// Quick temperature choices: set the box and work out the time straight away
function initTempPresets() {
    const input = document.getElementById('dough-temp');
    const buttons = [...document.querySelectorAll('#temp-presets [data-temp]')];
    const highlight = () => buttons.forEach(b => b.setAttribute('aria-pressed', String(parseFloat(input.value) === Number(b.dataset.temp))));
    buttons.forEach(b => b.addEventListener('click', () => {
        input.value = b.dataset.temp;
        highlight();
        calculateBulkTime();
    }));
    input.addEventListener('input', highlight);
    highlight();
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
    currentBake.planTemp = doughTemp; // the timeline plans with your reading
    
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
    // Total bulk time includes the fermentolyse rest, 30min salt rest and 1.5hrs of folds (3 hours with a full hour)
    const totalBulkHours = closestTemp.hours;
    const remainingHours = Math.round((totalBulkHours - bulkHoursBeforeRemaining(restMinutes(STEPS[2]))) * 100) / 100;
    
    const hoursText = closestTemp.hours === Math.floor(closestTemp.hours) 
        ? `${closestTemp.hours} hours` 
        : `${closestTemp.hours} hours`;
    
    const remainingText = remainingHours === Math.floor(remainingHours)
        ? `${remainingHours} hours`
        : `${remainingHours} hours`;
    
    document.getElementById('bulk-time').innerHTML = `
        <strong>Total Bulk Time:</strong>${tipHtml('totalBulk')} ${hoursText}<br>
        <strong>Remaining after folds:</strong> ${remainingText}
    `;
    
    document.getElementById('bulk-rise').innerHTML = `
        <strong>Target Rise:</strong>${tipHtml('targetRise')} ${closestTemp.rise}% increase in volume
    `;
    
    document.getElementById('bulk-result').style.display = 'block';
}

// Time Tracking Functions
function saveBulkStart() {
    const startTime = document.getElementById('bulk-start-time').value;
    currentBake.bulkFermentStart = startTime;
    refreshTimeline();
    
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
            <p style="color: var(--accent); font-weight: 600;">✓ Start time saved: ${fmtTime(startTime)}</p>
            <p style="color: var(--muted); font-size: calc(14px * var(--ts, 1)); margin-top: 8px;">
                <strong>Predicted end time:</strong> ~${fmtTime(predictedTime)} (assuming 25°C, 6 hours bulk)
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
    refreshTimeline();
    
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
    const timeStr = fmtTime(bakeDate.toTimeString().slice(0, 5));
    
    document.getElementById('bake-time-display').innerHTML = `
        <strong>Bake at:</strong> ${dateStr} at ${timeStr}
    `;
    document.getElementById('bake-time-result').style.display = 'block';
    
    // Auto-fill the retardation tracker
    if (document.getElementById('retard-start-time')) {
        setDateTimePicker('retard-start-time', fridgeStart);
        setDateTimePicker('retard-end-time', localDateTime(bakeDate));
    }
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
// The timer counts down to an end time (kept with the bake), not by ticks, so it stays right
// when the screen is off, and a reloaded page picks up where it was.
const showTimerButtons = (running) => {
    document.getElementById('timer-start').style.display = running ? 'none' : 'inline-block';
    document.getElementById('timer-pause').style.display = running ? 'inline-block' : 'none';
};

function setTimerNote(text) {
    const note = document.getElementById('timer-note');
    if (!note) return;
    note.textContent = text || '';
    note.hidden = !text;
}

function timerTick() {
    const t = timerNow(currentBake.timer);
    if (!t) return;
    timerSeconds = t.seconds;
    updateTimerDisplay();
    if (t.finished) {
        currentBake.timer = { step: currentBake.currentStep, running: false, endsAt: null, remaining: 0 };
        stopTimer();
        showTimerButtons(false);
        playNotification();
    }
}

function startTimer() {
    if (timerRunning || timerSeconds <= 0) return;
    setTimerNote('');
    currentBake.timer = startedTimer(timerSeconds, currentBake.currentStep);
    timerRunning = true;
    showTimerButtons(true);
    timerInterval = setInterval(timerTick, 1000);
    persistBake();
}

function pauseTimer() {
    currentBake.timer = pausedTimer(currentBake.timer, currentBake.currentStep);
    stopTimer();
    showTimerButtons(false);
    persistBake();
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
    if (currentBake) currentBake.timer = null;
    const step = STEPS[currentBake.currentStep];
    if (step.timerMinutes) {
        timerSeconds = timerMinutesFor(step) * 60;
        updateTimerDisplay();
    }
    setTimerNote('');
    showTimerButtons(false);
}

// When a step opens: carry on a saved timer for this step, or start from the full time
function restoreTimer(step) {
    const saved = currentBake.timer?.step === currentBake.currentStep ? currentBake.timer : null;
    if (!saved) { resetTimer(); return; }
    const t = timerNow(saved);
    stopTimer();
    timerSeconds = t.seconds;
    updateTimerDisplay();
    if (t.running) {
        timerRunning = true;
        showTimerButtons(true);
        timerInterval = setInterval(timerTick, 1000);
    } else {
        showTimerButtons(false);
        if (t.finished) {
            currentBake.timer = { ...saved, running: false, endsAt: null, remaining: 0 };
            setTimerNote('Your timer finished while you were away.');
        }
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timer-display').textContent = display;
}

function playNotification() {
    // Visual notification
    document.getElementById('timer-display').style.color = 'var(--warn)';
    setTimeout(() => {
        document.getElementById('timer-display').style.color = '';
    }, 1000);
    
    // Audio notification (if supported)
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("Loaf O'Clock timer", {
            body: 'Time for the next step!',
            icon: 'icon-192.png'
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
    clearActiveBake();
    
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
        if (log.outcome === 'Excellent') outcomeColor = 'var(--good-ink)';
        else if (log.outcome === 'Good') outcomeColor = 'var(--info-ink)';
        else if (log.outcome === 'Fair') outcomeColor = 'var(--warn-ink)';
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
                <button type="button" class="btn btn-small btn-outline" data-repeat="${index}" style="margin-top: 10px;">Repeat this bake</button>
            </div>
        `;
    }).join('');
}

// "Repeat this bake" on a log entry: back to the start screen with the same loaves, size and hydration
function initLogActions() {
    document.getElementById('bake-log-list').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-repeat]');
        if (!btn) return;
        const log = JSON.parse(localStorage.getItem('sourdoughLogs') || '[]')[Number(btn.dataset.repeat)];
        if (!log) return;
        if (bakeInProgress() && !confirm('Leave the bake you are working on and start this one instead?')) return;
        if (bakeInProgress()) backToSetup();
        applyBakeChoices(log);
        switchTab('bake');
        window.scrollTo(0, 0);
    });
}

// Notification permission is requested from the Settings tab (see shell.js)

// Used by inline handlers in the rendered step markup
window.toggleFold = toggleFold;
