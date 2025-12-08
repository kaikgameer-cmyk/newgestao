import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { 
  Shield, 
  Users, 
  Crown, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCog,
  RefreshCw,
  Calendar,
  Mail,
  User,
  Clock,
  TrendingUp,
  BadgeCheck,
  Ban
} from "lucide-react";
import { Navigate } from "react-router-dom";

interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  billing_interval: string;
  status: string;
  current_period_end: string;
  created_at: string;
  kiwify_subscription_id: string;
  last_event: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  city: string | null;
  currency: string | null;
  apps_used: string[] | null;
  created_at: string;
}

interface UserWithData {
  user_id: string;
  profile: Profile | null;
  subscription: Subscription | null;
  isAdmin: boolean;
}

export default function AdminPage() {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("users");
  
  // Dialog states
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [createSubDialogOpen, setCreateSubDialogOpen] = useState(false);
  const [editSubDialogOpen, setEditSubDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithData | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formPlan, setFormPlan] = useState<"month" | "quarter" | "year">("year");
  const [formStatus, setFormStatus] = useState<"active" | "past_due" | "canceled">("active");
  const [formMonths, setFormMonths] = useState("12");
  const [formIsAdmin, setFormIsAdmin] = useState(false);

  // Fetch all profiles with subscriptions and admin status
  const { data: usersWithData = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subsError) throw subsError;

      // Get all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      // Combine data
      const usersMap = new Map<string, UserWithData>();
      
      profiles?.forEach(profile => {
        usersMap.set(profile.user_id, {
          user_id: profile.user_id,
          profile,
          subscription: subscriptions?.find(s => s.user_id === profile.user_id) || null,
          isAdmin: adminRoles?.some(r => r.user_id === profile.user_id) || false
        });
      });

      return Array.from(usersMap.values());
    },
    enabled: isAdmin,
  });

  // Stats calculations
  const totalUsers = usersWithData.length;
  const activeSubscriptions = usersWithData.filter(u => u.subscription?.status === "active").length;
  const pendingSubscriptions = usersWithData.filter(u => u.subscription?.status === "past_due").length;
  const canceledSubscriptions = usersWithData.filter(u => u.subscription?.status === "canceled").length;
  const noSubscription = usersWithData.filter(u => !u.subscription).length;
  const adminsCount = usersWithData.filter(u => u.isAdmin).length;

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, name, city }: { userId: string; name: string; city: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ name, city, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Perfil atualizado!" });
      setEditUserDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  });

  // Toggle admin role mutation
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, makeAdmin }: { userId: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .insert([{ user_id: userId, role: "admin" }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Permissão alterada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao alterar permissão", description: error.message, variant: "destructive" });
    }
  });

  // Create subscription mutation
  const createSubMutation = useMutation({
    mutationFn: async ({ userId, plan, status, months }: { userId: string; plan: string; status: string; months: number }) => {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + months);

      const planNames: Record<string, string> = {
        month: "Plano Mensal",
        quarter: "Plano Trimestral",
        year: "Plano Anual"
      };

      const { error } = await supabase
        .from("subscriptions")
        .insert([{
          user_id: userId,
          kiwify_subscription_id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          kiwify_product_id: "admin_created",
          plan_name: planNames[plan],
          billing_interval: plan as "month" | "quarter" | "year",
          status: status as "active" | "past_due" | "canceled",
          current_period_end: periodEnd.toISOString(),
          last_event: "admin_created"
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Assinatura criada!" });
      setCreateSubDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar assinatura", description: error.message, variant: "destructive" });
    }
  });

  // Update subscription mutation
  const updateSubMutation = useMutation({
    mutationFn: async ({ id, status, months, plan }: { id: string; status: string; months?: number; plan?: string }) => {
      const updateData: Record<string, unknown> = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (months && months > 0) {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + months);
        updateData.current_period_end = periodEnd.toISOString();
      }

      if (plan) {
        const planNames: Record<string, string> = {
          month: "Plano Mensal",
          quarter: "Plano Trimestral",
          year: "Plano Anual"
        };
        updateData.plan_name = planNames[plan];
        updateData.billing_interval = plan;
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Assinatura atualizada!" });
      setEditSubDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  });

  // Delete subscription mutation
  const deleteSubMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Assinatura removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  });

  // Delete user data mutation (profile + subscription)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete subscription first
      await supabase.from("subscriptions").delete().eq("user_id", userId);
      // Delete roles
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Delete profile
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      toast({ title: "Usuário removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" });
    }
  });

  const handleEditUser = (user: UserWithData) => {
    setSelectedUser(user);
    setFormName(user.profile?.name || "");
    setFormCity(user.profile?.city || "");
    setFormIsAdmin(user.isAdmin);
    setEditUserDialogOpen(true);
  };

  const handleCreateSubscription = (user: UserWithData) => {
    setSelectedUser(user);
    setFormPlan("year");
    setFormStatus("active");
    setFormMonths("12");
    setCreateSubDialogOpen(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setFormStatus(subscription.status as "active" | "past_due" | "canceled");
    setFormPlan(subscription.billing_interval as "month" | "quarter" | "year");
    setFormMonths("0");
    setEditSubDialogOpen(true);
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) {
      return <Badge variant="outline" className="text-muted-foreground"><Ban className="w-3 h-3 mr-1" />Sem assinatura</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Ativa</Badge>;
      case "past_due":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "canceled":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredUsers = usersWithData.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.profile?.name?.toLowerCase().includes(searchLower) ||
      user.profile?.city?.toLowerCase().includes(searchLower) ||
      user.subscription?.plan_name?.toLowerCase().includes(searchLower) ||
      user.user_id.toLowerCase().includes(searchLower)
    );
  });

  if (adminLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground text-sm">Gerenciamento completo de usuários e assinaturas</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetchUsers()}
          className="w-fit"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSubscriptions}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSubscriptions}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{canceledSubscriptions}</p>
                <p className="text-xs text-muted-foreground">Canceladas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Ban className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{noSubscription}</p>
                <p className="text-xs text-muted-foreground">Sem plano</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminsCount}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Usuários e Assinaturas</CardTitle>
              <CardDescription>Lista completa de todos os usuários do sistema</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cidade ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Assinatura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Válido até</TableHead>
                    <TableHead>Permissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Nenhum usuário encontrado</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{user.profile?.name || "Sem nome"}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.user_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{user.profile?.city || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{user.subscription?.plan_name || "-"}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.subscription?.status)}
                        </TableCell>
                        <TableCell>
                          {user.subscription?.current_period_end ? (
                            <span className="text-sm">
                              {format(new Date(user.subscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">
                              <Shield className="w-3 h-3 mr-1" />Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Usuário</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {/* Edit User */}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditUser(user)}
                              title="Editar usuário"
                            >
                              <UserCog className="w-4 h-4" />
                            </Button>

                            {/* Create/Edit Subscription */}
                            {user.subscription ? (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditSubscription(user.subscription!)}
                                title="Editar assinatura"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleCreateSubscription(user)}
                                title="Criar assinatura"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Delete User */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  title="Excluir usuário"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação irá remover permanentemente o perfil, assinatura e permissões do usuário "{user.profile?.name || 'Sem nome'}". Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteUserMutation.mutate(user.user_id)}
                                  >
                                    {deleteUserMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      "Excluir"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Alterar informações do perfil e permissões
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="Cidade"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Administrador</span>
              </div>
              <Button
                variant={formIsAdmin ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newValue = !formIsAdmin;
                  setFormIsAdmin(newValue);
                  if (selectedUser) {
                    toggleAdminMutation.mutate({ 
                      userId: selectedUser.user_id, 
                      makeAdmin: newValue 
                    });
                  }
                }}
                disabled={toggleAdminMutation.isPending}
              >
                {toggleAdminMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : formIsAdmin ? (
                  "Remover"
                ) : (
                  "Conceder"
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedUser) {
                  updateProfileMutation.mutate({
                    userId: selectedUser.user_id,
                    name: formName,
                    city: formCity
                  });
                }
              }}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Subscription Dialog */}
      <Dialog open={createSubDialogOpen} onOpenChange={setCreateSubDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Criar Assinatura
            </DialogTitle>
            <DialogDescription>
              Para: {selectedUser?.profile?.name || "Usuário"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={formPlan} onValueChange={(v) => setFormPlan(v as typeof formPlan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Plano Mensal</SelectItem>
                  <SelectItem value="quarter">Plano Trimestral</SelectItem>
                  <SelectItem value="year">Plano Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as typeof formStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="past_due">Pendente</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração (meses)</Label>
              <Input
                type="number"
                value={formMonths}
                onChange={(e) => setFormMonths(e.target.value)}
                min="1"
                max="24"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedUser) {
                  createSubMutation.mutate({
                    userId: selectedUser.user_id,
                    plan: formPlan,
                    status: formStatus,
                    months: parseInt(formMonths) || 12
                  });
                }
              }}
              disabled={createSubMutation.isPending}
            >
              {createSubMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={editSubDialogOpen} onOpenChange={setEditSubDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Assinatura
            </DialogTitle>
            <DialogDescription>
              {selectedSubscription?.plan_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={formPlan} onValueChange={(v) => setFormPlan(v as typeof formPlan)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Plano Mensal</SelectItem>
                  <SelectItem value="quarter">Plano Trimestral</SelectItem>
                  <SelectItem value="year">Plano Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as typeof formStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="past_due">Pendente</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estender por (meses)</Label>
              <Input
                type="number"
                value={formMonths}
                onChange={(e) => setFormMonths(e.target.value)}
                min="0"
                max="24"
                placeholder="0 para manter data atual"
              />
              <p className="text-xs text-muted-foreground">Deixe 0 para manter a data atual</p>
            </div>
            
            {/* Delete subscription option */}
            <div className="pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover Assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover assinatura?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá remover permanentemente a assinatura. O usuário perderá acesso ao sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        if (selectedSubscription) {
                          deleteSubMutation.mutate(selectedSubscription.id);
                          setEditSubDialogOpen(false);
                        }
                      }}
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (selectedSubscription) {
                  updateSubMutation.mutate({
                    id: selectedSubscription.id,
                    status: formStatus,
                    plan: formPlan,
                    months: parseInt(formMonths) || undefined
                  });
                }
              }}
              disabled={updateSubMutation.isPending}
            >
              {updateSubMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
