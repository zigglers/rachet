# Tool Name

Brief description of what your tool does and why it's useful.

## Installation

```bash
clanker --install your-org/tool-name
```

## Usage

### Basic Example

```bash
clanker -p "use tool-name to process 'hello world'"
```

### Advanced Example

```bash
clanker -p "use tool-name with count 5 and verbose mode to process 'test data'"
```

## Arguments

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| input | string | Yes | - | The input to process |
| count | number | No | 1 | Number of times to repeat |
| verbose | boolean | No | false | Enable verbose output |

## Examples

### Example 1: Basic Processing

```bash
# Simple usage
clanker -p "process 'hello world' with tool-name"
```

Expected output:
```
1. HELLO WORLD
```

### Example 2: Multiple Iterations

```bash
# Process multiple times
clanker -p "use tool-name to process 'test' 3 times"
```

Expected output:
```
1. TEST
2. TEST
3. TEST
```

## Capabilities

This tool requires the following capabilities:
- None (modify as needed for your tool)

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-username/your-tool

# Install dependencies
cd your-tool
npm install

# Build
npm run build
```

### Testing Locally

```bash
# Copy to local tools directory
cp dist/index.js ~/.clanker/tools/your-org/tool-name/1.0.0/

# Test
clanker --list-tools | grep tool-name
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT - See LICENSE file for details

## Author

Your Name ([@your-github](https://github.com/your-github))