import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./components/layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import WeeklyReports from "./pages/WeeklyReports";
import Transactions from "./pages/Transactions";
import CreditCards from "./pages/CreditCards";
import FuelControl from "./pages/FuelControl";
import RecurringExpenses from "./pages/RecurringExpenses";
import SettingsPage from "./pages/Settings";
import SubscriptionPage from "./pages/Subscription";
import AdminPage from "./pages/Admin";
import PlatformGuide from "./pages/PlatformGuide";
import Goals from "./pages/Goals";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());
  
  return (
    <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="semanal" element={<WeeklyReports />} />
            <Route path="lancamentos" element={<Transactions />} />
            <Route path="metas" element={<Goals />} />
            <Route path="cartoes" element={<CreditCards />} />
            <Route path="combustivel" element={<FuelControl />} />
            <Route path="despesas-fixas" element={<RecurringExpenses />} />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route path="assinatura" element={<SubscriptionPage />} />
            <Route path="guia" element={<PlatformGuide />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
