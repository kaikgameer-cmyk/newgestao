import { motion, AnimatePresence } from "framer-motion";
import { useTimer } from "@/contexts/TimerContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function TimerMiniWidget() {
  const { 
    activeSession, 
    elapsedSeconds, 
    popupState, 
    formatTime, 
    pauseSession,
    resumeSession 
  } = useTimer();

  // Show mini-widget when minimized AND there's an active session
  if (popupState !== "minimized" || !activeSession) return null;

  const isRunning = activeSession.status === "running";
  const isPaused = activeSession.status === "paused";

  const handleClick = () => {
    if (pauseSession.isPending || resumeSession.isPending) return;
    
    if (isRunning) {
      pauseSession.mutate();
    } else if (isPaused) {
      resumeSession.mutate();
    }
  };

  const startTime = format(new Date(activeSession.started_at), "HH:mm");

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={handleClick}
        disabled={pauseSession.isPending || resumeSession.isPending}
        className={cn(
          "fixed z-50 flex flex-col items-center px-4 py-2.5 rounded-full",
          "bg-card/95 backdrop-blur-sm border border-border shadow-lg",
          "cursor-pointer transition-all hover:bg-card/100",
          "select-none",
          // Desktop: bottom right
          "bottom-6 right-6",
          // Mobile: bottom center, above navigation
          "max-sm:bottom-20 max-sm:right-auto max-sm:left-1/2 max-sm:-translate-x-1/2",
          // Disabled state
          (pauseSession.isPending || resumeSession.isPending) && "opacity-70"
        )}
      >
        {/* Main time display */}
        <div className="flex items-center gap-2">
          {/* Status indicator dot */}
          <span
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              isRunning 
                ? "bg-[hsl(var(--positive))] animate-pulse" 
                : "bg-muted-foreground"
            )}
          />
          
          {/* Time display */}
          <span
            className={cn(
              "font-mono font-bold text-lg tabular-nums",
              isRunning ? "text-primary" : "text-muted-foreground"
            )}
          >
            {formatTime(elapsedSeconds)}
          </span>
        </div>
        
        {/* Status text */}
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {isPaused ? "Pausado" : "Em andamento"} • Início: {startTime}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
