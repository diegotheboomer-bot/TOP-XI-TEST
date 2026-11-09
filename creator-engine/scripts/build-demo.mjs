// Builds the standalone demo into one self-contained HTML page:
//   demo-dist/index.html
// React/ReactDOM load from cdnjs (UMD globals); everything else is inlined.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

const html = `<title>Creator Engine Demo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<style>${css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
writeFileSync(path.join(out, 'index.html'), html);
console.log(`demo-dist/index.html  ${(html.length / 1024).toFixed(0)} KB`);
