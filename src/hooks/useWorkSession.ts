// Re-export from TimerContext for backward compatibility
// This file is kept for components that still import from here
export { useTimer as useWorkSession } from "@/contexts/TimerContext";
export type { WorkSession, WorkSessionPause } from "@/contexts/TimerContext";
