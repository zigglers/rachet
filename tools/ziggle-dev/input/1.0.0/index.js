// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import * as child_process from "child_process";
import * as os from "os";
import { promisify } from "util";
var execAsync = promisify(child_process.exec);
var index_default = createTool().id("input").name("Get User Input").description("Show a platform-specific input dialog to get arbitrary information from the user").category(ToolCategory.Utility).capabilities(ToolCapability.UserConfirmation).tags("input", "dialog", "user", "prompt", "ask").stringArg("prompt", "The prompt/question to show to the user", { required: true }).stringArg("default_value", "Default value to pre-fill in the input field (optional)", { required: false }).stringArg("title", "Title for the dialog window (optional)", { required: false, default: "Input Required" }).booleanArg("password", "Whether to mask the input for password entry (optional)", {
  required: false,
  default: false
}).examples([
  {
    description: "Ask for user's name",
    arguments: {
      prompt: "What is your name?",
      title: "Name Input"
    },
    result: "User enters: John Doe"
  },
  {
    description: "Ask for API key with password masking",
    arguments: {
      prompt: "Please enter your API key:",
      title: "API Key",
      password: true
    },
    result: "User enters masked input"
  }
]).execute(async (args, context) => {
  var _a, _b, _c;
  const { prompt, default_value, title, password } = args;
  const platform2 = os.platform();
  (_a = context.logger) == null ? void 0 : _a.debug(`Showing input dialog on ${platform2}`);
  try {
    let result;
    switch (platform2) {
      case "darwin":
        result = await showMacOSDialog(prompt, default_value, title || "Input Required", password || false);
        break;
      case "win32":
        result = await showWindowsDialog(prompt, default_value, title || "Input Required", password || false);
        break;
      case "linux":
        result = await showLinuxDialog(prompt, default_value, title || "Input Required", password || false);
        break;
      default:
        return {
          success: false,
          error: `Unsupported platform: ${platform2}`
        };
    }
    if (result === null || result === void 0) {
      return {
        success: false,
        error: "User cancelled the input dialog"
      };
    }
    (_b = context.logger) == null ? void 0 : _b.info(`User provided input: ${password ? "[HIDDEN]" : result}`);
    return {
      success: true,
      output: result,
      data: { input: result }
    };
  } catch (error) {
    (_c = context.logger) == null ? void 0 : _c.error(`Failed to show input dialog: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      error: `Failed to show input dialog: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}).build();
async function showMacOSDialog(prompt, defaultValue, title, password) {
  const escapedPrompt = prompt.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "'\\''").replace(/\n/g, " ");
  const escapedTitle = (title || "Input Required").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "'\\''").replace(/\n/g, " ");
  const escapedDefault = (defaultValue || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "'\\''").replace(/\n/g, " ");
  let script;
  if (password) {
    script = `osascript -e 'tell application "System Events" to display dialog "${escapedPrompt}" default answer "" with title "${escapedTitle}" with hidden answer' -e 'text returned of result'`;
  } else {
    script = `osascript -e 'tell application "System Events" to display dialog "${escapedPrompt}" default answer "${escapedDefault}" with title "${escapedTitle}"' -e 'text returned of result'`;
  }
  try {
    const { stdout } = await execAsync(script);
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error && error.message.includes("User canceled")) {
      throw new Error("User cancelled the input dialog");
    }
    throw error;
  }
}
async function showWindowsDialog(prompt, defaultValue, title, password) {
  const escapedPrompt = prompt.replace(/'/g, "''");
  const escapedTitle = (title || "Input Required").replace(/'/g, "''");
  const escapedDefault = (defaultValue || "").replace(/'/g, "''");
  let script;
  if (password) {
    script = `
            Add-Type -AssemblyName Microsoft.VisualBasic
            $secure = Read-Host '${escapedPrompt}' -AsSecureString
            $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            Write-Output $plain
        `;
  } else {
    script = `
            Add-Type -AssemblyName Microsoft.VisualBasic
            [Microsoft.VisualBasic.Interaction]::InputBox('${escapedPrompt}', '${escapedTitle}', '${escapedDefault}')
        `;
  }
  const { stdout } = await execAsync(`powershell -Command "${script.replace(/"/g, '\\"')}"`);
  const result = stdout.trim();
  if (result === "") {
    throw new Error("User cancelled the input dialog");
  }
  return result;
}
async function showLinuxDialog(prompt, defaultValue, title, password) {
  try {
    await execAsync("which zenity");
    return await showZenityDialog(prompt, defaultValue, title, password);
  } catch {
    try {
      await execAsync("which kdialog");
      return await showKdialogDialog(prompt, defaultValue, title, password);
    } catch {
      return await showTerminalInput(prompt, defaultValue, password);
    }
  }
}
async function showZenityDialog(prompt, defaultValue, title, password) {
  const args = [
    "zenity",
    "--entry",
    `--text="${prompt.replace(/"/g, '\\"')}"`,
    `--title="${(title || "Input Required").replace(/"/g, '\\"')}"`
  ];
  if (defaultValue) {
    args.push(`--entry-text="${defaultValue.replace(/"/g, '\\"')}"`);
  }
  if (password) {
    args.push("--hide-text");
  }
  try {
    const { stdout } = await execAsync(args.join(" "));
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error && (error.message.includes("code 1") || error.message.includes("code 255"))) {
      throw new Error("User cancelled the input dialog");
    }
    throw error;
  }
}
async function showKdialogDialog(prompt, defaultValue, title, password) {
  const args = [
    "kdialog",
    password ? "--password" : "--inputbox",
    `"${prompt.replace(/"/g, '\\"')}"`,
    defaultValue ? `"${defaultValue.replace(/"/g, '\\"')}"` : '""',
    `--title "${(title || "Input Required").replace(/"/g, '\\"')}"`
  ];
  try {
    const { stdout } = await execAsync(args.join(" "));
    return stdout.trim();
  } catch (error) {
    if (error instanceof Error && error.message.includes("code 1")) {
      throw new Error("User cancelled the input dialog");
    }
    throw error;
  }
}
async function showTerminalInput(prompt, defaultValue, password) {
  const script = password ? `read -s -p "${prompt.replace(/"/g, '\\"')}: " input && echo "$input"` : `read -p "${prompt.replace(/"/g, '\\"')} [${defaultValue || ""}]: " input && echo "\${input:-${defaultValue || ""}}"`;
  try {
    const { stdout } = await execAsync(script, { shell: "/bin/bash" });
    return stdout.trim();
  } catch (error) {
    throw new Error("Failed to read input from terminal");
  }
}
export {
  index_default as default
};
