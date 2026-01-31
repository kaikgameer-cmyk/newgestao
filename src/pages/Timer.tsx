import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Play, Pause, Square, History, Trash2, Timer as TimerIcon } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
import { useDailyWorkSummary } from "@/hooks/useDailyWorkSummary";
import { format } from "date-fns";

export default function TimerPage() {
  const {
    sessions,
    activeSession,
    elapsedSeconds,
    formatTime,
    startSession,
    pauseSession,
    resumeSession,
    finishSession,
    deleteSession,
  } = useTimer();

  const { addWorkedMinutes } = useDailyWorkSummary();
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  // Get finished sessions (last 20)
  const finishedSessions = sessions
    .filter((s) => s.status === "finished")
    .slice(0, 20);

  const handleStart = () => {
    startSession.mutate();
  };

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

  const handleDeleteSession = (sessionId: string) => {
    if (confirm("Deseja remover esta sessão?")) {
      deleteSession.mutate(sessionId);
    }
  };

  const isRunning = activeSession?.status === "running";
  const isPaused = activeSession?.status === "paused";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Timer</h1>
        <p className="text-muted-foreground">
          Controle seu tempo de trabalho
        </p>
      </div>

      {/* Main Timer Card */}
      <Card variant="elevated" className={activeSession ? "border-primary/30" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TimerIcon className="w-5 h-5 text-primary" />
            Timer de Trabalho
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center py-8">
            <div className={`text-6xl sm:text-7xl font-mono font-bold ${
              isPaused 
                ? "text-muted-foreground animate-pulse" 
                : activeSession 
                  ? "text-primary" 
                  : "text-muted-foreground"
            }`}>
              {formatTime(elapsedSeconds)}
            </div>
            {activeSession && (
              <p className="text-sm text-muted-foreground mt-3">
                {isPaused ? "Pausado" : "Em andamento"} • 
                Início: {format(new Date(activeSession.started_at), "HH:mm")}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3 flex-wrap">
            {!activeSession ? (
              <Button 
                size="lg" 
                onClick={handleStart} 
                disabled={startSession.isPending}
                className="px-8"
              >
                <Play className="w-5 h-5 mr-2" /> 
                Iniciar
              </Button>
            ) : (
              <>
                {isRunning ? (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => pauseSession.mutate()}
                    disabled={pauseSession.isPending}
                    className="px-6"
                  >
                    <Pause className="w-5 h-5 mr-2" /> 
                    Pausar
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => resumeSession.mutate()}
                    disabled={resumeSession.isPending}
                    className="px-6"
                  >
                    <Play className="w-5 h-5 mr-2" /> 
                    Continuar
                  </Button>
                )}
                <Button 
                  size="lg" 
                  variant="destructive"
                  onClick={handleFinishClick}
                  className="px-6"
                >
                  <Square className="w-5 h-5 mr-2" /> 
                  Finalizar
                </Button>
              </>
            )}
          </div>

          {activeSession && (
            <p className="text-center text-sm text-muted-foreground">
              💡 O mini-widget na parte inferior permite pausar/retomar com um clique em qualquer página.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Session History */}
      {finishedSessions.length > 0 && (
        <Card variant="elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Sessões Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {finishedSessions.map((session) => {
                const hours = Math.floor(session.total_worked_seconds / 3600);
                const minutes = Math.floor((session.total_worked_seconds % 3600) / 60);
                
                return (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(session.date + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`} trabalhados
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-primary">
                        {formatTime(session.total_worked_seconds)}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
