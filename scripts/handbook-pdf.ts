// Makes the two PDF editions of the handbook from the markdown in content/handbook.
//   npm run handbook:pdf              skips quietly when there is no Chrome
//   npm run handbook:pdf -- --require fails when there is none (for CI)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileHandbook } from '../src/handbook/compile';
import { FACTS } from '../src/handbook/facts';
import { buildPrintHtml, printHref, type Edition } from '../src/handbook/print';

const root = resolve(import.meta.dirname, '..');
const OUTPUT: Record<Edition, string> = { reader: 'Loaf-o-clock-sourdough-handbook.pdf', ai: 'Loaf-o-clock-sourdough-handbook-for-ai.pdf' };

function findChrome(): string | undefined {
    const candidates = [
        process.env.CHROME_PATH,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'
    ];
    return candidates.find((c): c is string => !!c && existsSync(c));
}

const chrome = findChrome();
if (!chrome) {
    const message = 'No Chrome found for the handbook PDFs (set CHROME_PATH).';
    if (process.argv.includes('--require')) { console.error(message); process.exit(1); }
    console.warn(`${message} Skipping.`);
    process.exit(0);
}

const dir = join(root, 'content/handbook');
const files = Object.fromEntries(readdirSync(dir).map((f) => [`content/handbook/${f}`, readFileSync(join(dir, f), 'utf8')]));
const book = compileHandbook(files, { facts: FACTS, href: printHref });
const fontFile = join(root, 'node_modules/@fontsource/alfa-slab-one/files/alfa-slab-one-latin-400-normal.woff');
const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

const work = mkdtempSync(join(tmpdir(), 'handbook-'));
mkdirSync(join(root, 'public'), { recursive: true });
for (const edition of ['reader', 'ai'] as const) {
    const page = join(work, `${edition}.html`);
    writeFileSync(page, buildPrintHtml(book, { edition, date, fontUrl: existsSync(fontFile) ? pathToFileURL(fontFile).href : undefined }));
    const out = join(root, 'public', OUTPUT[edition]);
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer', '--generate-pdf-document-outline', `--user-data-dir=${join(work, `profile-${edition}`)}`, `--print-to-pdf=${out}`, pathToFileURL(page).href], { stdio: 'ignore' });
    console.log(`Wrote ${out}`);
}
