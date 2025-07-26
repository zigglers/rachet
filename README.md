# Clanker Tools Registry

The official tool registry for [Clanker](https://github.com/ziggle-dev/clanker) - AI agents that actually do things.

## 🚀 Quick Start

### Installing Tools

```bash
# Install a tool
clanker --install org/tool

# Search for tools
clanker --search "keyword"

# List installed tools
clanker --list-installed

# Enable experimental tools
clanker --enable-experimental
```

### Creating Tools

```bash
# Use our tool scaffold
npx create-clanker-tool

# Or start from template
cp -r templates/tool-template submissions/my-org/my-tool
```

## 📝 Submitting a Tool

1. **Fork this repository**

2. **Create your tool** in `submissions/your-org/tool-name/`
   ```
   submissions/
   └── your-org/
       └── tool-name/
           ├── package.json
           ├── src/
           │   └── index.ts
           ├── README.md
           └── examples/
   ```

3. **Submit a Pull Request**
   - Our CI/CD will automatically:
     - Validate your tool structure
     - Build and bundle your tool
     - Run integration tests
     - Create a staging branch for testing

4. **Test your tool** (while PR is open)
   ```bash
   clanker --enable-experimental
   clanker --install your-org/tool-name@pr-123
   ```

5. **Merge** to publish to the main registry

## 📦 Tool Structure

### Source Structure (What you submit)
```
package.json         # Tool metadata and configuration
src/
├── index.ts        # Main tool implementation
└── types.ts        # Optional type definitions
README.md           # Tool documentation
examples/           # Usage examples
```

### Built Structure (What gets published)
```
tools/org/tool-name/version/
├── index.js        # Bundled tool code
└── manifest.json   # Generated metadata
```

## 🛠️ Tool Development

### package.json Format

```json
{
  "name": "@org/tool-name",
  "version": "1.0.0",
  "description": "What your tool does",
  "author": {
    "name": "Your Name",
    "email": "email@example.com"
  },
  "repository": "https://github.com/your/tool",
  "clanker": {
    "category": "System|FileSystem|Development|Utility|AI",
    "capabilities": ["SystemExecute", "FileRead", "FileWrite"],
    "tags": ["keyword1", "keyword2"],
    "minVersion": "0.1.33"
  },
  "peerDependencies": {
    "@ziggler/clanker": "*",
    "react": "*",
    "ink": "*"
  }
}
```

### Tool Implementation

```typescript
import { createTool, ToolCategory, ToolCapability } from '@ziggler/clanker';

export default createTool()
  .id('tool-name')
  .name('Tool Display Name')
  .description('What this tool does')
  .category(ToolCategory.System)
  .capabilities(ToolCapability.SystemExecute)
  .tags('keyword1', 'keyword2')
  
  // Define arguments
  .stringArg('input', 'Input description', { required: true })
  .numberArg('timeout', 'Timeout in ms', { default: 5000 })
  
  // Lifecycle hooks
  .onInitialize(async (context) => {
    // Setup code
  })
  
  // Main execution
  .execute(async (args, context) => {
    const { input, timeout } = args;
    
    // Tool logic here
    
    return {
      success: true,
      output: 'Result',
      data: { /* optional data */ }
    };
  })
  
  // Optional: Custom rendering
  .renderResult(({ result, isExecuting }) => {
    // Return React component for custom display
  })
  
  .build();
```

## 🔒 Security

- All tools are reviewed before merging
- Automated security scanning on every submission
- Tools run with limited permissions
- Report security issues to security@ziggle.dev

## 🧪 Testing Tools

### Before Submission
```bash
# Build your tool
cd submissions/your-org/tool-name
npm install
npm run build

# Test locally
cp dist/index.js ~/.clanker/tools/your-org/tool-name/1.0.0/
clanker --list-tools
```

### During PR Review
- Automated tests run on every push
- Integration tests with latest clanker
- Security scanning
- You can test the staging build

## 📋 Tool Guidelines

### Do's
- ✅ Single, focused purpose
- ✅ Clear documentation with examples
- ✅ Proper error handling
- ✅ Use TypeScript for better type safety
- ✅ Follow semantic versioning

### Don'ts
- ❌ No malicious code
- ❌ No unauthorized network requests
- ❌ No modification of system files without user consent
- ❌ No bundling large dependencies (use peer deps)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📜 License

Individual tools may have their own licenses. The registry infrastructure is MIT licensed.