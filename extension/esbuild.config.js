const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const sharedConfig = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  target: 'chrome120',
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
};

async function build() {
  // Ensure dist directory exists
  if (!fs.existsSync('dist')) fs.mkdirSync('dist');
  if (!fs.existsSync('dist/icons')) fs.mkdirSync('dist/icons');

  const entryPoints = [
    // Popup React bundle
    { in: 'src/popup/index.tsx', out: 'dist/popup' },
    // Content scripts
    { in: 'src/content/youtube.ts', out: 'dist/content-youtube' },
    { in: 'src/content/article.ts', out: 'dist/content-article' },
    // Background service worker
    { in: 'src/background/service-worker.ts', out: 'dist/background' },
  ];

  const buildConfigs = [
    // Popup (iife format for React)
    {
      ...sharedConfig,
      entryPoints: [entryPoints[0]],
      outdir: '.',
      format: 'iife',
      globalName: 'SynapsePopup',
    },
    // Content scripts (iife - injected into pages)
    {
      ...sharedConfig,
      entryPoints: [entryPoints[1], entryPoints[2]],
      outdir: '.',
      format: 'iife',
    },
    // Background service worker (esm)
    {
      ...sharedConfig,
      entryPoints: [entryPoints[3]],
      outdir: '.',
      format: 'esm',
    },
  ];

  // CSS bundle
  const cssConfig = {
    entryPoints: ['src/styles/popup.css'],
    bundle: true,
    minify: !isWatch,
    outfile: 'dist/popup.css',
  };

  if (isWatch) {
    const contexts = await Promise.all([
      ...buildConfigs.map(cfg => esbuild.context(cfg)),
      esbuild.context(cssConfig),
    ]);
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('[esbuild] Watching for changes...');
  } else {
    await Promise.all([
      ...buildConfigs.map(cfg => esbuild.build(cfg)),
      esbuild.build(cssConfig),
    ]);

    // Copy static files
    fs.copyFileSync('public/popup.html', 'dist/popup.html');
    fs.copyFileSync('manifest.json', 'dist/manifest.json');

    // Copy icons if they exist
    const iconsDir = 'public/icons';
    if (fs.existsSync(iconsDir)) {
      for (const file of fs.readdirSync(iconsDir)) {
        fs.copyFileSync(
          path.join(iconsDir, file),
          path.join('dist/icons', file)
        );
      }
    }

    console.log('[esbuild] Build complete → dist/');
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
