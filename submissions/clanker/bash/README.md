# Bash Command Executor Tool

Execute shell commands directly from Clanker with proper security controls and timeout management.

## Installation

```bash
clanker --install clanker/bash
```

## Usage

### Basic Command Execution

```bash
# List files
clanker -p "run ls -la"

# Check current directory
clanker -p "execute pwd command"

# View system information
clanker -p "run uname -a"
```

### Advanced Usage

```bash
# Run with custom timeout (5 seconds)
clanker -p "run 'sleep 3 && echo done' with timeout 5000"

# Change directory (persists for session)
clanker -p "cd to /tmp directory"

# Chain commands
clanker -p "run 'cd /tmp && ls -la'"
```

## Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| command | string | Yes | - | The shell command to execute |
| timeout | number | No | 30000 | Command timeout in milliseconds |

## Features

- **Security Controls**: Blocks potentially dangerous commands (rm -rf /, fork bombs, etc.)
- **Timeout Management**: Prevents long-running commands from hanging
- **Directory State**: Maintains working directory state across commands
- **Output Handling**: Properly captures both stdout and stderr
- **Error Details**: Provides exit codes and error messages

## Examples

### Example 1: File Operations

```bash
# Create a directory
clanker -p "mkdir test-directory"

# Create a file
clanker -p "run 'echo Hello World > test.txt'"

# View file contents
clanker -p "cat test.txt"
```

### Example 2: Git Operations

```bash
# Check git status
clanker -p "run git status"

# View recent commits
clanker -p "run 'git log --oneline -5'"

# Check branches
clanker -p "run git branch"
```

### Example 3: System Information

```bash
# Disk usage
clanker -p "run df -h"

# Memory usage
clanker -p "check memory with free -h"

# Running processes
clanker -p "run 'ps aux | head -10'"
```

### Example 4: Directory Navigation

```bash
# Change to home directory
clanker -p "cd ~"

# Go to project directory
clanker -p "cd to ~/projects/my-app"

# Check where we are
clanker -p "pwd"
```

## Capabilities

This tool requires the following capabilities:
- **SystemExecute**: Permission to execute system commands
- **UserConfirmation**: May request user confirmation for certain commands

## Security

The bash tool includes several security features:

1. **Command Validation**: Blocks known dangerous command patterns
2. **Timeout Protection**: Commands are killed after the timeout period
3. **Buffer Limits**: Output is limited to prevent memory issues
4. **User Confirmation**: Can be configured to require confirmation

## Working Directory

The tool maintains its own working directory state. When you use `cd` commands, the directory change persists for subsequent commands in the same session.

## Error Handling

The tool provides detailed error information including:
- Exit codes
- Standard error output
- Timeout notifications
- Directory change failures

## Tips

1. **Use quotes** for complex commands: `"ls -la | grep .txt"`
2. **Check exit codes** in the returned data for script automation
3. **Use timeouts** for potentially long-running commands
4. **Chain commands** with && or ; for complex operations

## Limitations

- Commands run in a subprocess, so shell state (variables, aliases) doesn't persist
- Some interactive commands may not work as expected
- Binary output is not well-supported

## Contributing

This is a core Clanker tool. To contribute improvements, please submit PRs to the main Clanker repository.

## License

MIT