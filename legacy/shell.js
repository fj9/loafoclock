import { registerSW } from 'virtual:pwa-register';
import { setClock12 } from '../src/domain/clock';
import { loadBakeLog, refreshTimeline, switchTab } from './app.js';
import { applyDisplaySettings, loadSettings, saveSettings } from '../src/domain/settings';

// App shell: theme, first-run tutorial, help, settings and footer.
// Kept apart from app.js (the baking workflow) so each file does one job.

const THEME_KEY = 'sourdoughTheme';
const LOG_KEY = 'sourdoughLogs';
const PAGE_COLOURS = { light: '#9A4A22', dark: '#372B24' }; // the header colour in each theme

// Add a LinkedIn URL here and it appears in the footer.
const FOOTER_LINKS = [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/frankiej9/' },
    { label: 'GitHub', url: 'https://github.com/fj9' },
    { label: 'Tip me on Ko-fi', url: 'https://ko-fi.com/fjnine' }
];

const WELCOME_CARDS = [
    { title: "Welcome to Loaf O'Clock", body: "It's always Loaf O'Clock somewhere. This is a sourdough planner that shows how your choices move your bake, so you can fit it around your day. Pick one or two loaves and tap Start Baking." },
    { title: 'Your timeline', body: "Once you've worked out your feed, a timeline lists when each step happens and how long until the next one. That's how you see when you need to be in the house, and when you're free." },
    { title: 'Three levers', body: 'Feed ratio decides when your starter is ready. Dough temperature decides how long bulk fermentation takes. The fridge, from 8 to 72 hours, decides when you bake. Change one and watch the steps after it move.' },
    { title: 'Times are estimates', body: 'They assume a kitchen around 21 to 22°C and the dough temperature you give. Use the plan as a guide, and trust how your dough looks and feels.' }
];

const FAQ = [
    { q: 'Why does the feed ratio matter?', a: 'The ratio is how much flour and water you add to your starter. A small feed, like 1:1:1, is ready in 4 to 6 hours. A big one, like 1:10:10, takes 13 to 16 hours. So the ratio lets you choose when your starter is ready, and Advanced mode lists the feed times that suit your autolyse.' },
    { q: 'Why does dough temperature change bulk time?', a: "Warmer dough rises faster. In the app's table, a 24°C dough needs about 7 hours of bulk fermentation, a 21°C dough about 12, and an 18°C dough about 16. The target rise changes too, from 50% at 24°C to 75% at 21°C. Step 6 works it out, and the timeline uses it to place the end of bulk." },
    { q: 'Why use the fridge?', a: 'After shaping, the dough goes in the fridge for 8 to 72 hours. The cold slows the rise right down, so you can bake when it suits you. Step 9 says longer stays give deeper flavour, with a risk of the gluten breaking down. The Bake Time Planner there turns your fridge time into a bake time.' },
    { q: 'Where is my bake log stored?', a: 'In this browser on this device only. Use Back up in Settings to save a file you can restore somewhere else.' },
    { q: 'Why did my timer stop?', a: 'Phones can pause web pages in the background, so a timer may not ring while the screen is off. It still counts down to a saved end time, so it shows the right time when you come back. Turn on notifications in Settings to get an alert while the app is open.' },
    { q: 'Can I change the recipe?', a: 'Not yet. You can choose one or two loaves, regular or large, and the hydration, but the rest of the recipe is fixed.' }
];

// ---- Theme ----
function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
    const dark = mode === 'dark' || (mode !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? PAGE_COLOURS.dark : PAGE_COLOURS.light);
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* ignore */ }
    document.querySelectorAll('[data-theme-mode]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.themeMode === mode)));
}

function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (e) { return 'system'; }
}

// ---- First-run tutorial ----
function showTutorial() {
    let i = 0;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'welcome-title');
    const close = () => { overlay.remove(); saveSettings({ welcomeSeen: true }); };
    const render = () => {
        const c = WELCOME_CARDS[i];
        const last = i === WELCOME_CARDS.length - 1;
        overlay.innerHTML = `
            <div class="sheet">
                <div class="muted">${i + 1} of ${WELCOME_CARDS.length}</div>
                <h2 id="welcome-title">${c.title}</h2>
                <p>${c.body}</p>
                <div class="btn-row">
                    <button class="btn btn-outline" id="welcome-skip">Skip</button>
                    <button class="btn btn-primary" id="welcome-next">${last ? 'Start' : 'Next'}</button>
                </div>
            </div>`;
        overlay.querySelector('#welcome-skip').addEventListener('click', close);
        overlay.querySelector('#welcome-next').addEventListener('click', () => {
            if (last) close(); else { i++; render(); }
        });
        overlay.querySelector('#welcome-next').focus();
    };
    render();
    document.body.appendChild(overlay);
}

