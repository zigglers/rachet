// tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
var currentDirectory = process.cwd();
var index_default = createTool().id("bash").name("Bash Command Executor").description("Execute a bash command").category(ToolCategory.System).capabilities(ToolCapability.SystemExecute, ToolCapability.UserConfirmation).tags("bash", "shell", "command", "system").stringArg("command", "The bash command to execute", { required: true }).numberArg("timeout", "Command timeout in milliseconds", {
  default: 3e4,
  validate: (value) => value > 0 || "Timeout must be positive"
}).onInitialize(async (context) => {
  currentDirectory = context.workingDirectory || process.cwd();
}).execute(async (args, context) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const { command, timeout } = args;
  (_a = context.logger) == null ? void 0 : _a.debug(`Executing bash command: ${command}`);
  (_b = context.logger) == null ? void 0 : _b.debug(`Working directory: ${currentDirectory}`);
  (_c = context.logger) == null ? void 0 : _c.debug(`Timeout: ${timeout}ms`);
  try {
    if (command.startsWith("cd ")) {
      const newDir = command.substring(3).trim();
      try {
        process.chdir(newDir);
        currentDirectory = process.cwd();
        (_d = context.logger) == null ? void 0 : _d.info(`Changed directory to: ${currentDirectory}`);
        return {
          success: true,
          output: `Changed directory to: ${currentDirectory}`
        };
      } catch (error) {
        (_e = context.logger) == null ? void 0 : _e.error(`Failed to change directory: ${error instanceof Error ? error.message : String(error)}`);
        return {
          success: false,
          error: `Cannot change directory: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    const { stdout, stderr } = await execAsync(command, {
      cwd: currentDirectory,
      timeout,
      maxBuffer: 1024 * 1024
    });
    const output = stdout + (stderr ? `
STDERR: ${stderr}` : "");
    if (stderr) {
      (_f = context.logger) == null ? void 0 : _f.warn(`Command produced stderr output: ${stderr}`);
    }
    (_g = context.logger) == null ? void 0 : _g.info(`Command executed successfully`);
    (_h = context.logger) == null ? void 0 : _h.debug(`Output: ${output.substring(0, 200)}${output.length > 200 ? "..." : ""}`);
    return {
      success: true,
      output: output.trim() || "Command executed successfully (no output)"
    };
  } catch (error) {
    (_i = context.logger) == null ? void 0 : _i.error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      error: `Command failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}).examples([
  {
    description: "List files in current directory",
    arguments: {
      command: "ls -la"
    }
  },
  {
    description: "Run command with custom timeout",
    arguments: {
      command: 'sleep 5 && echo "Done"',
      timeout: 1e4
    }
  }
]).build();
var getCurrentDirectory = () => currentDirectory;
export {
  index_default as default,
  getCurrentDirectory
};
