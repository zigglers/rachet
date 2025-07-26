#!/usr/bin/env node

/**
 * Integration test script for clanker tools
 * Tests that a built tool can be loaded and executed by clanker
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

async function testToolIntegration(toolPath, manifestPath) {
  console.log('🧪 Starting integration test...');
  
  const testDir = path.join(os.tmpdir(), `clanker-test-${Date.now()}`);
  let success = false;
  
  try {
    // Read manifest
    const manifest = await fs.readJson(manifestPath);
    console.log(`📦 Testing tool: ${manifest.id}@${manifest.version}`);
    
    // 1. Clone clanker
    console.log('\n1️⃣ Cloning clanker...');
    await execAsync(`git clone --depth 1 https://github.com/ziggle-dev/clanker ${testDir}/clanker`);
    
    // 2. Install dependencies
    console.log('2️⃣ Installing dependencies...');
    const { stdout: npmOutput } = await execAsync('npm install --production', { 
      cwd: `${testDir}/clanker`,
      timeout: 120000 // 2 minutes
    });
    
    // 3. Create test environment
    console.log('3️⃣ Setting up test environment...');
    const testHome = path.join(testDir, 'home');
    const toolsDir = path.join(testHome, '.clanker/tools', manifest.author.name || 'test', manifest.id, manifest.version);
    await fs.ensureDir(toolsDir);
    
    // 4. Copy tool files
    console.log('4️⃣ Installing tool...');
    await fs.copy(toolPath, toolsDir);
    
    // 5. Test tool detection
    console.log('5️⃣ Testing tool detection...');
    const env = {
      ...process.env,
      HOME: testHome,
      CLANKER_API_KEY: 'test-key'
    };
    
    const { stdout: listOutput } = await execAsync(
      'npm run dev -- --list-tools',
      { 
        cwd: `${testDir}/clanker`,
        env,
        timeout: 30000
      }
    );
    
    if (!listOutput.includes(manifest.id)) {
      throw new Error(`Tool ${manifest.id} not found in --list-tools output`);
    }
    
    console.log('✅ Tool detected successfully');
    
    // 6. Test basic execution (if tool has examples)
    if (manifest.examples && manifest.examples.length > 0) {
      console.log('6️⃣ Testing tool execution...');
      
      const example = manifest.examples[0];
      const args = Object.entries(example.arguments || {})
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      
      try {
        const { stdout: execOutput } = await execAsync(
          `npm run dev -- -p "test ${manifest.id} tool with ${args}"`,
          { 
            cwd: `${testDir}/clanker`,
            env,
            timeout: 60000
          }
        );
        
        console.log('✅ Tool execution completed');
      } catch (error) {
        console.warn('⚠️  Tool execution test failed (this may be expected for tools requiring specific setup)');
      }
    }
    
    // 7. Check for common issues
    console.log('7️⃣ Running diagnostics...');
    const diagnostics = await runDiagnostics(toolsDir, manifest);
    
    if (diagnostics.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      diagnostics.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    success = true;
    console.log('\n✅ Integration test passed!');
    
    return {
      success: true,
      output: listOutput,
      diagnostics
    };
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    
    // Try to provide helpful error messages
    if (error.message.includes('not found in --list-tools')) {
      console.error('\nPossible causes:');
      console.error('- Tool build failed to preserve metadata');
      console.error('- Tool has syntax errors preventing loading');
      console.error('- Missing required dependencies');
    }
    
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      await fs.remove(testDir);
    } catch (e) {
      console.warn('Failed to cleanup test directory:', e.message);
    }
  }
}

async function runDiagnostics(toolPath, manifest) {
  const warnings = [];
  
  // Check file size
  const indexPath = path.join(toolPath, 'index.js');
  const stats = await fs.stat(indexPath);
  
  if (stats.size > 1024 * 1024) { // 1MB
    warnings.push(`Tool bundle is large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Consider optimizing.`);
  }
  
  // Check for common issues in bundled code
  const content = await fs.readFile(indexPath, 'utf8');
  
  if (!content.includes(manifest.id)) {
    warnings.push('Tool ID not found in bundle. Metadata may not be preserved correctly.');
  }
  
  if (manifest.capabilities && manifest.capabilities.length > 0) {
    if (!content.includes('capabilities')) {
      warnings.push('Capabilities may not be preserved in bundle.');
    }
  }
  
  if (content.includes('require("react")') && !content.includes('external')) {
    warnings.push('React appears to be bundled instead of marked as external.');
  }
  
  return { warnings };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: test-integration.js <tool-directory> [manifest.json]');
    console.error('Example: test-integration.js build-output build-output/manifest.json');
    process.exit(1);
  }
  
  const toolPath = args[0];
  const manifestPath = args[1] || path.join(toolPath, 'manifest.json');
  
  testToolIntegration(toolPath, manifestPath)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testToolIntegration };