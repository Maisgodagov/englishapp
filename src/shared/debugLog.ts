type DebugLogLevel = "info" | "warn" | "error";

interface DebugLogEntry {
  level: DebugLogLevel;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

const debugLogBuffer: DebugLogEntry[] = [];
const MAX_LOGS = 200;

export const addDebugLog = (
  level: DebugLogLevel,
  message: string,
  metadata?: Record<string, unknown>
) => {
  const entry: DebugLogEntry = {
    level,
    message,
    metadata,
    timestamp: Date.now(),
  };

  debugLogBuffer.push(entry);

  if (debugLogBuffer.length > MAX_LOGS) {
    debugLogBuffer.shift();
  }

  if (__DEV__) {
    const consoleFn =
      level === "error"
        ? console.error
        : level === "warn"
        ? console.warn
        : console.log;

    consoleFn("[DEBUG LOG]", level.toUpperCase(), message, metadata);
  }
};

export const getDebugLogs = () => [...debugLogBuffer];
