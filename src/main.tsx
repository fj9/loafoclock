import '@fontsource/alfa-slab-one/latin-400.css';
import './styles/tokens.css';
import './styles/base.css';
import { render } from 'preact';
import { App } from './app/App';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');
render(<App />, root);
