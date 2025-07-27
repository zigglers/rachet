// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import * as fs from "fs/promises";
import * as path from "path";
function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}
var listTool = createTool().id("list").name("List Directory Contents").description("List files and directories in a given path (defaults to current directory)").category(ToolCategory.FileSystem).capabilities(ToolCapability.ReadOnlyOperation).tags("filesystem", "list", "directory", "ls").stringArg("path", "Directory path to list (defaults to current directory)", {
  required: false,
  default: "."
}).booleanArg("detailed", "Show detailed information including file types and sizes", {
  required: false,
  default: false
}).examples([
  {
    description: "List current directory",
    arguments: {},
    result: "file1.ts\nfile2.js\nsubdir/\nREADME.md"
  },
  {
    description: "List specific directory",
    arguments: { path: "./src" },
    result: "index.ts\napp.tsx\ncomponents/\nutils/"
  },
  {
    description: "List with detailed information",
    arguments: { path: ".", detailed: true },
    result: "[file] README.md (2.5 KB)\n[file] package.json (1.2 KB)\n[dir] src/\n[dir] node_modules/"
  }
]).execute(async (args, context) => {
  const targetPath = path.resolve(args.path || ".");
  const detailed = args.detailed || false;
  try {
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      return {
        success: false,
        error: `Path is not a directory: ${targetPath}`
      };
    }
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
    const maxEntries = 100;
    const truncated = entries.length > maxEntries;
    const displayEntries = truncated ? entries.slice(0, maxEntries) : entries;
    let output;
    const items = [];
    if (detailed) {
      const detailedEntries = await Promise.all(
        displayEntries.map(async (entry) => {
          const fullPath = path.join(targetPath, entry.name);
          const stats2 = await fs.stat(fullPath);
          const type = entry.isDirectory() ? "dir" : "file";
          const size = entry.isDirectory() ? "-" : formatFileSize(stats2.size);
          const name = entry.isDirectory() ? `${entry.name}/` : entry.name;
          items.push({
            name: entry.name,
            type,
            size: stats2.size,
            isDirectory: entry.isDirectory()
          });
          return `[${type}] ${name} ${size ? `(${size})` : ""}`.trim();
        })
      );
      output = detailedEntries.join("\n");
    } else {
      output = displayEntries.map(
        (entry) => entry.isDirectory() ? `${entry.name}/` : entry.name
      ).join("\n");
      displayEntries.forEach((entry) => {
        items.push({
          name: entry.name,
          type: entry.isDirectory() ? "dir" : "file",
          isDirectory: entry.isDirectory()
        });
      });
    }
    if (truncated) {
      output += `

... and ${entries.length - maxEntries} more items`;
    }
    const summary = `Listed ${entries.length} items in ${targetPath}`;
    return {
      success: true,
      output: output || "Empty directory",
      data: {
        path: targetPath,
        count: entries.length,
        items
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}).build();
var index_default = listTool;
export {
  index_default as default
};
