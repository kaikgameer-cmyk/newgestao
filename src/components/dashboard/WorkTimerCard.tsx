import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Clock, Timer } from "lucide-react";
import { useTimer } from "@/contexts/TimerContext";
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
    openPopup,
  } = useTimer();

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

  return (
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
            <button
              onClick={openPopup}
              className="block w-full text-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className={`text-4xl font-mono font-bold ${activeSession.status === "paused" ? "text-muted-foreground animate-pulse" : "text-primary"}`}>
                {formatTime(elapsedSeconds)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeSession.status === "paused" ? "Pausado" : "Em andamento"} • Início: {format(new Date(activeSession.started_at), "HH:mm")}
              </p>
            </button>
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
              <Button size="sm" variant="secondary" onClick={openPopup}>
                <Timer className="w-4 h-4 mr-1" /> Ver Timer
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
  );
}
