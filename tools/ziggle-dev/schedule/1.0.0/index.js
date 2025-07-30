// ../tool-repo/src/index.ts
import { createTool, ToolCategory, ToolCapability } from "@ziggler/clanker";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
var index_default = createTool().id("schedule").name("Schedule Task").description("Schedule a Clanker command to run after a delay. USE THIS instead of bash/sleep/at/cron commands for scheduling tasks, reminders, or delayed execution.").category(ToolCategory.System).capabilities(ToolCapability.SystemExecute).tags("schedule", "delay", "timer", "reminder", "cron", "later", "postpone", "defer").stringArg("task", 'The Clanker command to execute (e.g., "Use elevenlabs-tts to say Hello")', { required: true }).stringArg("when", 'When to execute: "10 seconds", "5 minutes", "2 hours", "3:30pm", etc.', { required: true }).examples([
  {
    description: "Remind me in 5 minutes to take a break",
    arguments: {
      task: 'Use elevenlabs-tts to say "Time to take a break!" with voice Rachel',
      when: "5 minutes"
    },
    result: "Task scheduled for 5 minutes from now"
  },
  {
    description: "Schedule a reminder for 30 seconds",
    arguments: {
      task: 'Use elevenlabs-tts to say "Your reminder is here" with voice Clyde',
      when: "30 seconds"
    },
    result: "Task scheduled for 30 seconds from now"
  },
  {
    description: "Set an alarm for 3:30pm",
    arguments: {
      task: 'Use elevenlabs-tts to say "It is now 3:30 PM" with voice Rachel',
      when: "3:30pm"
    },
    result: "Task scheduled for 3:30 PM"
  },
  {
    description: "Remind me to use the bathroom in 10 seconds",
    arguments: {
      task: 'Use elevenlabs-tts to say "Time to use the bathroom" with voice Rachel',
      when: "10 seconds"
    },
    result: "Task scheduled for 10 seconds from now"
  }
]).execute(async (args, context) => {
  var _a, _b, _c;
  const print = {
    success: (msg) => console.log(`\u2705 ${msg}`),
    info: (msg) => console.log(`\u2139\uFE0F  ${msg}`),
    error: (msg) => console.error(`\u274C ${msg}`)
  };
  const now = /* @__PURE__ */ new Date();
  let delayMs;
  const whenLower = args.when.toLowerCase();
  if (whenLower.includes("second")) {
    const seconds = parseInt(((_a = whenLower.match(/(\d+)\s*second/)) == null ? void 0 : _a[1]) || "1");
    delayMs = seconds * 1e3;
  } else if (whenLower.includes("minute")) {
    const minutes = parseInt(((_b = whenLower.match(/(\d+)\s*minute/)) == null ? void 0 : _b[1]) || "1");
    delayMs = minutes * 60 * 1e3;
  } else if (whenLower.includes("hour")) {
    const hours = parseInt(((_c = whenLower.match(/(\d+)\s*hour/)) == null ? void 0 : _c[1]) || "1");
    delayMs = hours * 60 * 60 * 1e3;
  } else if (whenLower === "now") {
    delayMs = 0;
  } else {
    const timeMatch = whenLower.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3];
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      const targetTime = new Date(now);
      targetTime.setHours(hours, minutes, 0, 0);
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      delayMs = targetTime.getTime() - now.getTime();
    } else {
      throw new Error(`Cannot parse time: ${args.when}`);
    }
  }
  const executionTime = new Date(now.getTime() + delayMs);
  print.success(`Task scheduled for: ${executionTime.toLocaleString()}`);
  print.info(`Will execute in ${Math.round(delayMs / 1e3)} seconds`);
  const scriptContent = `
const { spawn } = require('child_process');
const os = require('os');

// Wait for the specified time
setTimeout(() => {
  console.log('Executing scheduled task...');
  
  // Set up environment for proper audio handling
  const env = { ...process.env };
  
  // Spawn clanker with the task
  const clanker = spawn('clanker', ['-p', ${JSON.stringify(args.task)}], {
    stdio: 'inherit',
    env: env,
    cwd: process.cwd()
  });
  
  clanker.on('error', (err) => {
    console.error('Failed to execute clanker:', err);
    process.exit(1);
  });
  
  clanker.on('close', (code) => {
    console.log('Task completed with code:', code);
    process.exit(code || 0);
  });
}, ${delayMs});

console.log('Scheduler running in background...');
console.log('Scheduled for: ${executionTime.toISOString()}');
`;
  const scriptPath = path.join(os.tmpdir(), `clanker_schedule_${Date.now()}.js`);
  fs.writeFileSync(scriptPath, scriptContent);
  const child = spawn("node", [scriptPath], {
    detached: true,
    stdio: ["ignore", "ignore", "ignore"]
  });
  child.unref();
  print.success(`Background scheduler started (PID: ${child.pid})`);
  print.info(`
The task will execute at ${executionTime.toLocaleTimeString()}`);
  print.info(`You can close this terminal - the task will still run.`);
  setTimeout(() => {
    try {
      fs.unlinkSync(scriptPath);
    } catch (e) {
    }
  }, 5e3);
  return {
    success: true,
    output: `Task scheduled successfully! It will run at ${executionTime.toLocaleTimeString()}`,
    data: {
      scheduled: true,
      executionTime: executionTime.toISOString(),
      pid: child.pid
    }
  };
}).build();
export {
  index_default as default
};
