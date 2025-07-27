// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
var pwdTool = createTool().id("pwd").name("Print Working Directory").description("Get the current working directory path").category(ToolCategory.FileSystem).capabilities(ToolCapability.ReadOnlyOperation).tags("filesystem", "navigation", "directory", "pwd").examples([
  {
    description: "Get current working directory",
    arguments: {},
    result: "/Users/username/projects/my-app"
  }
]).execute(async (args, context) => {
  const cwd = process.cwd();
  return {
    success: true,
    output: cwd,
    data: { path: cwd }
  };
}).build();
var index_default = pwdTool;
export {
  index_default as default
};
