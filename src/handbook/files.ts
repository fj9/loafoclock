// The handbook's markdown, read as text. Imported only by the lazily loaded handbook code.
export const HANDBOOK_FILES = import.meta.glob('../../content/handbook/*.{md,json}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
