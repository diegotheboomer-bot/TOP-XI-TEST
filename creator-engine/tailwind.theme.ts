// Colours read CSS variables (src/styles/tokens.css) so the app can switch
// between dark and light. Shared by the app and the standalone demo configs.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (name: string, steps: number[]) => Object.fromEntries(steps.map((s) => [s, v(`${name}-${s}`)]));

export const colors = {
  transparent: 'transparent',
  current: 'currentColor',
  white: v('white'),
  zinc: scale('zinc', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
  accent: scale('accent', [50, 100, 500, 600, 700]),
  rose: scale('rose', [50, 200, 600, 700]),
  amber: scale('amber', [50, 300, 700, 800]),
  sky: scale('sky', [50, 700]),
};

export const boxShadow = { card: '0 1px 2px rgb(var(--shadow) / 0.05), 0 1px 1px rgb(var(--shadow) / 0.03)' };

/** Runs before first paint so a saved light preference doesn't flash dark. */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('ce-theme')==='light')document.documentElement.dataset.appTheme='light'}catch(e){}`;
