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
  // Colorway (see tokens.css): gradient stops and the text colour that sits on them.
  brand: { a: v('brand-a'), b: v('brand-b'), ink: v('brand-ink') },
};

/** `bg-brand`: the colorway's slight two-tone gradient. */
export const backgroundImage = { brand: 'linear-gradient(135deg, rgb(var(--brand-a)), rgb(var(--brand-b)))' };

export const boxShadow = { card: '0 1px 2px rgb(var(--shadow) / 0.05), 0 1px 1px rgb(var(--shadow) / 0.03)' };

/** Runs before first paint so a saved light preference doesn't flash dark. */
export const THEME_BOOT_SCRIPT = `try{if(localStorage.getItem('ce-theme')==='light')document.documentElement.dataset.appTheme='light';var c=localStorage.getItem('ce-colorway');if(c)document.documentElement.dataset.colorway=c}catch(e){}`;
