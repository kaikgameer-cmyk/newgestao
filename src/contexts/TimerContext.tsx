import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatLocalDate } from "@/lib/dateUtils";
import { toast } from "sonner";

export interface WorkSession {
  id: string;
  user_id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  total_worked_seconds: number;
  total_paused_seconds: number;
  status: "running" | "paused" | "finished";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkSessionPause {
  id: string;
  session_id: string;
  user_id: string;
  paused_at: string;
  resumed_at: string | null;
  created_at: string;
}

type PopupState = "hidden" | "open" | "minimized";

interface TimerContextValue {
  // State
  sessions: WorkSession[];
  isLoading: boolean;
  activeSession: WorkSession | null;
  elapsedSeconds: number;
  pauseElapsed: number;
  popupState: PopupState;
  
  // Actions
  formatTime: (seconds: number) => string;
  getSessionsForDate: (date: Date) => WorkSession[];
  startSession: ReturnType<typeof useMutation<WorkSession, Error, void>>;
  pauseSession: ReturnType<typeof useMutation<void, Error, void>>;
  resumeSession: ReturnType<typeof useMutation<void, Error, void>>;
  finishSession: ReturnType<typeof useMutation<void, Error, Date>>;
  deleteSession: ReturnType<typeof useMutation<void, Error, string>>;
  
  // Popup control
  openPopup: () => void;
  minimizePopup: () => void;
  closePopup: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauseElapsed, setPauseElapsed] = useState(0);
  const [popupState, setPopupState] = useState<PopupState>("hidden");

