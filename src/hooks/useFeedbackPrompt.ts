import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFeedback } from "@/hooks/useFeedback";

// Rotas seguras onde o popup pode aparecer
const SAFE_ROUTES = [
  "/dashboard",
  "/", // se for dashboard após login
  "/configuracoes",
  "/settings",
  "/relatorios",
];

// Rotas críticas onde NUNCA pode aparecer
const CRITICAL_ROUTE_PATTERNS = [
  /^\/lancamentos/,
  /^\/transactions/,
  /^\/combustivel/,
  /^\/fuel/,
  /^\/metas/,
  /^\/goals/,
  /^\/cartoes/,
  /^\/credit-cards/,
  /^\/card-invoices/,
  /^\/faturas/,
  /^\/competitions/,
  /^\/ranking/,
  /^\/join/,
  /^\/checkout/,
  /^\/subscription/,
  /^\/assinatura/,
  /^\/pagamento/,
  /^\/suporte/,
  /^\/support/,
  /^\/onboarding/,
  /^\/perfil/,
  /^\/profile/,
  /^\/timer/,
  /^\/electric/,
  /^\/maintenance/,
  /^\/recurring/,
  /^\/guide/,
  /^\/admin/,
  /^\/login/,
  /^\/reset-password/,
  /^\/definir-senha/,
];

// Delay após login antes de mostrar o popup (ms)
const LOGIN_DELAY_MS = 2000;

export function useFeedbackPrompt() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { activeCampaign, userResponse, isLoadingCampaign, isLoadingResponse } = useFeedback();

  const [canShowPopup, setCanShowPopup] = useState(false);
  const [pendingPopup, setPendingPopup] = useState(false);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousAuthRef = useRef<boolean>(false);

  // Verifica se a rota atual é segura
  const isSafeRoute = useCallback((pathname: string): boolean => {
    // Primeiro, verifica se é uma rota crítica
    const isCritical = CRITICAL_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
    if (isCritical) return false;

    // Depois, verifica se está na lista de rotas seguras
    return SAFE_ROUTES.some((route) => {
      if (route === "/") return pathname === "/";
      return pathname.startsWith(route);
    });
  }, []);

  // Limpa o timer ao desmontar
  useEffect(() => {
    return () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }
    };
  }, []);

  // Detecta login e inicia delay
  useEffect(() => {
    const wasAuthenticated = previousAuthRef.current;
    const isNowAuthenticated = !!user && !authLoading;
    previousAuthRef.current = isNowAuthenticated;

    // Se acabou de logar (transição de false -> true)
    if (!wasAuthenticated && isNowAuthenticated) {
      // Marca como pendente e inicia delay
      setPendingPopup(true);
      setCanShowPopup(false);

      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }

      delayTimerRef.current = setTimeout(() => {
        // Após delay, libera para exibição se estiver em rota segura
        if (isSafeRoute(location.pathname)) {
          setCanShowPopup(true);
          setPendingPopup(false);
        }
        // Se não estiver em rota segura, mantém pendente para tentar depois
      }, LOGIN_DELAY_MS);
    }
  }, [user, authLoading, location.pathname, isSafeRoute]);

  // Quando muda de rota, reavalia se pode mostrar popup pendente
  useEffect(() => {
    if (!user || authLoading) {
      setCanShowPopup(false);
      setPendingPopup(false);
      return;
    }

    // Se há um popup pendente e agora está em rota segura
    if (pendingPopup && isSafeRoute(location.pathname)) {
      // Aguarda um pequeno delay para a UI estabilizar
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
      }

      delayTimerRef.current = setTimeout(() => {
        setCanShowPopup(true);
        setPendingPopup(false);
      }, 500);
    }

    // Se está em rota crítica, desativa imediatamente
    if (!isSafeRoute(location.pathname)) {
      setCanShowPopup(false);
      // Não limpa pendingPopup - vai tentar de novo quando voltar para rota segura
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
    !userResponse; // Usuário ainda não respondeu esta campanha

  // Função para adiar o popup (ex: quando detecta modal aberto ou form sujo)
  const deferPopup = useCallback(() => {
    setCanShowPopup(false);
    setPendingPopup(true);
  }, []);

  // Função para cancelar o popup completamente (ex: após responder)
  const cancelPopup = useCallback(() => {
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
