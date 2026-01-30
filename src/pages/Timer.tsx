import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, History, Trash2, Timer as TimerIcon } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
import { format } from "date-fns";

export default function TimerPage() {
  const {
    sessions,
    activeSession,
    elapsedSeconds,
    formatTime,
    startSession,
    deleteSession,
    openPopup,
  } = useTimer();

  // Get finished sessions (last 20)
  const finishedSessions = sessions
    .filter((s) => s.status === "finished")
    .slice(0, 20);

  const handleStart = () => {
    startSession.mutate();
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm("Deseja remover esta sessão?")) {
      deleteSession.mutate(sessionId);
    }
  };

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
              activeSession?.status === "paused" 
                ? "text-muted-foreground animate-pulse" 
                : activeSession 
                  ? "text-primary" 
                  : "text-muted-foreground"
            }`}>
              {formatTime(elapsedSeconds)}
            </div>
            {activeSession && (
              <p className="text-sm text-muted-foreground mt-3">
                {activeSession.status === "paused" ? "Pausado" : "Em andamento"} • 
                Início: {format(new Date(activeSession.started_at), "HH:mm")}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-3">
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
              <Button 
                size="lg" 
                variant="outline"
                onClick={openPopup}
                className="px-8"
              >
                <TimerIcon className="w-5 h-5 mr-2" /> 
                Ver Timer
              </Button>
            )}
          </div>

          {activeSession && (
            <p className="text-center text-sm text-muted-foreground">
              O timer está ativo. Clique em "Ver Timer" para controlar ou use o widget flutuante.
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
    </div>
  );
}
