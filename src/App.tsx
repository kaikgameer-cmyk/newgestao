import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { FeedbackErrorBoundary } from "@/components/feedback/FeedbackErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import DefinirSenha from "./pages/DefinirSenha";
import DashboardLayout from "./components/layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import OnboardingPage from "./pages/Onboarding";
import Transactions from "./pages/Transactions";
import CreditCards from "./pages/CreditCards";
import CardInvoices from "./pages/CardInvoices";
import FuelControl from "./pages/FuelControl";
import ElectricControl from "./pages/ElectricControl";
import Maintenance from "./pages/Maintenance";
import RecurringExpenses from "./pages/RecurringExpenses";
import SettingsPage from "./pages/Settings";
import SubscriptionPage from "./pages/Subscription";
import AdminPage from "./pages/Admin";
import PlatformGuide from "./pages/PlatformGuide";
import Goals from "./pages/Goals";
import TimerPage from "./pages/Timer";
import NotFound from "./pages/NotFound";
import Support from "./pages/Support";
import DeprecatedFeature from "./pages/DeprecatedFeature";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <FeedbackErrorBoundary>
            <FeedbackModal />
          </FeedbackErrorBoundary>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/definir-senha" element={<DefinirSenha />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />

              <Route path="lancamentos" element={<Transactions />} />
              <Route path="metas" element={<Goals />} />
              <Route path="cartoes" element={<CreditCards />} />
              <Route path="cartoes/:cardId/faturas" element={<CardInvoices />} />
              <Route path="combustivel" element={<FuelControl />} />
              <Route path="eletrico" element={<ElectricControl />} />
              <Route path="manutencao" element={<Maintenance />} />
              <Route path="despesas-fixas" element={<RecurringExpenses />} />
              <Route path="timer" element={<TimerPage />} />
              <Route path="configuracoes" element={<SettingsPage />} />
              <Route path="assinatura" element={<SubscriptionPage />} />
              <Route path="guia" element={<PlatformGuide />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="suporte" element={<Support />} />
              
              {/* Deprecated routes - redirect with message */}
              <Route path="competicoes" element={<DeprecatedFeature />} />
              <Route path="competicoes/*" element={<DeprecatedFeature />} />
              <Route path="ranking" element={<DeprecatedFeature />} />
              <Route path="admin/testes-competicoes" element={<DeprecatedFeature />} />
            </Route>
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
