import { createTool, ToolCategory, ToolCapability } from '@ziggler/clanker';

/**
 * Example tool template
 * 
 * This demonstrates the structure of a clanker tool using the builder pattern.
 * Modify this template to create your own tool.
 */

export default createTool()
  .id('tool-name')
  .name('Tool Display Name')
  .description('A clear, concise description of what this tool does')
  .category(ToolCategory.Utility)
  .capabilities(/* Add capabilities as needed, e.g., ToolCapability.FileRead */)
  .tags('template', 'example')
  
  // Define your tool's arguments
  .stringArg('input', 'Description of the input parameter', { 
    required: true,
    validate: (value) => {
      if (value.length < 3) {
        return 'Input must be at least 3 characters';
      }
      return true;
    }
  })
  
  .numberArg('count', 'Number of times to repeat', { 
    default: 1,
    validate: (value) => value > 0 || 'Count must be positive'
  })
  
  .booleanArg('verbose', 'Enable verbose output', { 
    default: false 
  })
  
  // Optional: Initialize resources when tool loads
  .onInitialize(async (context) => {
    // Perform any setup needed
    // Access to: context.workingDirectory, context.logger
    context.logger?.debug('Tool initialized');
  })
  
  // Main execution logic
  .execute(async (args, context) => {
    const { input, count, verbose } = args;
    
    try {
      // Your tool logic here
      const results = [];
      
      for (let i = 0; i < count; i++) {
        if (verbose) {
          context.logger?.info(`Processing iteration ${i + 1}`);
        }
        
        // Example: Process the input
        const processed = input.toUpperCase();
        results.push(`${i + 1}. ${processed}`);
      }
      
      return {
        success: true,
        output: results.join('\n'),
        data: {
          processedCount: count,
          results
        }
      };
      
    } catch (error) {
      context.logger?.error('Tool execution failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  })
  
  // Optional: Custom output rendering (requires React/Ink)
  /*
  .renderResult(({ result, isExecuting }) => {
    if (isExecuting) {
      return <Text color="cyan">Processing...</Text>;
    }
    
    if (!result.success) {
      return <Text color="red">Error: {result.error}</Text>;
    }
    
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Completed successfully</Text>
        <Text>{result.output}</Text>
      </Box>
    );
  })
  */
  
  // Optional: Define usage examples
  .examples([
    {
      description: 'Basic usage',
      arguments: {
        input: 'hello world'
      }
    },
    {
      description: 'Repeat multiple times with verbose output',
      arguments: {
        input: 'test',
        count: 3,
        verbose: true
      }
    }
  ])
  
  .build();