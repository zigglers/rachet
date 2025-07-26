# Contributing to Clanker Tools

Thank you for your interest in contributing to the Clanker Tools registry! This guide will help you submit your tool successfully.

## Before You Start

1. **Check existing tools** - Make sure a similar tool doesn't already exist
2. **Read the guidelines** - Familiarize yourself with our tool requirements
3. **Test locally** - Ensure your tool works with the latest version of clanker

## Submission Process

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/clanker-tools
cd clanker-tools
```

### 2. Create Your Tool

Use our template as a starting point:

```bash
cp -r templates/tool-template submissions/your-org/your-tool
cd submissions/your-org/your-tool
```

### 3. Develop Your Tool

#### Required Files

- `package.json` - Tool metadata and dependencies
- `src/index.ts` (or `.js`) - Main tool implementation  
- `README.md` - Documentation with examples
- `examples/` - Usage examples (optional but recommended)

#### package.json Requirements

Your `package.json` must include:

```json
{
  "name": "@your-org/tool-name",
  "version": "1.0.0",
  "description": "Clear description",
  "author": {
    "name": "Your Name",
    "email": "email@example.com"
  },
  "clanker": {
    "category": "System|FileSystem|Development|Utility|AI",
    "capabilities": ["SystemExecute", "FileRead", "FileWrite"],
    "tags": ["keyword1", "keyword2"],
    "minVersion": "0.1.33"
  },
  "peerDependencies": {
    "@ziggler/clanker": "*"
  }
}
```

### 4. Test Your Tool

Before submitting:

```bash
# Install dependencies
npm install

# Run any tests
npm test

# Check for security issues
npm audit

# Build (if using TypeScript)
npm run build
```

### 5. Submit Your PR

1. Commit your changes:
   ```bash
   git add submissions/your-org/your-tool
   git commit -m "feat: add your-org/your-tool"
   ```

2. Push to your fork:
   ```bash
   git push origin main
   ```

3. Create a Pull Request on GitHub

## Code Standards

### TypeScript/JavaScript

- Use TypeScript when possible for better type safety
- Follow standard naming conventions
- Handle errors gracefully
- Clean up resources in tool cleanup

### Tool Design

- **Single Purpose**: Each tool should do one thing well
- **Clear Arguments**: Use descriptive argument names
- **Error Messages**: Provide helpful error messages
- **Documentation**: Include examples for all major use cases

### Security

Your tool must NOT:
- Execute arbitrary code without user confirmation
- Make network requests without declaring `NetworkAccess` capability
- Modify system files without declaring `FileWrite` capability
- Include any malicious or obfuscated code
- Bundle unnecessary large dependencies

## Review Process

### Automated Checks

When you submit a PR, our CI/CD will:

1. ✅ Validate tool structure
2. ✅ Check security vulnerabilities
3. ✅ Build and bundle your tool
4. ✅ Run integration tests
5. ✅ Create a staging branch for testing

### Manual Review

Maintainers will review:

1. Code quality and security
2. Documentation completeness
3. Appropriate use of capabilities
4. Overall usefulness to the community

### Testing During Review

While your PR is open, you can test your tool:

```bash
# Enable experimental tools
clanker --enable-experimental

# Install from PR
clanker --install your-org/tool@pr-123
```

## After Merge

Once your PR is merged:

1. Your tool is published to the main registry
2. Users can install it with `clanker --install your-org/tool`
3. You maintain ownership and can submit updates

## Updating Your Tool

To update an existing tool:

1. Increment the version in `package.json`
2. Update the code and documentation
3. Submit a new PR with changes
4. Previous versions remain available

## Need Help?

- 💬 [Discord Community](https://discord.gg/clanker)
- 📧 Email: support@clanker.dev
- 🐛 [Issue Tracker](https://github.com/ziggle-dev/clanker-tools/issues)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

Thank you for contributing to Clanker! 🎉