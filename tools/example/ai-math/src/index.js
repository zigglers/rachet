const ai_math = {
  id: 'ai_math',
  name: 'ai-math',
  description: 'An AI-powered calculator that interactively gets numbers and operators from the user, then uses AI to compute the result',
  
  execute: async (args, context) => {
    try {
      // Check if we have access to the registry to call other tools
      if (!context?.registry) {
        return {
          success: false,
          error: 'Tool registry not available. This tool requires access to other tools.'
        };
      }

      const { registry } = context;
      
      // Step 1: Get the first number using the input tool
      console.log('🔢 AI Math Calculator\n');
      
      const firstNumberResult = await registry.execute('input', {
        prompt: 'Enter the first number:',
        type: 'text'
      });
      
      if (!firstNumberResult.success) {
        return {
          success: false,
          error: 'Failed to get first number'
        };
      }
      
      const firstNumber = parseFloat(firstNumberResult.output);
      if (isNaN(firstNumber)) {
        return {
          success: false,
          error: `"${firstNumberResult.output}" is not a valid number`
        };
      }
      
      // Step 2: Get the second number
      const secondNumberResult = await registry.execute('input', {
        prompt: 'Enter the second number:',
        type: 'text'
      });
      
      if (!secondNumberResult.success) {
        return {
          success: false,
          error: 'Failed to get second number'
        };
      }
      
      const secondNumber = parseFloat(secondNumberResult.output);
      if (isNaN(secondNumber)) {
        return {
          success: false,
          error: `"${secondNumberResult.output}" is not a valid number`
        };
      }
      
      // Step 3: Get the operator
      const operatorResult = await registry.execute('input', {
        prompt: 'Enter the operator (+, -, *, /, ^, sqrt, or describe a complex operation):',
        type: 'text'
      });
      
      if (!operatorResult.success) {
        return {
          success: false,
          error: 'Failed to get operator'
        };
      }
      
      const operator = operatorResult.output.trim();
      
      // Step 4: Use AI to perform the calculation
      const mathPrompt = `Please calculate the following mathematical operation and provide ONLY the numerical result:

First number: ${firstNumber}
Second number: ${secondNumber}
Operation: ${operator}

For basic operators (+, -, *, /, ^), perform the standard operation.
For "sqrt", calculate the square root of the first number (ignore the second).
For complex operations described in natural language, interpret and calculate accordingly.

Important: Return ONLY the numerical result, no explanations or additional text.`;

      // Use the summarize tool as a way to invoke AI
      const aiResult = await registry.execute('summarize', {
        content: mathPrompt,
        style: 'brief',
        max_length: 50
      });
      
      if (!aiResult.success) {
        return {
          success: false,
          error: 'Failed to calculate result using AI'
        };
      }
      
      // Format the output nicely
      const output = `🧮 AI Math Result:

📊 Calculation:
   First number:  ${firstNumber}
   Second number: ${secondNumber}
   Operation:     ${operator}
   
✨ Result: ${aiResult.output}

💡 The AI interpreted your operation "${operator}" and calculated the result.`;
      
      return {
        success: true,
        output,
        data: {
          first_number: firstNumber,
          second_number: secondNumber,
          operator: operator,
          result: aiResult.output
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: `AI Math error: ${error.message || error}`
      };
    }
  },
  
  // This tool doesn't need any arguments since it interactively prompts for input
  arguments: []
};

export default ai_math;