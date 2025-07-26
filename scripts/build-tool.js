#!/usr/bin/env node

/**
 * Build script for clanker tools
 * Bundles TypeScript/JavaScript tools with proper metadata preservation
 */

const esbuild = require('esbuild');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

async function buildTool(submissionPath, outputPath) {
  console.log('🔨 Building tool from:', submissionPath);
  
  try {
    // 1. Read and validate package.json
    const packageJsonPath = path.join(submissionPath, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error('package.json not found');
    }
    
    const packageJson = await fs.readJson(packageJsonPath);
    validatePackageJson(packageJson);
    
    // 2. Find entry point
    const entryPoint = findEntryPoint(submissionPath, packageJson);
    console.log('📄 Entry point:', entryPoint);
    
    // 3. Extract metadata
    const metadata = await extractMetadata(submissionPath, packageJson);
    console.log('📊 Extracted metadata:', {
      id: metadata.id,
      category: metadata.category,
      capabilities: metadata.capabilities,
      tags: metadata.tags
    });
    
    // 4. Bundle the tool
    console.log('📦 Bundling with esbuild...');
    const result = await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node16',
      external: [
        // React and Ink provided by host
        'react',
        'ink',
        '@ziggler/clanker',
        // Node built-ins
        'fs',
        'fs/promises',
        'path',
        'child_process',
        'util',
        'os',
        'crypto',
        'stream',
        'events',
        'buffer',
        'querystring',
        'url',
        'http',
        'https',
        'net',
        'tls',
        'dgram',
        'dns',
        'readline',
        'vm',
        'zlib',
        'assert',
        'tty',
        'cluster',
        'worker_threads',
        'perf_hooks'
      ],
      outfile: path.join(outputPath, 'index.js'),
      metafile: true,
      sourcemap: false,
      keepNames: true,
      plugins: [
        metadataPreservationPlugin(metadata)
      ]
    });
    
    // 5. Generate manifest
    const manifest = {
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      version: packageJson.version,
      author: packageJson.author,
      repository: packageJson.repository,
      category: metadata.category,
      capabilities: metadata.capabilities,
      tags: metadata.tags,
      arguments: metadata.arguments,
      dependencies: {
        external: Object.keys(packageJson.peerDependencies || {}),
        bundled: Object.keys(packageJson.dependencies || {})
      },
      clankerVersion: packageJson.clanker?.minVersion || '>=0.1.33',
      buildInfo: {
        date: new Date().toISOString(),
        builder: 'esbuild',
        sourceHash: await hashDirectory(submissionPath),
        bundleSize: result.metafile.outputs[path.join(outputPath, 'index.js')].bytes,
        entryPoint: path.relative(submissionPath, entryPoint)
      }
    };
    
    await fs.writeJson(path.join(outputPath, 'manifest.json'), manifest, { spaces: 2 });
    
    console.log('✅ Build complete!');
    console.log('📊 Bundle size:', formatBytes(manifest.buildInfo.bundleSize));
    
    return manifest;
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    throw error;
  }
}

/**
 * Plugin to ensure tool metadata is preserved in the bundle
 */
function metadataPreservationPlugin(metadata) {
  return {
    name: 'preserve-metadata',
    setup(build) {
      build.onEnd(async (result) => {
        if (result.errors.length > 0) return;
        
        const bundlePath = build.initialOptions.outfile;
        let content = await fs.readFile(bundlePath, 'utf8');
        
        // Check if the tool uses the builder pattern
        if (content.includes('createTool()') || content.includes('.build()')) {
          console.log('✅ Tool uses builder pattern, metadata should be preserved');
          return;
        }
        
        // For simple object exports, inject metadata
        content = `
// Metadata injection for tools that don't use the builder pattern
const __toolMetadata = ${JSON.stringify({
  category: metadata.category,
  capabilities: metadata.capabilities,
  tags: metadata.tags
}, null, 2)};

${content}

// Apply metadata to exported tool
if (typeof module !== 'undefined' && module.exports) {
  const exportedTool = module.exports.default || module.exports;
  if (exportedTool && typeof exportedTool === 'object') {
    Object.assign(exportedTool, __toolMetadata);
  }
}
`;
        
        await fs.writeFile(bundlePath, content);
        console.log('💉 Injected metadata into bundle');
      });
    }
  };
}

/**
 * Validate package.json has required fields
 */
function validatePackageJson(pkg) {
  const required = ['name', 'version', 'description'];
  const missing = required.filter(field => !pkg[field]);
  
  if (missing.length > 0) {
    throw new Error(`package.json missing required fields: ${missing.join(', ')}`);
  }
  
  if (!pkg.clanker) {
    throw new Error('package.json missing "clanker" configuration section');
  }
  
  if (!pkg.clanker.category) {
    throw new Error('package.json missing clanker.category');
  }
}

/**
 * Find the entry point for the tool
 */
function findEntryPoint(submissionPath, packageJson) {
  // Check common entry points
  const candidates = [
    packageJson.main,
    'src/index.ts',
    'src/index.tsx',
    'src/index.js',
    'src/index.jsx',
    'index.ts',
    'index.tsx',
    'index.js',
    'index.jsx'
  ].filter(Boolean);
  
  for (const candidate of candidates) {
    const fullPath = path.join(submissionPath, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  throw new Error('No entry point found. Add "main" to package.json or create src/index.ts');
}

/**
 * Extract metadata from the tool source
 */
async function extractMetadata(submissionPath, packageJson) {
  const metadata = {
    id: path.basename(submissionPath),
    name: packageJson.name,
    description: packageJson.description,
    category: packageJson.clanker.category,
    capabilities: packageJson.clanker.capabilities || [],
    tags: packageJson.clanker.tags || [],
    arguments: []
  };
  
  // Try to extract additional metadata from source
  const entryPoint = findEntryPoint(submissionPath, packageJson);
  const source = await fs.readFile(entryPoint, 'utf8');
  
  // Extract ID from createTool().id() call
  const idMatch = source.match(/\.id\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  if (idMatch) {
    metadata.id = idMatch[1];
  }
  
  // Extract name from .name() call
  const nameMatch = source.match(/\.name\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  if (nameMatch) {
    metadata.name = nameMatch[1];
  }
  
  // Extract description from .description() call
  const descMatch = source.match(/\.description\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  if (descMatch) {
    metadata.description = descMatch[1];
  }
  
  // Extract arguments from .stringArg(), .numberArg(), etc.
  const argMatches = source.matchAll(/\.(string|number|boolean|array|object)Arg\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g);
  for (const match of argMatches) {
    metadata.arguments.push({
      name: match[2],
      type: match[1],
      description: match[3]
    });
  }
  
  return metadata;
}

/**
 * Calculate hash of directory contents
 */
async function hashDirectory(dir) {
  const hash = crypto.createHash('sha256');
  const files = await getFiles(dir);
  
  for (const file of files.sort()) {
    const content = await fs.readFile(file);
    hash.update(path.relative(dir, file));
    hash.update(content);
  }
  
  return hash.digest('hex').substring(0, 16);
}

/**
 * Recursively get all files in a directory
 */
async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'node_modules' 
      ? getFiles(res) 
      : res;
  }));
  return files.flat().filter(f => !f.includes('node_modules'));
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: build-tool.js <submission-path> <output-path>');
    process.exit(1);
  }
  
  const [submissionPath, outputPath] = args;
  
  buildTool(submissionPath, outputPath)
    .then((manifest) => {
      console.log('\n📋 Generated manifest:', path.join(outputPath, 'manifest.json'));
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Build failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    });
}

module.exports = { buildTool };