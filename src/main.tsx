import '@fontsource/alfa-slab-one/latin-400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/plan.css';
import { render } from 'preact';
import { App } from './app/App';
import { setClock12 } from './domain/clock';

// 12-hour times until the Settings screen (milestone 6) lets you choose
setClock12(true);
const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');
render(<App />, root);