// ---- Help ----
function renderHelp() {
    document.getElementById('tutorial-list').innerHTML = WELCOME_CARDS
        .map(c => `<li><strong>${c.title}</strong> ${c.body}</li>`).join('');
    document.getElementById('faq').innerHTML = '<h2>Questions and answers</h2>' + FAQ
        .map(f => `<details class="faq"><summary>${f.q}</summary><p>${f.a}</p></details>`).join('');
    document.getElementById('replay-tutorial-btn').addEventListener('click', () => {
        switchTab('bake');
        showTutorial();
    });
}

// ---- Settings ----
function initDisplaySettings() {
    const mark = () => {
        const cfg = loadSettings();
        document.querySelectorAll('[data-hints-mode]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.hintsMode === 'on') === (cfg.hints !== false))));
        document.querySelectorAll('[data-text-size]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.textSize === (cfg.textSize || 'normal'))));
    };
    applyDisplaySettings(loadSettings());
    mark();
    document.querySelectorAll('[data-hints-mode]').forEach(b => b.addEventListener('click', () => {
        saveSettings({ hints: b.dataset.hintsMode === 'on' });
        applyDisplaySettings(loadSettings());
        mark();
    }));
    document.querySelectorAll('[data-text-size]').forEach(b => b.addEventListener('click', () => {
        saveSettings({ textSize: b.dataset.textSize });
        applyDisplaySettings(loadSettings());
        mark();
    }));
}

function initClockSetting() {
    const apply = (twelve) => {
        setClock12(twelve);
        document.querySelectorAll('[data-clock]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.clock === '12') === twelve)));
    };
    apply(loadSettings().clock12 !== false); // 12-hour unless you choose otherwise
    document.querySelectorAll('[data-clock]').forEach(b => b.addEventListener('click', () => {
        const twelve = b.dataset.clock === '12';
        saveSettings({ clock12: twelve });
        apply(twelve);
        refreshTimeline();
    }));
}

function initSettings() {
    initDisplaySettings();
    initClockSetting();
    document.querySelectorAll('[data-theme-mode]').forEach(b =>
        b.addEventListener('click', () => applyTheme(b.dataset.themeMode)));
    applyTheme(currentTheme());

    const status = document.getElementById('notify-status');
    const btn = document.getElementById('notify-btn');
    const refreshNotify = () => {
        if (!('Notification' in window)) {
            status.textContent = "This browser can't show notifications. Keep the app open to hear the timer.";
            btn.hidden = true;
        } else if (Notification.permission === 'granted') {
            status.textContent = "Notifications are on. You'll get an alert when a timer finishes.";
            btn.hidden = true;
        } else if (Notification.permission === 'denied') {
            status.textContent = 'Notifications are blocked. Allow them for this site in your browser settings.';
            btn.hidden = true;
        } else {
            status.textContent = 'Get an alert when a timer finishes.';
            btn.hidden = false;
        }
    };
    btn.addEventListener('click', () => Notification.requestPermission().then(refreshNotify));
    refreshNotify();

    const msg = document.getElementById('backup-msg');
    document.getElementById('backup-btn').addEventListener('click', () => {
        const data = localStorage.getItem(LOG_KEY) || '[]';
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: `loafoclock-log-${new Date().toISOString().slice(0, 10)}.json` });
        a.click();
        URL.revokeObjectURL(url);
        msg.textContent = 'Backup saved.';
    });
    const file = document.getElementById('restore-file');
    document.getElementById('restore-btn').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
        try {
            const logs = JSON.parse(await file.files[0].text());
            if (!Array.isArray(logs)) throw new Error('not a list');
            if (!confirm(`Replace your bake log with ${logs.length} bake(s) from this file?`)) return;
            localStorage.setItem(LOG_KEY, JSON.stringify(logs));
            loadBakeLog();
            msg.textContent = `Restored ${logs.length} bake(s).`;
        } catch (e) {
            msg.textContent = "That file isn't a sourdough backup.";
        }
        file.value = '';
    });
    document.getElementById('clear-log-btn').addEventListener('click', () => {
        if (!confirm('Delete every saved bake? This cannot be undone.')) return;
        localStorage.removeItem(LOG_KEY);
        loadBakeLog();
        msg.textContent = 'Bake log deleted.';
    });
}

