# Rachet Registry 🛠️

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
# Option 1: Use the GitHub template (Recommended)
# Visit: https://github.com/zigglers/rachet-tool
# Click "Use this template" to create your tool repository

# Option 2: Use our tool scaffold
npx create-rachet-tool
```

## 📝 Submitting a Tool

### Automated Process (Recommended)

1. **Create your tool repository**
   - Use the [rachet-tool template](https://github.com/zigglers/rachet-tool)
   - Click "Use this template" to create your repository
   - Implement your tool following the template structure

2. **Submit via GitHub Issue**
   - Go to [Issues](https://github.com/zigglers/rachet/issues/new/choose)
   - Select "Tool Submission" template
   - Fill in:
     - Repository URL
     - Description
     - Tool name (optional, defaults to repo name)
     - Version (optional, defaults to commit hash)

3. **Automated Pipeline**
   - Our bot automatically:
     - Clones your repository
     - Builds and bundles your tool
     - Validates the format
     - Runs security scans
     - Creates a PR with your tool

4. **Review & Approval**
   - A maintainer reviews the auto-generated PR
   - Once approved and merged, your tool is live!
   - The registry.json updates automatically

### Example Submission

```markdown
### Repository URL
https://github.com/your-org/rachet-awesome-tool

### Description
A tool that does awesome things with files

### Tool Name
awesome-tool

### Version
1.0.0
```

## 🤖 Automated Registry Updates

The registry.json file is automatically maintained by our CI/CD pipeline:

- ✅ Updates automatically when tool PRs are merged
- ✅ No manual intervention needed
- ✅ Ensures registry is always in sync with published tools
- ✅ Includes all tool metadata and versions

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

## 🧪 Testing Your Tool

### Before Submission
```bash
# In your tool repository
npm install
npm run build
npm test

# Test with clanker locally
npm link
clanker your-tool-name --help
```

### After Submission
- Watch the issue for automated progress updates
- Check the auto-generated PR for any issues
- The bot will comment with:
  - ✅ Build status
  - ✅ Validation results
  - ✅ Security scan results
  - 🔗 Link to the PR

### Once Merged
```bash
# Your tool is immediately available
clanker install your-org/tool-name
clanker tool-name --help
```

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
