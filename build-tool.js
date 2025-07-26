const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  const toolDir = './tool-repo';
  const outputDir = './build-output';
  
  // Find entry point
  let entryPoint;
  const possibleEntries = [
    'src/index.ts',
    'src/index.tsx',
    'src/index.js',
    'src/index.jsx',
    'index.ts',
    'index.tsx',
    'index.js',
    'index.jsx'
  ];
  
  for (const entry of possibleEntries) {
    if (fs.existsSync(path.join(toolDir, entry))) {
      entryPoint = path.join(toolDir, entry);
      break;
    }
  }
  
  if (!entryPoint) {
    throw new Error('No entry point found');
  }
  
  console.log('Building from:', entryPoint);
  
  // Bundle the tool
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node16',
    outfile: path.join(outputDir, 'index.js'),
    external: [
      'react',
      'ink',
      '@ziggler/clanker',
      'child_process',
      'fs',
      'path',
      'os',
      'util',
      'stream',
      'events',
      'crypto'
    ],
    // Avoid top-level await issues
    supported: {
      'top-level-await': false
    }
  });
  
  console.log('✅ Build complete');
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