// ---- Offline and updates ----
// Registers the service worker and asks to reload once a new version has been cached.
function initUpdates() {
    const reload = registerSW({
        onNeedRefresh() {
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-label', 'Update available');
            overlay.innerHTML = `
                <div class="sheet">
                    <h2>A new version is ready</h2>
                    <p>Reload to get the latest fixes. Your bake log is kept.</p>
                    <div class="btn-row">
                        <button class="btn btn-outline" id="update-later">Later</button>
                        <button class="btn btn-primary" id="update-now">Reload</button>
                    </div>
                </div>`;
            overlay.querySelector('#update-later').addEventListener('click', () => overlay.remove());
            overlay.querySelector('#update-now').addEventListener('click', () => reload());
            document.body.appendChild(overlay);
        }
    });
}

// ---- About ----
function openAbout() {
    switchTab('about');
    window.scrollTo(0, 0);
}

function initAbout() {
    document.getElementById('help-about-link').addEventListener('click', openAbout);
    // __APP_VERSION__ is filled in from package.json by the build
    const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
    document.getElementById('app-version').textContent = version ? `Version ${version}` : '';
}

// ---- Footer ----
function renderFooter() {
    const links = FOOTER_LINKS.filter(l => l.url)
        .map(l => `<a href="${l.url}" target="_blank" rel="noopener noreferrer">${l.label}</a>`);
    links.unshift('<a href="#about" id="footer-about">About</a>');
    document.getElementById('site-footer').innerHTML =
        `<div>Made by fj9</div><div class="links">${links.join('')}</div>`;
    document.getElementById('footer-about').addEventListener('click', e => {
        e.preventDefault();
        openAbout();
    });
}

// Tooltips: hover, keyboard focus or a tap shows them; a tap keeps one open until you tap away.
// They are positioned here (fixed, clamped to the screen) so the card edges never cut them off.
function placeTip(wrap) {
    const btn = wrap.querySelector('.info-btn');
    const tip = wrap.querySelector('.tip');
    const b = btn.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const margin = 8;
    const left = Math.min(Math.max(margin, b.left + b.width / 2 - t.width / 2), window.innerWidth - t.width - margin);
    const above = b.top - t.height - margin;
    tip.style.left = `${left}px`;
    tip.style.top = `${above >= margin ? above : b.bottom + margin}px`;
}

function initTooltips() {
    const open = (wrap) => { wrap.classList.add('open'); placeTip(wrap); };
    const close = (wrap) => { if (!wrap.dataset.pinned) wrap.classList.remove('open'); };
    const closeAll = () => document.querySelectorAll('.tip-wrap.open').forEach(w => { delete w.dataset.pinned; w.classList.remove('open'); });

    document.addEventListener('mouseover', e => {
        const wrap = e.target.closest?.('.tip-wrap');
        if (wrap) open(wrap);
    });
    document.addEventListener('mouseout', e => {
        const wrap = e.target.closest?.('.tip-wrap');
        if (wrap && !wrap.contains(e.relatedTarget)) close(wrap);
    });
    document.addEventListener('focusin', e => {
        const wrap = e.target.closest?.('.tip-wrap');
        if (wrap) open(wrap);
    });
    document.addEventListener('focusout', e => {
        const wrap = e.target.closest?.('.tip-wrap');
        if (wrap) close(wrap);
    });
    document.addEventListener('click', e => {
        const wrap = e.target.closest?.('.tip-wrap');
        document.querySelectorAll('.tip-wrap.open').forEach(w => {
            if (w !== wrap) { delete w.dataset.pinned; w.classList.remove('open'); }
        });
        if (wrap && e.target.closest('.info-btn')) {
            e.preventDefault(); // the button may sit inside a label
            if (wrap.dataset.pinned) { delete wrap.dataset.pinned; wrap.classList.remove('open'); }
            else { wrap.dataset.pinned = '1'; open(wrap); }
        }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
    window.addEventListener('scroll', closeAll, { passive: true, capture: true });
    window.addEventListener('resize', closeAll);
}

document.addEventListener('DOMContentLoaded', () => {
    initTooltips();
    initSettings();
    initUpdates();
    renderHelp();
    initAbout();
    renderFooter();
    if (!loadSettings().welcomeSeen) showTutorial();
});
