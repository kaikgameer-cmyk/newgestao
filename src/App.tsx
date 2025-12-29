import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
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
import Competitions from "./pages/Competitions";
import CompetitionDetails from "./pages/CompetitionDetails";
import JoinCompetition from "./pages/JoinCompetition";
import Ranking from "./pages/Ranking";
import TestCompetitionMessages from "./pages/TestCompetitionMessages";
import Support from "./pages/Support";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
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
              <Route
                path="admin/testes-competicoes"
                element={<TestCompetitionMessages />}
              />
              <Route path="competicoes" element={<Competitions />} />
              <Route path="competicoes/entrar" element={<JoinCompetition />} />
              <Route path="competicoes/ranking" element={<Ranking />} />
              <Route path="competicoes/:id" element={<CompetitionDetails />} />
              <Route path="suporte" element={<Support />} />
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
