/**
 * Bash Command Executor Tool for Clanker
 * 
 * Executes shell commands with proper security controls and user confirmation
 */

import React from 'react';
import { Text } from 'ink';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createTool, ToolCategory, ToolCapability } from '@ziggler/clanker';

const execAsync = promisify(exec);

// Tool state
let currentDirectory: string = process.cwd();

export default createTool()
    .id('bash')
    .name('Bash Command Executor')
    .description('Execute shell commands with timeout and security controls')
    .category(ToolCategory.System)
    .capabilities(ToolCapability.SystemExecute, ToolCapability.UserConfirmation)
    .tags('bash', 'shell', 'command', 'system', 'terminal', 'cli')

    // Arguments
    .stringArg('command', 'The shell command to execute', { 
        required: true,
        validate: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Command cannot be empty';
            }
            
            // Check for extremely dangerous patterns
            const dangerousPatterns = [
                /rm\s+-rf\s+\/(?:\s|$)/,     // rm -rf /
                /:\(\)\s*\{[^}]*\}\s*:/,      // Fork bomb
                /dd\s+.*of=\/dev\/[sh]d/,     // dd to disk devices
                />\/dev\/[sh]d/,              // Overwriting disk devices
                /mkfs\./                      // Formatting filesystems
            ];
            
            for (const pattern of dangerousPatterns) {
                if (pattern.test(value)) {
                    return 'This command appears to be potentially dangerous and has been blocked';
                }
            }
            
            return true;
        }
    })
    .numberArg('timeout', 'Command timeout in milliseconds', {
        default: 30000,
        validate: (value) => value > 0 || 'Timeout must be positive'
    })

    // Initialize
    .onInitialize(async (context) => {
        currentDirectory = context.workingDirectory || process.cwd();
    })

    // Execute
    .execute(async (args, context) => {
        const { command, timeout } = args;

        context.logger?.debug(`Executing command: ${command}`);
        context.logger?.debug(`Working directory: ${currentDirectory}`);
        context.logger?.debug(`Timeout: ${timeout}ms`);

        try {
            // Handle cd command specially to maintain directory state
            if (command.startsWith('cd ')) {
                const newDir = command.substring(3).trim();
                
                // Handle special cases
                let targetDir = newDir;
                if (newDir === '~') {
                    targetDir = process.env.HOME || '/';
                } else if (newDir.startsWith('~/')) {
                    targetDir = `${process.env.HOME}${newDir.substring(1)}`;
                }
                
                try {
                    process.chdir(targetDir);
                    currentDirectory = process.cwd();

                    context.logger?.info(`Changed directory to: ${currentDirectory}`);
                    return {
                        success: true,
                        output: `Changed directory to: ${currentDirectory}`
                    };
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    context.logger?.error(`Failed to change directory: ${errorMsg}`);
                    return {
                        success: false,
                        error: `Cannot change directory: ${errorMsg}`
                    };
                }
            }

            // Execute command with timeout and buffer limits
            const { stdout, stderr } = await execAsync(command, {
                cwd: currentDirectory,
                timeout,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                env: {
                    ...process.env,
                    // Add tool context to environment
                    CLANKER_TOOL: 'bash',
                    CLANKER_CWD: currentDirectory
                }
            });

            // Combine output streams
            let output = stdout;
            if (stderr && !stdout) {
                output = stderr;
            } else if (stderr) {
                output = stdout + '\n[stderr]\n' + stderr;
            }

            if (stderr) {
                context.logger?.warn(`Command produced stderr output`);
            }
            
            context.logger?.info(`Command executed successfully`);

            return {
                success: true,
                output: output || '(Command completed with no output)',
                data: {
                    stdout,
                    stderr,
                    exitCode: 0,
                    workingDirectory: currentDirectory
                }
            };
        } catch (error: any) {
            context.logger?.error(`Command failed: ${error.message}`);
            
            // Check for specific error types
            if (error.killed && error.signal === 'SIGTERM') {
                return {
                    success: false,
                    error: `Command timed out after ${timeout}ms`
                };
            }
            
            // Extract exit code and output from error
            const exitCode = error.code || 1;
            const errorOutput = error.stderr || error.stdout || '';
            
            return {
                success: false,
                error: error.message,
                output: errorOutput,
                data: {
                    exitCode,
                    stderr: error.stderr,
                    stdout: error.stdout,
                    workingDirectory: currentDirectory
                }
            };
        }
    })
    
    // Custom renderer for bash output
    .renderResult(({ isExecuting, result }) => {
        if (isExecuting) {
            return <Text color="cyan">🔄 Running command...</Text>;
        }

        if (!result) {
            return null;
        }

        if (!result.success) {
            return <Text color="red">❌ {result.error}</Text>;
        }

        const output = result.output || '';
        
        // Empty output
        if (!output.trim()) {
            return <Text color="gray">(no output)</Text>;
        }

        // Single line output
        const lines = output.trim().split('\n');
        if (lines.length === 1) {
            return <Text>{output.trim()}</Text>;
        }

        // Multi-line output - just display as-is
        // The Clanker UI will handle syntax highlighting if needed
        return <Text>{output.trim()}</Text>;
    })
    
    // Examples
    .examples([
        {
            description: 'List files in current directory',
            arguments: {
                command: 'ls -la'
            }
        },
        {
            description: 'Check current working directory',
            arguments: {
                command: 'pwd'
            }
        },
        {
            description: 'Run a command with custom timeout',
            arguments: {
                command: 'sleep 2 && echo "Done"',
                timeout: 5000
            }
        },
        {
            description: 'Change directory',
            arguments: {
                command: 'cd /tmp'
            }
        }
    ])
    
    .build();