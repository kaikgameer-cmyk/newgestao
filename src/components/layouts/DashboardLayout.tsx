import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  CreditCard,
  Fuel,
  Repeat,
  Settings,
  LogOut,
  Menu,
  X,
  Crown,
  Shield,
  Book,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { SubscriptionPaywall } from "@/components/SubscriptionPaywall";
import { Badge } from "@/components/ui/badge";

export default function DashboardLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Subscription hook
  const { 
    subscription, 
    isActive: subscriptionIsActive, 
    isPastDue, 
    isCanceled, 
    hasSubscription, 
    isLoading: subscriptionLoading,
    daysRemaining 
  } = useSubscription();

  // Admin hook - use the optimized version
  const { isAdmin, isLoading: adminLoading, isFetched: adminFetched } = useIsAdmin();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Check subscription status and show paywall if needed
  useEffect(() => {
    if (!subscriptionLoading && user) {
      if (!hasSubscription || (!subscriptionIsActive && !isPastDue)) {
        setShowPaywall(true);
      } else if (isPastDue) {
        setShowPaywall(true);
      } else {
        setShowPaywall(false);
      }
    }
  }, [subscriptionLoading, hasSubscription, subscriptionIsActive, isPastDue, isCanceled, user]);

  // Get paywall reason
  const getPaywallReason = (): "expired" | "past_due" | "canceled" | "no_subscription" => {
    if (!hasSubscription) return "no_subscription";
    if (isCanceled) return "canceled";
    if (isPastDue) return "past_due";
    return "expired";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Build nav items - always include admin if user is admin (once fetched)
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Calendar, label: "Relatórios Semanais", path: "/dashboard/semanal" },
    { icon: Receipt, label: "Lançamentos", path: "/dashboard/lancamentos" },
    { icon: CreditCard, label: "Cartões", path: "/dashboard/cartoes" },
    { icon: Fuel, label: "Combustível", path: "/dashboard/combustivel" },
    { icon: Repeat, label: "Despesas Fixas", path: "/dashboard/despesas-fixas" },
    { icon: Crown, label: "Assinatura", path: "/dashboard/assinatura" },
    { icon: Book, label: "Guia da Plataforma", path: "/dashboard/guia" },
    { icon: Settings, label: "Configurações", path: "/dashboard/configuracoes" },
  ];

  // Add admin link if user is admin
  if (adminFetched && isAdmin) {
    navItems.push({ icon: Shield, label: "Admin", path: "/dashboard/admin" });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={logo} alt="Driver Control" className="w-8 h-8" />
              <span className="font-semibold text-sidebar-foreground">Driver Control</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isItemActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isItemActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Subscription status */}
          {!subscriptionLoading && hasSubscription && subscriptionIsActive && (
            <div className="px-4 py-2 border-t border-sidebar-border">
              <div className="flex items-center gap-2 text-xs">
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span className="text-sidebar-foreground">
                  {subscription?.plan_name}
                </span>
                {daysRemaining <= 7 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 border-yellow-500 text-yellow-500">
                    {daysRemaining}d
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-sidebar-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Subscription Paywall */}
      <SubscriptionPaywall 
        open={showPaywall} 
        reason={getPaywallReason()}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="Driver Control" className="w-8 h-8" />
          </Link>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
