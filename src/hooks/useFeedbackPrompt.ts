import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFeedback } from "@/hooks/useFeedback";

// Rotas seguras onde o popup pode aparecer
const SAFE_ROUTES = [
  "/dashboard",
  "/dashboard/configuracoes",
  "/dashboard/relatorios",
];

// Rotas críticas onde NUNCA pode aparecer (dentro de /dashboard)
const CRITICAL_ROUTE_PATTERNS = [
  /\/lancamentos/,
  /\/transactions/,
  /\/combustivel/,
  /\/fuel/,
  /\/metas/,
  /\/goals/,
  /\/cartoes/,
  /\/credit-cards/,
  /\/faturas/,
  /\/competicoes/,
  /\/competitions/,
  /\/ranking/,
  /\/entrar/,
  /\/join/,
  /\/checkout/,
  /\/assinatura/,
  /\/subscription/,
  /\/pagamento/,
  /\/suporte/,
  /\/support/,
  /\/onboarding/,
  /\/perfil/,
  /\/profile/,
  /\/timer/,
  /\/eletrico/,
  /\/electric/,
  /\/manutencao/,
  /\/maintenance/,
  /\/despesas-fixas/,
  /\/recurring/,
  /\/guia/,
  /\/guide/,
  /\/admin/,
];

// Delay após login antes de mostrar o popup (ms)
const LOGIN_DELAY_MS = 2000;

// Debug logging
const logDebug = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    console.log(`[FeedbackPrompt] ${message}`, data ?? "");
  }
};

export function useFeedbackPrompt() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { activeCampaign, userResponse, isLoadingCampaign, isLoadingResponse } = useFeedback();

  const [canShowPopup, setCanShowPopup] = useState(false);
  const [pendingPopup, setPendingPopup] = useState(false);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousAuthRef = useRef<boolean>(false);
  const mountedRef = useRef(true);

  // Verifica se a rota atual é segura
  const isSafeRoute = useCallback((pathname: string): boolean => {
    // Primeiro, verifica se é uma rota crítica
    const isCritical = CRITICAL_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
    if (isCritical) {
      logDebug("skipped: reason=critical_route", { pathname });
      return false;
    }

    // Depois, verifica se está na lista de rotas seguras
    const isSafe = SAFE_ROUTES.some((route) => {
      if (route === "/dashboard") return pathname === "/dashboard";
      return pathname.startsWith(route);
    });

    if (!isSafe) {
      logDebug("skipped: reason=not_safe_route", { pathname });
    }

    return isSafe;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
  }, []);

  // Detecta login e inicia delay
  useEffect(() => {
    if (!mountedRef.current) return;

    const wasAuthenticated = previousAuthRef.current;
    const isNowAuthenticated = !!user && !authLoading;
    previousAuthRef.current = isNowAuthenticated;

    // Se acabou de logar (transição de false -> true)
    if (!wasAuthenticated && isNowAuthenticated) {
      logDebug("login detected, starting delay timer");
      setPendingPopup(true);
      setCanShowPopup(false);

      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }

      delayTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        
        // Após delay, libera para exibição se estiver em rota segura
        if (isSafeRoute(location.pathname)) {
          logDebug("delay complete, route is safe, enabling popup");
          setCanShowPopup(true);
          setPendingPopup(false);
        } else {
          logDebug("delay complete, but route is not safe, keeping pending");
        }
      }, LOGIN_DELAY_MS);
    }
  }, [user, authLoading, location.pathname, isSafeRoute]);

  // Quando muda de rota, reavalia se pode mostrar popup pendente
  useEffect(() => {
    if (!mountedRef.current) return;

    if (!user || authLoading) {
      logDebug("skipped: reason=no_session");
      setCanShowPopup(false);
      setPendingPopup(false);
      return;
    }

    // Se há um popup pendente e agora está em rota segura
    if (pendingPopup && isSafeRoute(location.pathname)) {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }

      delayTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        logDebug("pending popup triggered on safe route");
        setCanShowPopup(true);
        setPendingPopup(false);
      }, 500);
    }

    // Se está em rota crítica, desativa imediatamente
    if (!isSafeRoute(location.pathname)) {
      setCanShowPopup(false);
    }
  }, [location.pathname, user, authLoading, pendingPopup, isSafeRoute]);

  // Determina se o modal deve ser exibido
  const shouldShowModal = 
    canShowPopup &&
    !!user &&
    !authLoading &&
    !isLoadingCampaign &&
    !isLoadingResponse &&
    !!activeCampaign &&
    !userResponse;

  // Log reason for not showing
  useEffect(() => {
    if (!shouldShowModal && canShowPopup) {
      if (!user) logDebug("skipped: reason=no_user");
      else if (authLoading) logDebug("skipped: reason=auth_loading");
      else if (isLoadingCampaign) logDebug("skipped: reason=loading_campaign");
      else if (isLoadingResponse) logDebug("skipped: reason=loading_response");
      else if (!activeCampaign) logDebug("skipped: reason=no_active_campaign");
      else if (userResponse) logDebug("skipped: reason=already_responded");
    }
  }, [shouldShowModal, canShowPopup, user, authLoading, isLoadingCampaign, isLoadingResponse, activeCampaign, userResponse]);

  // Função para adiar o popup
  const deferPopup = useCallback(() => {
    logDebug("popup deferred");
    setCanShowPopup(false);
    setPendingPopup(true);
  }, []);

  // Função para cancelar o popup completamente
  const cancelPopup = useCallback(() => {
    logDebug("popup cancelled");
    setCanShowPopup(false);
    setPendingPopup(false);
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
    }
  }, []);

  return {
    shouldShowModal,
    activeCampaign,
    deferPopup,
    cancelPopup,
    isSafeRoute: isSafeRoute(location.pathname),
  };
}
