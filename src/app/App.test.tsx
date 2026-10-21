// @vitest-environment jsdom
import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App shell', () => {
    it('shows the name and the tagline', () => {
        render(<App />);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toContain("Loaf O'Clock");
        expect(screen.getByText("It's always Loaf O'Clock somewhere.")).toBeTruthy();
    });
});
