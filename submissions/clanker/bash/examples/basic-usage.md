# Basic Usage Examples

## File Management

```bash
# List all files including hidden
clanker -p "show all files with ls -la"

# Find large files
clanker -p "find files larger than 100MB with: find . -size +100M"

# Count files in directory
clanker -p "count files: ls -1 | wc -l"
```

## Text Processing

```bash
# Search in files
clanker -p "search for TODO in all js files: grep -r TODO --include='*.js'"

# Count lines in a file
clanker -p "count lines in README.md: wc -l README.md"

# View first 10 lines
clanker -p "show first 10 lines of package.json: head -10 package.json"
```

## System Monitoring

```bash
# Check disk space
clanker -p "check disk space with df -h"

# View running processes
clanker -p "show top processes: ps aux | head -20"

# Network connections
clanker -p "check network connections: netstat -an | head -20"
```

## Development Tasks

```bash
# Run tests
clanker -p "run npm test"

# Build project
clanker -p "build the project: npm run build"

# Check for outdated packages
clanker -p "check outdated packages: npm outdated"
```