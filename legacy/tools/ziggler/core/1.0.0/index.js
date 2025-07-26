// Core Tools Bundle for Clanker
// This is a simple example tool for testing the package manager

module.exports = {
  id: 'hello_world',
  name: 'Hello World',
  description: 'A simple test tool that greets the world',
  
  execute: async (args) => {
    const name = args.name || 'World';
    const message = `Hello, ${name}! This is a test tool from the Clanker registry.`;
    
    console.log(message);
    
    return {
      success: true,
      output: message
    };
  },
  
  arguments: [
    {
      name: 'name',
      type: 'string',
      description: 'The name to greet',
      required: false,
      default: 'World'
    }
  ]
};