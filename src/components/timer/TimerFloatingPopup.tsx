import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Play, Pause, Square, X, Minus, Timer } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
import { useDailyWorkSummary } from "@/hooks/useDailyWorkSummary";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function TimerFloatingPopup() {
  const {
    activeSession,
    elapsedSeconds,
    popupState,
    formatTime,
    pauseSession,
    resumeSession,
    finishSession,
    minimizePopup,
    closePopup,
  } = useTimer();

  const { addWorkedMinutes } = useDailyWorkSummary();
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  const handleFinishClick = () => {
    setTargetDate(new Date());
    setShowFinishDialog(true);
  };

  const handleConfirmFinish = async () => {
    const minutesWorked = Math.floor(elapsedSeconds / 60);
    
    await finishSession.mutateAsync(targetDate);
    
    if (minutesWorked > 0) {
      await addWorkedMinutes.mutateAsync({
        date: targetDate,
        minutesToAdd: minutesWorked,
      });
    }
    
    setShowFinishDialog(false);
  };

  if (popupState !== "open" || !activeSession) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed z-50 bg-card border border-border rounded-xl shadow-2xl",
            "bottom-4 right-4 w-80",
            "sm:bottom-6 sm:right-6",
            // Mobile: centered at bottom with safe area
            "max-sm:left-4 max-sm:right-4 max-sm:w-auto max-sm:bottom-20"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Timer de Trabalho</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={minimizePopup}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={closePopup}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="p-6 text-center">
            <div
              className={cn(
                "text-4xl font-mono font-bold transition-colors",
                activeSession.status === "paused"
                  ? "text-muted-foreground animate-pulse"
                  : "text-primary"
              )}
            >
              {formatTime(elapsedSeconds)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {activeSession.status === "paused" ? "Pausado" : "Em andamento"} •
              Início: {format(new Date(activeSession.started_at), "HH:mm")}
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-2 px-4 pb-4">
            {activeSession.status === "running" ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => pauseSession.mutate()}
                disabled={pauseSession.isPending}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pausar
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => resumeSession.mutate()}
                disabled={resumeSession.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Continuar
              </Button>
            )}
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleFinishClick}
            >
              <Square className="w-4 h-4 mr-2" />
              Finalizar
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Finish Dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-4xl font-mono font-bold text-primary">
                {formatTime(elapsedSeconds)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Tempo trabalhado
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Em qual dia deseja registrar?</p>
              <DatePicker
                date={targetDate}
                onDateChange={(date) => date && setTargetDate(date)}
              />
              <p className="text-xs text-muted-foreground">
                O tempo será somado às horas trabalhadas do dia selecionado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinishDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmFinish}
              disabled={finishSession.isPending || addWorkedMinutes.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
