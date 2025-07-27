// ../tool-repo/src/index.ts
import { createTool, ToolCategory } from "@ziggler/clanker";
function getTodoList(context) {
  var _a;
  return ((_a = context.sharedState) == null ? void 0 : _a.get("todoList")) || [];
}
function setTodoList(context, todos) {
  var _a;
  (_a = context.sharedState) == null ? void 0 : _a.set("todoList", todos);
}
function generateTodoSummary(todoList) {
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
var index_default = createTool().id("update_todo_list").name("Update Todo List").description("Update existing todos in the todo list").category(ToolCategory.Task).capabilities().tags("todo", "task", "update", "modify").arrayArg("updates", "Array of todo updates", {
  required: true,
  validate: (updates) => {
    if (!Array.isArray(updates)) {
      return "Updates must be an array";
    }
    for (const update of updates) {
      if (!update || typeof update !== "object") {
        return "Each update must be an object";
      }
      const typedUpdate = update;
      if (!typedUpdate.id || typeof typedUpdate.id !== "string") {
        return "Each update must have a string id";
      }
      if (typedUpdate.status && !["pending", "in_progress", "completed"].includes(typedUpdate.status)) {
        return "Status must be pending, in_progress, or completed";
      }
      if (typedUpdate.priority && !["high", "medium", "low"].includes(typedUpdate.priority)) {
        return "Priority must be high, medium, or low";
      }
      if (typedUpdate.content && typeof typedUpdate.content !== "string") {
        return "Content must be a string";
      }
    }
    return true;
  }
}).examples([
  {
    description: "Mark a todo as completed",
    arguments: {
      updates: [
        {
          id: "1",
          status: "completed"
        }
      ]
    },
    result: "Updated 1 todo(s): 1"
  },
  {
    description: "Update multiple todos - mark one as in progress and another as completed",
    arguments: {
      updates: [
        {
          id: "1",
          status: "in_progress"
        },
        {
          id: "2",
          status: "completed",
          priority: "high"
        }
      ]
    },
    result: "Updated 2 todo(s): 1, 2"
  },
  {
    description: "Change todo content and priority",
    arguments: {
      updates: [
        {
          id: "1",
          content: "Read and understand all project files",
          priority: "high"
        }
      ]
    },
    result: "Updated 1 todo(s): 1"
  }
]).execute(async (args, context) => {
  var _a, _b, _c, _d;
  const { updates } = args;
  (_a = context.logger) == null ? void 0 : _a.debug(`Updating ${updates.length} todo items`);
  const currentTodoList = getTodoList(context);
  const updatedIds = [];
  const notFoundIds = [];
  for (const update of updates) {
    const todoIndex = currentTodoList.findIndex((todo) => todo.id === update.id);
    if (todoIndex === -1) {
      (_b = context.logger) == null ? void 0 : _b.warn(`Todo not found: ${update.id}`);
      notFoundIds.push(update.id);
      continue;
    }
    if (update.status) {
      currentTodoList[todoIndex].status = update.status;
    }
    if (update.priority) {
      currentTodoList[todoIndex].priority = update.priority;
    }
    if (update.content) {
      currentTodoList[todoIndex].content = update.content;
    }
    updatedIds.push(update.id);
    (_c = context.logger) == null ? void 0 : _c.debug(`Updated todo ${update.id}`);
  }
  const messages = [];
  if (updatedIds.length > 0) {
    messages.push(`Updated ${updatedIds.length} todo(s): ${updatedIds.join(", ")}`);
  }
  if (notFoundIds.length > 0) {
    messages.push(`Todo(s) not found: ${notFoundIds.join(", ")}`);
  }
  if (messages.length === 0) {
    messages.push("No updates performed");
  }
  setTodoList(context, currentTodoList);
  messages.push("");
  messages.push("Current todo list:");
  messages.push(generateTodoSummary(currentTodoList));
  (_d = context.logger) == null ? void 0 : _d.info(`Todo update completed: ${updatedIds.length} updated, ${notFoundIds.length} not found`);
  return {
    success: notFoundIds.length === 0,
    output: messages.join("\n"),
    data: { todos: currentTodoList, updated: updatedIds, notFound: notFoundIds }
  };
}).build();
export {
  index_default as default
};
