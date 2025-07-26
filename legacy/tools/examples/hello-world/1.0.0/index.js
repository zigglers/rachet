/**
 * Hello World Example Tool for Clanker
 * 
 * This is a simple example that shows the basic structure of a Clanker tool.
 * Every tool must export an object with specific properties.
 */

module.exports = {
  // Unique identifier for the tool (use underscores, not hyphens)
  id: 'hello_world_example',
  
  // Display name for the tool
  name: 'Hello World Example',
  
  // Description shown in tool listings
  description: 'A simple example tool that greets users and demonstrates tool structure',
  
  // Main execution function - this is called when the tool runs
  execute: async (args, context) => {
    // Extract arguments with defaults
    const name = args.name || 'World';
    const greeting = args.greeting || 'Hello';
    const excited = args.excited || false;
    
    // Build the message
    let message = `${greeting}, ${name}!`;
    if (excited) {
      message = message.toUpperCase() + '!!!';
    }
    
    // Log to console (visible to user)
    console.log('\n' + message);
    
    // You can access context if needed
    if (context && context.workingDirectory) {
      console.log(`\nWorking directory: ${context.workingDirectory}`);
    }
    
    // Return result - must include success and output
    return {
      success: true,
      output: message,
      // Optional: include additional data
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  },
  
  // Define the arguments your tool accepts
  arguments: [
    {
      name: 'name',
      type: 'string',
      description: 'The name to greet',
      required: false,
      default: 'World'
    },
    {
      name: 'greeting', 
      type: 'string',
      description: 'The greeting to use',
      required: false,
      default: 'Hello'
    },
    {
      name: 'excited',
      type: 'boolean', 
      description: 'Whether to show excitement with caps and exclamation marks',
      required: false,
      default: false
    }
  ],
  
  // Optional: categorize your tool
  category: 'utility'
};