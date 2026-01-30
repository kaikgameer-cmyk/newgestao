import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
import { cn } from "@/lib/utils";

export function TimerMiniWidget() {
  const { activeSession, elapsedSeconds, popupState, formatTime, openPopup } = useTimer();

  if (popupState !== "minimized" || !activeSession) return null;

  const isRunning = activeSession.status === "running";

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={openPopup}
        className={cn(
          "fixed z-50 flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-card/95 backdrop-blur-sm border border-border shadow-lg",
          "cursor-pointer transition-colors hover:bg-card",
          // Desktop: bottom right
          "bottom-6 right-6",
          // Mobile: bottom center, above navigation
          "max-sm:bottom-20 max-sm:right-auto max-sm:left-1/2 max-sm:-translate-x-1/2"
        )}
      >
        {/* Status indicator dot */}
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            isRunning ? "bg-[hsl(var(--positive))] animate-pulse" : "bg-[hsl(var(--action))]"
          )}
        />
        
        {/* Timer icon */}
        <Timer className="w-4 h-4 text-primary" />
        
        {/* Time display */}
        <span
          className={cn(
            "font-mono font-bold text-sm",
            isRunning ? "text-primary" : "text-muted-foreground"
          )}
        >
          {formatTime(elapsedSeconds)}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
