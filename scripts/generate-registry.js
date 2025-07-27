#!/usr/bin/env node

/**
 * Generate registry.json from tools directory
 * This creates an index of all available tools for the package manager
 */

const fs = require('fs');
const path = require('path');

function generateRegistry() {
  const toolsDir = path.join(__dirname, '..', 'tools');
  const registryPath = path.join(__dirname, '..', 'registry.json');
  
  const tools = [];
  
  // Scan tools directory
  if (fs.existsSync(toolsDir)) {
    const orgs = fs.readdirSync(toolsDir).filter(f => 
      fs.statSync(path.join(toolsDir, f)).isDirectory()
    );
    
    for (const org of orgs) {
      const orgDir = path.join(toolsDir, org);
      const toolNames = fs.readdirSync(orgDir).filter(f =>
        fs.statSync(path.join(orgDir, f)).isDirectory()
      );
      
      for (const toolName of toolNames) {
        const metadataPath = path.join(orgDir, toolName, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            
            // Convert metadata to registry entry
            tools.push({
              id: `${org}/${toolName}`,
              org: org,
              name: toolName,
              description: metadata.description,
              latest: metadata.latest,
              version: metadata.latest,
              author: metadata.publisher || org,
              repository: metadata.repository,
              homepage: metadata.repository,
              keywords: metadata.tags || [],
              created: Object.values(metadata.versions)[0]?.date,
              updated: Object.values(metadata.versions)[Object.keys(metadata.versions).length - 1]?.date,
              // Additional metadata
              versions: Object.keys(metadata.versions),
              publisher: metadata.publisher
            });
            
            console.log(`✅ Added ${org}/${toolName} to registry`);
          } catch (error) {
            console.error(`❌ Failed to process ${org}/${toolName}:`, error.message);
          }
        }
      }
    }
  }
  
  // Create registry object
  const registry = {
    version: '1.0.0',
    tools: tools,
    updated: new Date().toISOString(),
    totalTools: tools.length
  };
  
  // Write registry file
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  console.log(`\n📋 Registry generated with ${tools.length} tools`);
  console.log(`📄 Written to: ${registryPath}`);
  
  return registry;
}

// Run if called directly
if (require.main === module) {
  generateRegistry();
}

module.exports = { generateRegistry };