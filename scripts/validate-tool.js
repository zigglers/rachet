#!/usr/bin/env node

/**
 * Validation script for clanker tool submissions
 * Ensures tools meet quality and security standards
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const VALID_CATEGORIES = ['System', 'FileSystem', 'Development', 'Utility', 'AI'];
const VALID_CAPABILITIES = [
  'SystemExecute',
  'FileRead', 
  'FileWrite',
  'NetworkAccess',
  'UserConfirmation'
];

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\/(?:\s|$)/,          // rm -rf /
  /:\(\)\s*\{[^}]*\}\s*:/,           // Fork bomb
  /dd\s+.*of=\/dev\/[sh]d/,          // dd to disk devices
  />\/dev\/[sh]d/,                   // Overwriting disk devices
  /mkfs\./,                          // Formatting filesystems
  /eval\s*\(/,                       // eval() usage
  /Function\s*\(/,                   // Function constructor
  /require\s*\(\s*['"`]child_process['"`]\).*exec(?!Sync)/, // Unsafe exec
];

const REQUIRED_FILES = ['package.json', 'README.md'];

async function validateTool(toolPath) {
  console.log('🔍 Validating tool at:', toolPath);
  
  const errors = [];
  const warnings = [];
  
  try {
    // 1. Check required files exist
    console.log('\n📁 Checking required files...');
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(toolPath, file);
      if (!await fs.pathExists(filePath)) {
        errors.push(`Missing required file: ${file}`);
      }
    }
    
    // 2. Validate package.json
    console.log('\n📋 Validating package.json...');
    const packageJsonPath = path.join(toolPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const pkg = await fs.readJson(packageJsonPath);
      validatePackageJson(pkg, errors, warnings);
    }
    
    // 3. Check for entry point
    console.log('\n🚪 Checking entry point...');
    const entryPoint = await findEntryPoint(toolPath);
    if (!entryPoint) {
      errors.push('No entry point found (src/index.ts or main field in package.json)');
    }
    
    // 4. Security scan
    console.log('\n🔒 Running security scan...');
    await securityScan(toolPath, errors, warnings);
    
    // 5. Check dependencies
    console.log('\n📦 Checking dependencies...');
    await checkDependencies(toolPath, errors, warnings);
    
    // 6. Validate README
    console.log('\n📖 Validating README...');
    await validateReadme(toolPath, errors, warnings);
    
    // 7. Check for examples
    console.log('\n💡 Checking for examples...');
    const examplesPath = path.join(toolPath, 'examples');
    if (!await fs.pathExists(examplesPath)) {
      warnings.push('No examples directory found');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Validation complete`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`⚠️  Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors found:');
      errors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return {
      valid: false,
      errors: [`Validation error: ${error.message}`],
      warnings
    };
  }
}

function validatePackageJson(pkg, errors, warnings) {
  // Required fields
  const required = ['name', 'version', 'description', 'author'];
  for (const field of required) {
    if (!pkg[field]) {
      errors.push(`package.json missing required field: ${field}`);
    }
  }
  
  // Validate name format
  if (pkg.name && !pkg.name.match(/^@[a-z0-9-]+\/[a-z0-9-]+$/)) {
    errors.push('package.json name must be in format: @org/tool-name');
  }
  
  // Validate version
  if (pkg.version && !pkg.version.match(/^\d+\.\d+\.\d+$/)) {
    errors.push('package.json version must be in semver format: x.y.z');
  }
  
  // Validate clanker config
  if (!pkg.clanker) {
    errors.push('package.json missing "clanker" configuration');
  } else {
    if (!pkg.clanker.category) {
      errors.push('package.json missing clanker.category');
    } else if (!VALID_CATEGORIES.includes(pkg.clanker.category)) {
      errors.push(`Invalid category: ${pkg.clanker.category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
    
    if (pkg.clanker.capabilities) {
      for (const cap of pkg.clanker.capabilities) {
        if (!VALID_CAPABILITIES.includes(cap)) {
          warnings.push(`Unknown capability: ${cap}`);
        }
      }
    }
    
    if (!pkg.clanker.tags || pkg.clanker.tags.length === 0) {
      warnings.push('No tags specified in clanker.tags');
    }
  }
  
  // Check for peer dependencies
  if (!pkg.peerDependencies || !pkg.peerDependencies['@ziggler/clanker']) {
    errors.push('Must specify @ziggler/clanker as a peer dependency');
  }
  
  // Warn about large dependencies
  if (pkg.dependencies) {
    const depCount = Object.keys(pkg.dependencies).length;
    if (depCount > 10) {
      warnings.push(`Tool has ${depCount} dependencies. Consider reducing bundle size.`);
    }
  }
}

async function findEntryPoint(toolPath) {
  const pkg = await fs.readJson(path.join(toolPath, 'package.json')).catch(() => ({}));
  
  const candidates = [
    pkg.main,
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
    const fullPath = path.join(toolPath, candidate);
    if (await fs.pathExists(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
}

async function securityScan(toolPath, errors, warnings) {
  const files = await getSourceFiles(toolPath);
  
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const relativePath = path.relative(toolPath, file);
    
    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`Dangerous pattern found in ${relativePath}: ${pattern}`);
      }
    }
    
    // Check for suspicious imports
    if (content.includes('child_process') && !content.includes('promisify')) {
      warnings.push(`Direct child_process usage in ${relativePath}. Consider using promisified versions.`);
    }
    
    if (content.includes('fs.') && content.includes('Sync')) {
      warnings.push(`Synchronous fs operations in ${relativePath}. Consider using async versions.`);
    }
    
    // Check for network access
    if (content.match(/https?:\/\//)) {
      warnings.push(`Network URLs found in ${relativePath}. Ensure NetworkAccess capability is declared.`);
    }
  }
}

async function checkDependencies(toolPath, errors, warnings) {
  const packageJsonPath = path.join(toolPath, 'package.json');
  if (!await fs.pathExists(packageJsonPath)) return;
  
  const pkg = await fs.readJson(packageJsonPath);
  
  // Check for security vulnerabilities
  try {
    console.log('  Running npm audit...');
    execSync('npm audit --json', { 
      cwd: toolPath, 
      stdio: 'pipe',
      encoding: 'utf8' 
    });
  } catch (error) {
    if (error.stdout) {
      try {
        const audit = JSON.parse(error.stdout);
        if (audit.metadata.vulnerabilities.high > 0 || audit.metadata.vulnerabilities.critical > 0) {
          errors.push(`Security vulnerabilities found: ${audit.metadata.vulnerabilities.high} high, ${audit.metadata.vulnerabilities.critical} critical`);
        } else if (audit.metadata.vulnerabilities.moderate > 0) {
          warnings.push(`Security vulnerabilities found: ${audit.metadata.vulnerabilities.moderate} moderate`);
        }
      } catch {
        warnings.push('npm audit failed to run properly');
      }
    }
  }
  
  // Check for large packages
  const blacklistedPackages = ['lodash', 'moment', 'jquery', 'bootstrap'];
  if (pkg.dependencies) {
    for (const dep of Object.keys(pkg.dependencies)) {
      if (blacklistedPackages.includes(dep)) {
        warnings.push(`Large/unnecessary dependency: ${dep}. Consider alternatives.`);
      }
    }
  }
}

async function validateReadme(toolPath, errors, warnings) {
  const readmePath = path.join(toolPath, 'README.md');
  if (!await fs.pathExists(readmePath)) return;
  
  const content = await fs.readFile(readmePath, 'utf8');
  
  // Check for minimum sections
  const requiredSections = ['Installation', 'Usage', 'Examples'];
  for (const section of requiredSections) {
    if (!content.includes(`# ${section}`) && !content.includes(`## ${section}`)) {
      warnings.push(`README missing section: ${section}`);
    }
  }
  
  // Check minimum length
  if (content.length < 500) {
    warnings.push('README is very short. Consider adding more documentation.');
  }
}

async function getSourceFiles(dir, files = []) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    
    // Skip hidden files and node_modules
    if (dirent.name.startsWith('.') || dirent.name === 'node_modules') {
      continue;
    }
    
    if (dirent.isDirectory()) {
      await getSourceFiles(res, files);
    } else if (dirent.name.match(/\.(ts|tsx|js|jsx)$/)) {
      files.push(res);
    }
  }
  
  return files;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: validate-tool.js <tool-path>');
    process.exit(1);
  }
  
  const toolPath = args[0];
  
  validateTool(toolPath)
    .then((result) => {
      process.exit(result.valid ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Validation error:', error.message);
      process.exit(1);
    });
}

module.exports = { validateTool };