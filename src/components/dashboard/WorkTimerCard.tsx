import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Play, Pause, Square, Clock, Timer } from "lucide-react";
import { useWorkSession, WorkSession } from "@/hooks/useWorkSession";
import { format } from "date-fns";

interface WorkTimerCardProps {
  currentDate: Date;
}

export function WorkTimerCard({ currentDate }: WorkTimerCardProps) {
  const {
    activeSession,
    elapsedSeconds,
    formatTime,
    getSessionsForDate,
    startSession,
    pauseSession,
    resumeSession,
    finishSession,
  } = useWorkSession();

  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  const sessionsForDay = getSessionsForDate(currentDate);
  const totalWorkedToday = sessionsForDay.reduce((sum, s) => sum + s.total_worked_seconds, 0);

  const handleStart = () => {
    startSession.mutate();
  };

  const handlePause = () => {
    pauseSession.mutate();
  };

  const handleResume = () => {
    resumeSession.mutate();
  };

  const handleFinishClick = () => {
    setTargetDate(new Date());
    setShowFinishDialog(true);
  };

  const handleConfirmFinish = () => {
    finishSession.mutate(targetDate, {
      onSuccess: () => setShowFinishDialog(false),
    });
  };

  return (
    <>
      <Card variant="elevated" className={activeSession ? "border-primary/30" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Tempo de Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Timer Display */}
          {activeSession ? (
            <div className="text-center space-y-3">
              <div className={`text-4xl font-mono font-bold ${activeSession.status === "paused" ? "text-muted-foreground animate-pulse" : "text-primary"}`}>
                {formatTime(elapsedSeconds)}
              </div>
              <p className="text-xs text-muted-foreground">
                {activeSession.status === "paused" ? "Pausado" : "Em andamento"} • Início: {format(new Date(activeSession.started_at), "HH:mm")}
              </p>
              <div className="flex gap-2 justify-center">
                {activeSession.status === "running" ? (
                  <Button variant="outline" size="sm" onClick={handlePause} disabled={pauseSession.isPending}>
                    <Pause className="w-4 h-4 mr-1" /> Pausar
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleResume} disabled={resumeSession.isPending}>
                    <Play className="w-4 h-4 mr-1" /> Retomar
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={handleFinishClick}>
                  <Square className="w-4 h-4 mr-1" /> Finalizar
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <Button onClick={handleStart} disabled={startSession.isPending} className="w-full">
                <Play className="w-4 h-4 mr-2" /> Iniciar Timer
              </Button>
            </div>
          )}

          {/* Today's Summary */}
          {(totalWorkedToday > 0 || sessionsForDay.length > 0) && (
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Hoje ({format(currentDate, "dd/MM")})
                </span>
                <span className="font-bold text-primary">{formatTime(totalWorkedToday)}</span>
              </div>
              {sessionsForDay.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {sessionsForDay.length} {sessionsForDay.length === 1 ? "sessão" : "sessões"} finalizadas
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finish Dialog */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar Sessão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-primary">
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinishDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmFinish} disabled={finishSession.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
