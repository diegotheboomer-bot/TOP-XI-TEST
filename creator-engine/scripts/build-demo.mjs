// Builds the standalone demo into one self-contained HTML page:
//   demo-dist/index.html
// React/ReactDOM load from cdnjs (UMD globals); everything else is inlined.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Applies a saved light preference before first paint (dark is the default).
const THEME_BOOT_SCRIPT = `try{localStorage.removeItem('ce-theme');delete document.documentElement.dataset.appTheme}catch(e){}`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'demo-dist');
mkdirSync(out, { recursive: true });

// Map react imports to the UMD globals.
const globals = {
  name: 'umd-globals',
  setup(b) {
    const map = { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM', 'react/jsx-runtime': null };
    b.onResolve({ filter: /^react(-dom)?(\/client|\/jsx-runtime)?$/ }, (args) => ({ path: args.path, namespace: 'umd' }));
    b.onLoad({ filter: /.*/, namespace: 'umd' }, (args) => {
      if (args.path === 'react/jsx-runtime') {
        return {
          contents:
            'const R = window.React; const jsx = (t, p, k) => R.createElement(t, k === undefined ? p : { ...p, key: k }); export { jsx, jsx as jsxs }; export const Fragment = R.Fragment;',
          loader: 'js',
        };
      }
      return { contents: `module.exports = window.${map[args.path]};`, loader: 'js' };
    });
  },
};

const result = await build({
  entryPoints: [path.join(root, 'standalone/main.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  write: false,
  alias: { '@': path.join(root, 'src') },
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [globals],
  logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const cssFile = path.join(out, 'demo.css');
execFileSync(
  path.join(root, 'node_modules/.bin/tailwindcss'),
  ['-c', path.join(root, 'standalone/tailwind.config.ts'), '-i', path.join(root, 'standalone/styles.css'), '-o', cssFile, '--minify'],
  { cwd: root, stdio: 'inherit' },
);
const css = readFileSync(cssFile, 'utf8');

// Head and body parts, shared by both outputs.
const iconB64 = Buffer.from(readFileSync(path.join(root, 'src/app/icon.svg'))).toString('base64');
const head = `<title>Atlas Clips Demo</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${iconB64}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap">
<style>${css}</style>
<script>${THEME_BOOT_SCRIPT}</script>`;
const body = `<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>`;

// 1. demo-dist/: a page fragment for a claude.ai artifact (the host adds <html>/<head>).
const html = `${head.replace('</title>', '</title>\n<meta name="claude:viewport-fit-sides" content="cover">')}\n${body}\n`;
writeFileSync(path.join(out, 'index.html'), html);

// 2. demo-site/: a complete static site for any static host (GitHub Pages).
const site = path.join(root, 'demo-site');
mkdirSync(site, { recursive: true });
writeFileSync(
  path.join(site, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Atlas Clips demo: streamers run clipping campaigns, clippers get paid per view. Fictional data, mock money.">
${head}
</head>
<body>
${body}
</body>
</html>
`,
);

// Campaign photos are published next to the page as thumbs/*.jpg (both outputs).
const thumbs = path.join(root, 'public/demo/thumbs');
for (const dir of [out, site]) {
  mkdirSync(path.join(dir, 'thumbs'), { recursive: true });
  for (const f of readdirSync(thumbs).filter((f) => f.endsWith('.jpg'))) copyFileSync(path.join(thumbs, f), path.join(dir, 'thumbs', f));
}
console.log(`demo-dist/index.html  ${(html.length / 1024).toFixed(0)} KB · demo-site/ ready for static hosting`);
