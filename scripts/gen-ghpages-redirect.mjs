// Generate a static redirect site for the OLD GitHub Pages host so that every
// legacy URL (https://fireman333.github.io/KlaudeHealthEducation/<path>) bounces
// to the new home (https://med-study-rpg.com/klaudehealthedu/<path>).
//
// GitHub Pages cannot issue a real server-side 301, so each page carries a
// meta-refresh + rel=canonical + JS location.replace (an approximate 301 that
// search engines largely honour). A generic 404.html catch-all covers any path
// not pre-generated (e.g. posts added after this ran).
//
// Run: node scripts/gen-ghpages-redirect.mjs   (requires a prior `pnpm build`)
// Output: redirect-site/  (gitignored; pushed to the gh-pages branch)

import {
  readdirSync, statSync, mkdirSync, writeFileSync, rmSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';

const DIST = 'dist';
const OUT = 'redirect-site';
const NEW_BASE = 'https://med-study-rpg.com/klaudehealthedu';
const OLD_PROJECT_PREFIX = '/KlaudeHealthEducation';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

function redirectHtml(target) {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>已搬遷 — 康勞德醫普</title>
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<meta property="og:url" content="${target}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body>本站已搬遷，正在前往 <a href="${target}">${target}</a></body>
</html>
`;
}

let count = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
    } else if (name === 'index.html') {
      const rel = relative(DIST, dirname(p)); // '' (root) | 'posts/foo' | 'categories' ...
      const target = `${NEW_BASE}/${rel ? `${rel}/` : ''}`.replace(/([^:])\/\/+/g, '$1/');
      const outPath = join(OUT, rel, 'index.html');
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, redirectHtml(target));
      count += 1;
    }
  }
}
walk(DIST);

// Generic catch-all: GitHub Pages serves 404.html for any unmatched path under
// the project. Strip the old project prefix and forward the rest to the new base.
const notFound = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>已搬遷 — 康勞德醫普</title>
<script>
  (function () {
    var rest = location.pathname.replace(${JSON.stringify(`^${OLD_PROJECT_PREFIX}`)}, '');
    location.replace('${NEW_BASE}' + rest + location.search + location.hash);
  })();
</script>
<meta http-equiv="refresh" content="0; url=${NEW_BASE}/">
</head>
<body>本站已搬遷至 <a href="${NEW_BASE}/">${NEW_BASE.replace('https://', '')}</a></body>
</html>
`;
writeFileSync(join(OUT, '404.html'), notFound);

console.log(`redirect-site generated: ${count} per-page redirects + 404.html catch-all`);
