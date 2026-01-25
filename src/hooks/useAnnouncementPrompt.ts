import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserAnnouncements } from "@/hooks/useAnnouncements";

// Routes where announcements are SAFE to show
const SAFE_ROUTES = [
  "/dashboard",
  "/",
  "/dashboard/configuracoes",
  "/dashboard/assinatura",
];

// Routes where announcements should NEVER show
const CRITICAL_ROUTE_PATTERNS = [
  /\/dashboard\/lancamentos/,
  /\/dashboard\/combustivel/,
  /\/dashboard\/eletrico/,
  /\/dashboard\/metas/,
  /\/dashboard\/suporte/,
  /\/dashboard\/manutencao/,
  /\/dashboard\/cartoes/,
  /\/dashboard\/faturas/,
  /\/dashboard\/despesas-fixas/,
  /\/onboarding/,
  /\/login/,
  /\/definir-senha/,
  /\/reset-password/,
];

// Delay after login before showing popup
const LOGIN_DELAY_MS = 2000;

// Cooldown for X-closed announcements (24 hours)
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// LocalStorage key for dismissed announcements
const DISMISSED_KEY = "dismissed_announcements";

interface DismissedRecord {
  announcementId: string;
  dismissedAt: number;
}

function getDismissedRecords(): DismissedRecord[] {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as DismissedRecord[];
  } catch {
    return [];
  }
}

function setDismissedRecord(announcementId: string) {
  const records = getDismissedRecords().filter(r => r.announcementId !== announcementId);
  records.push({ announcementId, dismissedAt: Date.now() });
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(records));
}

function isRecentlyDismissed(announcementId: string): boolean {
  const records = getDismissedRecords();
  const record = records.find(r => r.announcementId === announcementId);
  if (!record) return false;
  return Date.now() - record.dismissedAt < DISMISS_COOLDOWN_MS;
}

export function useAnnouncementPrompt() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { pendingAnnouncement, isLoading: announcementLoading, ackAnnouncement } = useUserAnnouncements();

  const [isReady, setIsReady] = useState(false);
  const [wasLoggedIn, setWasLoggedIn] = useState(false);
  const [loginTimestamp, setLoginTimestamp] = useState<number | null>(null);

  // Check if current route is safe
  const isSafeRoute = useMemo(() => {
    const pathname = location.pathname;
    
    // Check critical patterns first
    for (const pattern of CRITICAL_ROUTE_PATTERNS) {
      if (pattern.test(pathname)) return false;
    }
    
    // Check if it's a known safe route
    return SAFE_ROUTES.some(route => 
      pathname === route || pathname.startsWith(route + "/")
    ) || pathname === "/dashboard";
  }, [location.pathname]);

  // Detect login
  useEffect(() => {
    if (!authLoading && user && !wasLoggedIn) {
      setWasLoggedIn(true);
      setLoginTimestamp(Date.now());
    } else if (!user) {
      setWasLoggedIn(false);
      setLoginTimestamp(null);
      setIsReady(false);
    }
  }, [user, authLoading, wasLoggedIn]);

  // Set ready after delay post-login
  useEffect(() => {
    if (loginTimestamp && isSafeRoute && !isReady) {
      const elapsed = Date.now() - loginTimestamp;
      const remaining = Math.max(0, LOGIN_DELAY_MS - elapsed);
      
      const timer = setTimeout(() => {
        setIsReady(true);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [loginTimestamp, isSafeRoute, isReady]);

  // Reset ready when navigating to unsafe route
  useEffect(() => {
    if (!isSafeRoute) {
      setIsReady(false);
    } else if (loginTimestamp && Date.now() - loginTimestamp >= LOGIN_DELAY_MS) {
      setIsReady(true);
    }
  }, [isSafeRoute, loginTimestamp]);

  // Determine if we should show the modal
  const shouldShowModal = useMemo(() => {
    if (!isReady) return false;
    if (!pendingAnnouncement) return false;
    if (announcementLoading) return false;
    if (!isSafeRoute) return false;
    if (isRecentlyDismissed(pendingAnnouncement.id)) return false;
    return true;
  }, [isReady, pendingAnnouncement, announcementLoading, isSafeRoute]);

  // Acknowledge (OK button)
  const acknowledgeAnnouncement = useCallback(async () => {
    if (!pendingAnnouncement) return;
    await ackAnnouncement.mutateAsync(pendingAnnouncement.id);
  }, [pendingAnnouncement, ackAnnouncement]);

  // Dismiss (X button) - just hide temporarily
  const dismissAnnouncement = useCallback(() => {
    if (!pendingAnnouncement) return;
    setDismissedRecord(pendingAnnouncement.id);
    // Force re-evaluation
    setIsReady(false);
    setTimeout(() => setIsReady(true), 100);
  }, [pendingAnnouncement]);

  return {
    shouldShowModal,
    announcement: pendingAnnouncement,
    acknowledgeAnnouncement,
    dismissAnnouncement,
    isSafeRoute,
    isAcking: ackAnnouncement.isPending,
  };
}
