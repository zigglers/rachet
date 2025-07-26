# Clanker

<div align="center">
  <p>
    <img alt="npm version" src="https://img.shields.io/npm/v/@ziggler/clanker?style=flat-square&color=00D9FF">
    <img alt="license" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square">
    <img alt="node version" src="https://img.shields.io/node/v/@ziggler/clanker?style=flat-square&color=43B02A">
    <img alt="downloads" src="https://img.shields.io/npm/dm/@ziggler/clanker?style=flat-square&color=FF6B6B">
  </p>
  <h3>AI agents that actually <em>do</em> things</h3>
  <p>Not just suggestions—real actions, real changes, real time.</p>
</div>

## Demo

<div align="center">
  <!-- Replace with actual demo GIF/video -->
  <img src="https://via.placeholder.com/800x400/1a1a1a/00D9FF?text=Demo+Video+Coming+Soon" alt="Clanker Demo" width="800">
  <p><em>Refactoring an entire codebase with natural language</em></p>
</div>

## Quick Start

```bash
npm install -g @ziggler/clanker
clanker
```

That's it. Clanker will guide you through setup on first run.

## What Can It Do?

```bash
# Refactor code intelligently
> "Replace all console.log with our logger utility"
✓ Found 47 instances across 12 files
✓ Applied context-aware replacements
✓ All tests still passing

# Understand and modify complex codebases  
> "Add error handling to all async functions"
✓ Analyzed 23 async functions
✓ Added try-catch with appropriate error handling
✓ Preserved existing logic flow

# Execute multi-step workflows
> "Set up a new React component with tests"
✓ Created Button.tsx with TypeScript props
✓ Added Button.test.tsx with coverage
✓ Updated component index exports
```

## Key Features

### 🧠 **Intelligent File Editing**
Advanced order-invariant diff algorithm for reliable file editing. Multiple edit strategies ensure changes are applied correctly even in complex scenarios. [Learn more →](docs/architecture.md#order-invariant-diff-algorithm)

### 🛠️ **Extensible Tool System**
Every action is a tool. Create your own in minutes:
```typescript
const prReadyTool = createTool()
  .id('pr_ready')
  .name('PR Ready Check')
  .description('Check if code is ready for PR')
  .execute(async (args, context) => {
    // Run your checks here
    const testsPass = await runTests();
    const lintPass = await checkLinting();
    const typesOk = await verifyTypes();
    
    return { 
      success: testsPass && lintPass && typesOk,
      output: 'All checks passed!'
    };
  })
  .build();

export default prReadyTool;
```
[Tool docs →](docs/tools.md)

### 🎨 **Beautiful Terminal UI**
React-powered terminal interface with:
- Syntax highlighting
- Real-time progress
- Keyboard navigation  
- Confirmation dialogs

### 🔐 **Safety First**
- Confirmation prompts for destructive actions
- Dry-run mode for testing
- Full operation history
- Rollback capabilities

## 📦 Package Manager

Clanker includes a built-in package manager for discovering, installing, and managing tools:

### Quick Start
```bash
# Search for tools
clanker --search "git"           # or -S

# Install tools
clanker --install ziggler/core   # or -I
clanker --install community/git-tools@1.2.0

# List your tools
clanker --list-installed         # or -L

# Update tools
clanker --update ziggler/core

# Uninstall tools  
clanker --uninstall community/git-tools  # or -U
```

### Creating Your Own Tools

```bash
# Create a new tool project
npx create-clanker-tool

# Develop with hot reloading
npm run dev:watch

# Publish to the registry
npm run publish:tool
```

[🚀 Quick Start Guide →](docs/quick-start-tool-dev.md) | [📚 Full Documentation →](docs/package-manager.md)

### Tool Development Workflow

1. **Create**: Use `create-clanker-tool` to scaffold your project
2. **Develop**: Test locally with `npm run install:local`
3. **Watch**: Use `--watch-tools` for hot reloading during development
4. **Publish**: Submit to registry with `--publish`

## Philosophy

Traditional AI assistants are suggestion engines. Clanker is different—it's an **action engine**.

Instead of:
> "Here's how you could refactor this code..."

Clanker says:
> "I'll refactor this code. Here's what I'm changing... Approve?"

[Read our full philosophy →](docs/philosophy.md)

## Documentation

- 🚀 **[Getting Started](docs/getting-started.md)** - Installation and first steps
- 📦 **[Package Manager](docs/package-manager.md)** - Tool discovery and management
- 🔧 **[Tool Development](docs/tools.md)** - Create custom tools
- 🏗️ **[Architecture](docs/architecture.md)** - How Clanker works under the hood
- 📚 **[API Reference](docs/api.md)** - Complete API documentation

## Use Cases

<table>
<tr>
<td width="50%">

**🔄 Refactoring**
- Update imports across projects
- Rename variables consistently  
- Modernize syntax patterns
- Extract common functions

</td>
<td width="50%">

**📝 Code Generation**
- Create components from specs
- Generate test suites
- Scaffold new features
- Build API endpoints

</td>
</tr>
<tr>
<td width="50%">

**🐛 Debugging**
- Add logging strategically
- Trace execution paths
- Identify error patterns
- Fix type issues

</td>
<td width="50%">

**📦 Project Management**
- Update dependencies safely
- Configure build tools
- Set up CI/CD pipelines
- Manage git workflows

</td>
</tr>
</table>

## Contributing

We'd love your help making Clanker better!

- 🐛 [Report bugs](https://github.com/ziggle-dev/clanker/issues/new?template=bug_report.md)
- 💡 [Request features](https://github.com/ziggle-dev/clanker/issues/new?template=feature_request.md)  
- 🛠️ [Submit tools](https://github.com/ziggle-dev/clanker/issues/new?template=tool_submission.md)
- 📖 [Improve docs](CONTRIBUTING.md)

## Community

- 💬 [Discussions](https://github.com/ziggle-dev/clanker/discussions) - Ask questions, share ideas
- 🌟 [Show & Tell](https://github.com/ziggle-dev/clanker/discussions/categories/show-and-tell) - Share your tools and workflows
- 🐦 [Twitter](https://twitter.com/ziggledev) - Updates and tips

## License

MIT © [Ziggler](https://github.com/ziggle-dev)

---

<div align="center">
  <p><strong>Stop copying suggestions. Start shipping changes.</strong></p>
  <p>
    <a href="https://github.com/ziggle-dev/clanker">⭐ Star on GitHub</a> • 
    <a href="docs/getting-started.md">📚 Get Started</a> • 
    <a href="https://twitter.com/intent/tweet?text=Check%20out%20Clanker%20-%20AI%20agents%20that%20actually%20DO%20things!&url=https://github.com/ziggle-dev/clanker">🐦 Share</a>
  </p>
</div>