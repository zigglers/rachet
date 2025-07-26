import fs from 'fs';

async function validate() {
  try {
    // Load the built tool using dynamic import
    const tool = await import('./build-output/index.js');
    
    // Check if it exports something
    const toolDef = tool.default || tool;
    
    if (!toolDef || typeof toolDef !== 'object') {
      throw new Error('Tool must export an object (default export or module.exports)');
    }
    
    // Check required properties
    const required = ['id', 'name', 'description', 'execute'];
    const missing = required.filter(prop => !toolDef[prop]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required properties: ${missing.join(', ')}`);
    }
    
    // Check property types
    if (typeof toolDef.id !== 'string') {
      throw new Error('id must be a string');
    }
    
    if (typeof toolDef.name !== 'string') {
      throw new Error('name must be a string');
    }
    
    if (typeof toolDef.description !== 'string') {
      throw new Error('description must be a string');
    }
    
    if (typeof toolDef.execute !== 'function') {
      throw new Error('execute must be a function');
    }
    
    console.log('✅ Tool format is valid');
    console.log('Tool ID:', toolDef.id);
    console.log('Tool Name:', toolDef.name);
    console.log('Tool Description:', toolDef.description);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

validate();
