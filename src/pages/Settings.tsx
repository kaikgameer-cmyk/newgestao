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

import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Settings as SettingsIcon, Calendar, DollarSign, Loader2, LogOut, Phone, MapPin, Mail, Camera, Car, Zap, Fuel, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PlatformSettings } from "@/components/settings/PlatformSettings";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { CompetitionHistory } from "@/components/settings/CompetitionHistory";
import { ExpenseCategorySettings } from "@/components/settings/ExpenseCategorySettings";
import { useVehicleType } from "@/hooks/useVehicleType";
import { z } from "zod";

// Validation schema for profile
const profileSchema = z.object({
  first_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  last_name: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  whatsapp: z
    .string()
    .min(10, "WhatsApp inválido")
    .regex(/^[\d\s\(\)\-\+]+$/, "Formato de telefone inválido"),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [startWeekDay, setStartWeekDay] = useState("monday");
  const [currency, setCurrency] = useState("BRL");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use the shared hook for vehicle type
  const { vehicleType, updateVehicleType, isLoading: loadingVehicleType } = useVehicleType();
  const [isUpdatingVehicleType, setIsUpdatingVehicleType] = useState(false);

  // Fetch profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, whatsapp, email, city, start_week_day, currency, name, avatar_url, vehicle_type")
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

  // Update form when profile loads (but not vehicle type - that comes from hook)
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setWhatsapp(profile.whatsapp || "");
      setCity(profile.city || "");
      setStartWeekDay(profile.start_week_day || "monday");
      setCurrency(profile.currency || "BRL");
    }
  }, [profile]);

  // Format WhatsApp input
  const formatWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsapp(formatWhatsApp(e.target.value));
  };

  // Save profile mutation
  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      
      // Validate fields
      const validation = profileSchema.safeParse({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        whatsapp: whatsapp.trim(),
        city: city.trim(),
      });

      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        throw new Error("Validação falhou");
      }

      setErrors({});

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          whatsapp: whatsapp.trim(),
          city: city.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`.trim(), // Keep legacy field updated
          start_week_day: startWeekDay,
          currency,
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-profile"] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-type"] });
      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
    },
    onError: (error) => {
      if (error.message !== "Validação falhou") {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar suas configurações.",
          variant: "destructive",
        });
      }
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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil e preferências
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Card */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Perfil</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="pb-4 border-b border-border">
              <Label className="flex items-center gap-2 mb-3">
                <Camera className="w-4 h-4 text-muted-foreground" />
                Foto do Perfil
              </Label>
              <AvatarUpload
                userId={user?.id || ""}
                currentAvatarUrl={profile?.avatar_url}
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                email={user?.email}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome *</Label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="João"
                  className={errors.first_name ? "border-destructive" : ""}
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Sobrenome *</Label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Silva"
                  className={errors.last_name ? "border-destructive" : ""}
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                WhatsApp *
              </Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="(11) 99999-9999"
                className={errors.whatsapp ? "border-destructive" : ""}
              />
              {errors.whatsapp && (
                <p className="text-xs text-destructive">{errors.whatsapp}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                value={user?.email || profile?.email || ""}
                readOnly
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Seu email não pode ser alterado
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Cidade *
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Paulo"
                className={errors.city ? "border-destructive" : ""}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
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

            {/* Vehicle Type */}
            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" />
                Tipo do Veículo
              </Label>
              <p className="text-xs text-muted-foreground">
                Define quais módulos e categorias aparecem no sistema
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (vehicleType === "fuel" || isUpdatingVehicleType) return;
                    setIsUpdatingVehicleType(true);
                    try {
                      await updateVehicleType.mutateAsync("fuel");
                      toast({
                        title: "Preferência atualizada",
                        description: "Modo Combustível ativado. A categoria Elétrico será ocultada.",
                      });
                    } catch {
                      toast({
                        title: "Erro ao atualizar",
                        description: "Não foi possível salvar a preferência.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsUpdatingVehicleType(false);
                    }
                  }}
                  disabled={isUpdatingVehicleType || loadingVehicleType}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors ${
                    vehicleType === "fuel"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-accent hover:text-accent-foreground"
                  } ${isUpdatingVehicleType ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {isUpdatingVehicleType ? (
                    <Loader2 className="w-6 h-6 mb-1 animate-spin text-muted-foreground" />
                  ) : (
                    <Fuel className="w-6 h-6 mb-1 text-orange-500" />
                  )}
                  <span className="font-semibold text-sm">Combustível</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (vehicleType === "electric" || isUpdatingVehicleType) return;
                    setIsUpdatingVehicleType(true);
                    try {
                      await updateVehicleType.mutateAsync("electric");
                      toast({
                        title: "Preferência atualizada",
                        description: "Modo Elétrico ativado. A categoria Combustível será ocultada.",
                      });
                    } catch {
                      toast({
                        title: "Erro ao atualizar",
                        description: "Não foi possível salvar a preferência.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsUpdatingVehicleType(false);
                    }
                  }}
                  disabled={isUpdatingVehicleType || loadingVehicleType}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors ${
                    vehicleType === "electric"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-accent hover:text-accent-foreground"
                  } ${isUpdatingVehicleType ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {isUpdatingVehicleType ? (
                    <Loader2 className="w-6 h-6 mb-1 animate-spin text-muted-foreground" />
                  ) : (
                    <Zap className="w-6 h-6 mb-1 text-emerald-500" />
                  )}
                  <span className="font-semibold text-sm">Elétrico</span>
                </button>
              </div>

              <Alert variant="default" className="bg-muted/50 border-muted-foreground/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Ao mudar o tipo do veículo, a categoria oposta (Combustível/Elétrico) será ocultada nos novos lançamentos. Seus lançamentos antigos não serão apagados.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Settings */}
      <PlatformSettings />

      {/* Expense Category Settings */}
      <ExpenseCategorySettings />

      {/* Competition History */}
      <CompetitionHistory />

      {/* Quick Stats */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Resumo da Conta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="gap-2 text-destructive hover:text-destructive w-full sm:w-auto justify-center"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </Button>
        <Button
          variant="hero"
          size="lg"
          onClick={handleSave}
          disabled={saveProfile.isPending}
          className="w-full sm:w-auto justify-center"
        >
          {saveProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
