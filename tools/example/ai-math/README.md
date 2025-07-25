# AI Math

An AI-powered calculator that interactively gets numbers and operators from the user, then uses AI to compute the result.

A Clanker tool by Example Developer.

## Features

- Interactive prompts for numbers and operators
- Supports basic operations: +, -, *, /, ^ (power)
- Supports complex operations described in natural language
- Uses AI to interpret and calculate results
- Beautiful formatted output

## Project Structure

```
ai-math/
├── src/                # Source code (committed to git)
│   └── index.ts        # Tool implementation
├── bin/                # Compiled output (NOT in git)
│   ├── index.js        # Compiled TypeScript
│   └── bundle.js       # Bundled tool with dependencies
├── scripts/            # Development scripts
│   └── install-local.js
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build
npm run bundle
```

## Testing Locally

1. Build and bundle your tool:
   ```bash
   npm run build    # Compiles src/ to bin/
   npm run bundle   # Creates bin/bundle.js
   ```

2. Install locally for development:
   ```bash
   npm run install:local
   ```
   
   Or watch for changes during development:
   ```bash
   npm run dev:watch
   ```

3. Test with Clanker:
   ```bash
   clanker --list-tools | grep ai_math
   clanker --prompt "Use ai_math to calculate something"
   ```

## Usage Examples

```bash
# Basic usage - will prompt for inputs
clanker --prompt "Use the ai_math tool"

# The tool will:
# 1. Ask for first number (e.g., 25)
# 2. Ask for second number (e.g., 5)
# 3. Ask for operator (e.g., +, -, *, /, sqrt, "find the percentage")
# 4. Use AI to calculate and show the result
```

## Publishing

To publish your tool to the Clanker registry:

```bash
npm run publish:tool
```

This will:
1. Validate your source structure
2. Ensure only source files are included
3. Create a PR template
4. Guide you through submission

**Important**: Only submit source code!
- ✅ Include: src/, package.json, README.md, tsconfig.json
- ❌ Exclude: bin/, node_modules/, compiled files

The Clanker registry will build your tool automatically after merge.

## Tool Structure

```javascript
{
  id: 'ai_math',        // Unique identifier
  name: 'ai-math',      // Display name
  description: '...',   // What the tool does
  execute: async (args, context) => {
    // Uses context.registry to call other tools
    // 1. input tool for getting numbers
    // 2. summarize tool for AI calculation
  },
  arguments: []  // No arguments needed - it's interactive!
}
```

## How It Works

1. **Interactive Input**: Uses the built-in `input` tool to get numbers and operators
2. **Number Validation**: Ensures inputs are valid numbers
3. **AI Processing**: Uses the `summarize` tool to have AI interpret and calculate
4. **Formatted Output**: Shows the calculation and result in a nice format

## Best Practices

1. **Source Control**: Only commit src/ files, not bin/
2. **Testing**: Test thoroughly before publishing
3. **Documentation**: Keep README updated with examples
4. **Versioning**: Use semantic versioning (1.0.0, 1.1.0, 2.0.0)
5. **Dependencies**: Bundle all dependencies in bin/bundle.js