  // Fetch all work sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["work_sessions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data as WorkSession[];
    },
    enabled: !!user,
  });

  // Find active session (running or paused)
  const activeSession = sessions.find(
    (s) => s.status === "running" || s.status === "paused"
  ) || null;

  // Fetch pauses for active session
  const { data: activePauses = [] } = useQuery({
    queryKey: ["work_session_pauses", activeSession?.id],
    queryFn: async () => {
      if (!activeSession) return [];
      const { data, error } = await supabase
        .from("work_session_pauses")
        .select("*")
        .eq("session_id", activeSession.id)
        .order("paused_at", { ascending: true });
      if (error) throw error;
      return data as WorkSessionPause[];
    },
    enabled: !!activeSession,
  });

  // Auto-show minimized widget if there's an active session
  useEffect(() => {
    if (activeSession && popupState === "hidden") {
      setPopupState("minimized");
    }
    if (!activeSession && popupState !== "hidden") {
      setPopupState("hidden");
    }
  }, [activeSession?.id]);

  // Calculate elapsed time using timestamp-based approach (drift-free)
  const calculateElapsed = useCallback(() => {
    if (!activeSession) {
      setElapsedSeconds(0);
      setPauseElapsed(0);
      return;
    }

    const now = new Date();
    const startedAt = new Date(activeSession.started_at);
    const totalSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

    // Calculate total paused time
    let totalPausedSeconds = activeSession.total_paused_seconds;
    
    // If currently paused, add current pause duration
    if (activeSession.status === "paused") {
      const currentPause = activePauses.find((p) => !p.resumed_at);
      if (currentPause) {
        const pausedAt = new Date(currentPause.paused_at);
        const currentPauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
        setPauseElapsed(currentPauseDuration);
        totalPausedSeconds += currentPauseDuration;
      }
    } else {
      setPauseElapsed(0);
    }

    setElapsedSeconds(Math.max(0, totalSeconds - totalPausedSeconds));
  }, [activeSession, activePauses]);

  // Timer effect - runs every second
  useEffect(() => {
    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [calculateElapsed]);

  // Handle visibility change - recalculate when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        calculateElapsed();
        // Refetch data to ensure sync
        queryClient.invalidateQueries({ queryKey: ["work_sessions"] });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [calculateElapsed, queryClient]);

  // Start new session
  const startSession = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (activeSession) throw new Error("Já existe uma sessão ativa");

      const { data, error } = await supabase
        .from("work_sessions")
        .insert({
          user_id: user.id,
          date: formatLocalDate(new Date()),
          started_at: new Date().toISOString(),
          status: "running",
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_sessions"] });
      setPopupState("open");
      toast.success("Timer iniciado!");
    },
    onError: (error) => {
      toast.error("Erro ao iniciar: " + error.message);
    },
  });

  // Pause session
  const pauseSession = useMutation({
    mutationFn: async () => {
      if (!user || !activeSession) throw new Error("Sem sessão ativa");
      if (activeSession.status !== "running") throw new Error("Sessão não está rodando");

      const { error: pauseError } = await supabase
        .from("work_session_pauses")
        .insert({
          session_id: activeSession.id,
          user_id: user.id,
          paused_at: new Date().toISOString(),
        });

      if (pauseError) throw pauseError;

      const { error } = await supabase
        .from("work_sessions")
        .update({
          status: "paused",
          total_worked_seconds: elapsedSeconds,
        })
        .eq("id", activeSession.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["work_session_pauses"] });
      toast.info("Timer pausado");
    },
    onError: (error) => {
      toast.error("Erro ao pausar: " + error.message);
    },
  });

  // Resume session
  const resumeSession = useMutation({
    mutationFn: async () => {
      if (!user || !activeSession) throw new Error("Sem sessão ativa");
      if (activeSession.status !== "paused") throw new Error("Sessão não está pausada");

      const currentPause = activePauses.find((p) => !p.resumed_at);
      if (currentPause) {
        const { error: pauseError } = await supabase
          .from("work_session_pauses")
          .update({ resumed_at: new Date().toISOString() })
          .eq("id", currentPause.id);

        if (pauseError) throw pauseError;
      }

      const { error } = await supabase
        .from("work_sessions")
        .update({
          status: "running",
          total_paused_seconds: activeSession.total_paused_seconds + pauseElapsed,
        })
        .eq("id", activeSession.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["work_session_pauses"] });
      toast.success("Timer retomado!");
    },
    onError: (error) => {
      toast.error("Erro ao retomar: " + error.message);
    },
  });

  // Finish session
  const finishSession = useMutation({
    mutationFn: async (targetDate: Date) => {
      if (!user || !activeSession) throw new Error("Sem sessão ativa");

      const currentPause = activePauses.find((p) => !p.resumed_at);
      let finalPausedSeconds = activeSession.total_paused_seconds;
      
      if (currentPause) {
        const now = new Date();
        const pausedAt = new Date(currentPause.paused_at);
        const pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
        finalPausedSeconds += pauseDuration;

        await supabase
          .from("work_session_pauses")
          .update({ resumed_at: now.toISOString() })
          .eq("id", currentPause.id);
      }

      const now = new Date();
      const startedAt = new Date(activeSession.started_at);
      const totalSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
      const finalWorkedSeconds = Math.max(0, totalSeconds - finalPausedSeconds);

      const { error } = await supabase
        .from("work_sessions")
        .update({
          status: "finished",
          ended_at: now.toISOString(),
          date: formatLocalDate(targetDate),
          total_worked_seconds: finalWorkedSeconds,
          total_paused_seconds: finalPausedSeconds,
        })
        .eq("id", activeSession.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_sessions"] });
      queryClient.invalidateQueries({ queryKey: ["work_session_pauses"] });
      setPopupState("hidden");
      toast.success("Sessão finalizada e salva!");
    },
    onError: (error) => {
      toast.error("Erro ao finalizar: " + error.message);
    },
  });

  // Delete session
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("work_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work_sessions"] });
      toast.success("Sessão removida!");
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  // Get sessions for a date
  const getSessionsForDate = (date: Date): WorkSession[] => {
    const dateStr = formatLocalDate(date);
    return sessions.filter((s) => s.date === dateStr && s.status === "finished");
  };

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Popup controls
  const openPopup = () => setPopupState("open");
  const minimizePopup = () => setPopupState("minimized");
  const closePopup = () => setPopupState(activeSession ? "minimized" : "hidden");

  return (
    <TimerContext.Provider
      value={{
        sessions,
        isLoading,
        activeSession,
        elapsedSeconds,
        pauseElapsed,
        popupState,
        formatTime,
        getSessionsForDate,
        startSession,
        pauseSession,
        resumeSession,
        finishSession,
        deleteSession,
        openPopup,
        minimizePopup,
        closePopup,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}

export function useTimerOptional() {
  return useContext(TimerContext);
}
