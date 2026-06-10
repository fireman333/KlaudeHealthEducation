const fs = require('fs');

let sidebarChunks = [];
try {
  sidebarChunks = fs
    .readdirSync('dist/_astro')
    .filter((f) => f.startsWith('Sidebar') && f.endsWith('.js'));
} catch {
  // dist not built yet — silent fallback; total-baseline rule below still runs
}

const config = [
  {
    name: 'All client JS (total)',
    path: 'dist/_astro/*.js',
    limit: '55 KB',
    gzip: true,
  },
];

if (sidebarChunks.length > 0) {
  config.push({
    name: 'Sidebar chunks (per chunk)',
    path: 'dist/_astro/Sidebar*.js',
    limit: '5 KB',
    gzip: true,
  });
}

module.exports = config;
