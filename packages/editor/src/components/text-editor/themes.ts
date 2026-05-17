export const BUILTIN_THEMES = {
	vs: 'Light',
	'vs-dark': 'Dark',
	'hc-light': 'High Contrast Light',
	'hc-black': 'High Contrast Dark',
} as const;

export type CodeEditorTheme = keyof typeof BUILTIN_THEMES;
