// ../tool-repo/src/index.ts
import { createTool, ToolCategory } from "@ziggler/clanker";
var todoList = [];
function generateTodoSummary() {
  if (todoList.length === 0) {
    return "No todos";
  }
  const byStatus = {
    pending: todoList.filter((t) => t.status === "pending"),
    in_progress: todoList.filter((t) => t.status === "in_progress"),
    completed: todoList.filter((t) => t.status === "completed")
  };
  const lines = [];
  const urgent = [...byStatus.pending, ...byStatus.in_progress].filter((t) => t.priority === "high").sort((a, b) => {
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (a.status !== "in_progress" && b.status === "in_progress") return 1;
    return 0;
  });
  if (urgent.length > 0) {
    lines.push("\u{1F534} High Priority:");
    urgent.forEach((todo) => {
      const statusIcon = todo.status === "in_progress" ? "\u{1F504}" : "\u23F3";
      lines.push(`  ${statusIcon} [${todo.id}] ${todo.content}`);
    });
    lines.push("");
  }
  const other = [...byStatus.pending, ...byStatus.in_progress].filter((t) => t.priority !== "high").sort((a, b) => {
    if (a.priority === "medium" && b.priority === "low") return -1;
    if (a.priority === "low" && b.priority === "medium") return 1;
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (a.status !== "in_progress" && b.status === "in_progress") return 1;
    return 0;
  });
  if (other.length > 0) {
    lines.push("\u{1F4CB} Other Tasks:");
    other.forEach((todo) => {
      const statusIcon = todo.status === "in_progress" ? "\u{1F504}" : "\u23F3";
      const priorityIcon = todo.priority === "medium" ? "\u{1F7E1}" : "\u{1F7E2}";
      lines.push(`  ${statusIcon} ${priorityIcon} [${todo.id}] ${todo.content}`);
    });
    lines.push("");
  }
  if (byStatus.completed.length > 0) {
    lines.push(`\u2705 Completed (${byStatus.completed.length}):`);
    byStatus.completed.slice(0, 5).forEach((todo) => {
      lines.push(`  \u2713 [${todo.id}] ${todo.content}`);
    });
    if (byStatus.completed.length > 5) {
      lines.push(`  ... and ${byStatus.completed.length - 5} more`);
    }
  }
  lines.push("");
  lines.push(`Total: ${todoList.length} | Pending: ${byStatus.pending.length} | In Progress: ${byStatus.in_progress.length} | Completed: ${byStatus.completed.length}`);
  return lines.join("\n");
}
var index_default = createTool().id("create_todo_list").name("Create Todo List").description("Create a new todo list for planning and tracking tasks").category(ToolCategory.Task).capabilities().tags("todo", "task", "planning", "tracking").arrayArg("todos", "Array of todo items", {
  required: true,
  validate: (todos) => {
    if (!Array.isArray(todos)) {
      return "Todos must be an array";
    }
    const ids = /* @__PURE__ */ new Set();
    for (const todo of todos) {
      if (!todo || typeof todo !== "object") {
        return "Each todo must be an object";
      }
      const typedTodo = todo;
      if (!typedTodo.id || typeof typedTodo.id !== "string") {
        return "Each todo must have a string id";
      }
      if (ids.has(typedTodo.id)) {
        return `Duplicate todo id: ${typedTodo.id}`;
      }
      ids.add(typedTodo.id);
      if (!typedTodo.content || typeof typedTodo.content !== "string") {
        return "Each todo must have content";
      }
      if (!typedTodo.status || !["pending", "in_progress", "completed"].includes(typedTodo.status)) {
        return "Each todo status must be pending, in_progress, or completed";
      }
      if (!typedTodo.priority || !["high", "medium", "low"].includes(typedTodo.priority)) {
        return "Each todo priority must be high, medium, or low";
      }
    }
    return true;
  }
}).examples([
  {
    description: "Create a todo list with two tasks",
    arguments: {
      todos: [
        {
          id: "1",
          content: "Read all the files in the project",
          status: "pending",
          priority: "high"
        },
        {
          id: "2",
          content: "Synthesize the important files",
          status: "pending",
          priority: "medium"
        }
      ]
    },
    result: "Created todo list with 2 items"
  },
  {
    description: "Create an empty todo list",
    arguments: {
      todos: []
    },
    result: "Created todo list with 0 items"
  }
]).execute(async (args, context) => {
  var _a, _b;
  const { todos } = args;
  (_a = context.logger) == null ? void 0 : _a.debug(`Creating todo list with ${todos.length} items`);
  todoList = todos.map((todo) => ({
    id: todo.id,
    content: todo.content,
    status: todo.status,
    priority: todo.priority
  }));
  const summary = generateTodoSummary();
  (_b = context.logger) == null ? void 0 : _b.info(`Created todo list with ${todoList.length} items`);
  return {
    success: true,
    output: `Created todo list with ${todoList.length} items:

${summary}`,
    data: { todos: todoList }
  };
}).build();
export {
  index_default as default,
  todoList
};
