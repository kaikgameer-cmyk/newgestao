import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Settings as SettingsIcon, Calendar, DollarSign, Loader2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PlatformSettings } from "@/components/settings/PlatformSettings";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [appsUsed, setAppsUsed] = useState("");
  const [startWeekDay, setStartWeekDay] = useState("monday");
  const [currency, setCurrency] = useState("BRL");

  // Fetch profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["settings-stats", user?.id],
    queryFn: async () => {
      if (!user) return { totalTransactions: 0, totalProfit: 0 };
      
      const [revenuesRes, expensesRes] = await Promise.all([
        supabase.from("revenues").select("amount").eq("user_id", user.id),
        supabase.from("expenses").select("amount").eq("user_id", user.id),
      ]);

      const totalRevenues = (revenuesRes.data || []).reduce((sum, r) => sum + Number(r.amount), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const totalTransactions = (revenuesRes.data?.length || 0) + (expensesRes.data?.length || 0);

      return {
        totalTransactions,
        totalProfit: totalRevenues - totalExpenses,
      };
    },
    enabled: !!user,
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setCity(profile.city || "");
      setAppsUsed(profile.apps_used?.join(", ") || "");
      setStartWeekDay(profile.start_week_day || "monday");
      setCurrency(profile.currency || "BRL");
    }
  }, [profile]);

  // Save profile mutation
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      
      const appsArray = appsUsed
        .split(",")
        .map((app) => app.trim())
        .filter((app) => app.length > 0);

      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          city: city || null,
          apps_used: appsArray.length > 0 ? appsArray : null,
          start_week_day: startWeekDay,
          currency,
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas configurações.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveProfile.mutate();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
  };

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), "MMMM yyyy", { locale: ptBR })
    : "—";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(value);
  };

  if (loadingProfile) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil e preferências
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Perfil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Sua cidade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apps">Apps que você usa</Label>
              <Input
                id="apps"
                value={appsUsed}
                onChange={(e) => setAppsUsed(e.target.value)}
                placeholder="Ex: Uber, 99, InDrive"
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula os apps que você trabalha
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Preferências</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Início da semana</Label>
              <Select value={startWeekDay} onValueChange={setStartWeekDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Segunda-feira</SelectItem>
                  <SelectItem value="sunday">Domingo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define quando começa sua semana de trabalho
              </p>
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (R$)</SelectItem>
                  <SelectItem value="USD">Dólar (US$)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Settings */}
      <PlatformSettings />

      {/* Quick Stats */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Resumo da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Membro desde</p>
                <p className="font-semibold capitalize">{memberSince}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total lançamentos</p>
                <p className="font-semibold">{stats?.totalTransactions || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <span className="text-success font-bold">$</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lucro total</p>
                <p className={`font-semibold ${(stats?.totalProfit || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(stats?.totalProfit || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={handleLogout} className="gap-2 text-destructive hover:text-destructive">
          <LogOut className="w-4 h-4" />
          Sair da conta
        </Button>
        <Button variant="hero" size="lg" onClick={handleSave} disabled={saveProfile.isPending}>
          {saveProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
