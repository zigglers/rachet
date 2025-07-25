# Clanker Tools Registry

This is the official tool registry for [Clanker](https://github.com/ziggle-dev/clanker) - AI agents that actually do things.

## 📦 Available Tools

Browse the `tools/` directory to see all available tools.

## 🛠️ Installing Tools

```bash
# Install a tool
clanker --install ziggler/core@latest

# Search for tools
clanker --search "database"

# List installed tools
clanker --list-installed
```

## 📝 Contributing a Tool

### 1. Create Your Tool

Use our scaffolding tool:

```bash
npx create-clanker-tool
```

### 2. Test Your Tool

```bash
# Build and bundle
npm run build
npm run bundle

# Test locally
cp dist/bundle.js ~/.clanker/tools/my-org/my-tool/1.0.0/index.js
clanker --list-tools
```

### 3. Submit Your Tool

1. Fork this repository
2. Create your tool directory: `tools/[your-org]/[tool-name]/`
3. Add:
   - `metadata.json` - Tool metadata
   - `[version]/index.js` - Bundled tool code
4. Submit a pull request

## 📋 Tool Structure

```
tools/
├── org-name/
│   └── tool-name/
│       ├── metadata.json
│       ├── 1.0.0/
│       │   └── index.js
│       └── 2.0.0/
│           └── index.js
```

### metadata.json Format

```json
{
  "id": "tool-id",
  "name": "Tool Name",
  "description": "What this tool does",
  "author": "Your Name",
  "versions": {
    "1.0.0": {
      "date": "2025-07-25",
      "dependencies": {},
      "minClankerVersion": "0.1.0"
    }
  },
  "latest": "1.0.0",
  "tags": ["category", "feature"],
  "homepage": "https://your-tool-site.com"
}
```

## 🔒 Security

- All tools are reviewed before merging
- Tools run in the Clanker sandbox environment
- Report security issues to security@ziggle.dev

## 📜 License

Tools in this registry may have different licenses. Check each tool's directory for license information.

The registry itself is MIT licensed.