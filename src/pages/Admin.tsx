import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { FeedbackAdminPanel } from "@/components/feedback/FeedbackAdminPanel";
import { AnnouncementsAdminPanel } from "@/components/admin/AnnouncementsAdminPanel";
import { RoleManagementModal } from "@/components/admin/RoleManagementModal";
import { AdminToolCard } from "@/components/admin/AdminToolCard";
import { useAllUserRoles, ROLE_LABELS, ROLE_COLORS, AppRole } from "@/hooks/useRoles";
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
  User,
  Ban,
  UserPlus,
  Mail,
  Send,
  Tags,
  Megaphone,
  MessageSquare
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { cn } from "@/lib/utils";

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

// Helper function to get months based on plan type
const getMonthsForPlan = (plan: string): number => {
  switch (plan) {
    case "month": return 1;
    case "quarter": return 3;
    case "year": return 12;
    default: return 1;
  }
};

// Helper function to get plan name from interval
const getPlanName = (plan: string): string => {
  switch (plan) {
    case "month": return "New Gestão - Mensal";
    case "quarter": return "New Gestão - Trimestral";
    case "year": return "New Gestão - Anual";
    default: return "New Gestão - Mensal";
  }
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading, isFetched: adminFetched } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [createSubDialogOpen, setCreateSubDialogOpen] = useState(false);
  const [editSubDialogOpen, setEditSubDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [roleManagementOpen, setRoleManagementOpen] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<UserWithData | null>(null);

  // Fetch all user roles
  const { data: allUserRoles = [] } = useAllUserRoles();
  const [selectedUser, setSelectedUser] = useState<UserWithData | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formPlan, setFormPlan] = useState<"month" | "quarter" | "year">("year");
  const [formStatus, setFormStatus] = useState<"active" | "past_due" | "canceled">("active");
  const [formIsAdmin, setFormIsAdmin] = useState(false);
  
  // Create user form states
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserCity, setNewUserCity] = useState("");
  const [createUserErrors, setCreateUserErrors] = useState<Record<string, string>>({});

  // Invalidate all relevant queries
  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
    queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
  };

  // Fetch all profiles with subscriptions and admin status
  const { data: usersWithData = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users-full"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("*");

      if (subsError) throw subsError;

      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

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
    enabled: adminFetched && isAdmin,
    staleTime: 0,
    refetchOnMount: true,
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
      invalidateAllQueries();
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
      invalidateAllQueries();
      toast({ title: "Permissão alterada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao alterar permissão", description: error.message, variant: "destructive" });
    }
  });

  // Create subscription mutation
  const createSubMutation = useMutation({
    mutationFn: async ({ userId, plan, status }: { userId: string; plan: string; status: string }) => {
      const months = getMonthsForPlan(plan);
      const periodEnd = addMonths(new Date(), months);

      const { error } = await supabase
        .from("subscriptions")
        .insert([{
          user_id: userId,
          kiwify_subscription_id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          kiwify_product_id: "admin_created",
          plan_name: getPlanName(plan),
          billing_interval: plan as "month" | "quarter" | "year",
          status: status as "active" | "past_due" | "canceled",
          current_period_end: periodEnd.toISOString(),
          last_event: "admin_created"
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllQueries();
      toast({ title: "Assinatura criada!" });
      setCreateSubDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar assinatura", description: error.message, variant: "destructive" });
    }
  });

  // Update subscription mutation
  const updateSubMutation = useMutation({
    mutationFn: async ({ id, status, plan, resetPeriod }: { id: string; status: string; plan?: string; resetPeriod?: boolean }) => {
      const updateData: Record<string, unknown> = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (plan) {
        const months = getMonthsForPlan(plan);
        const periodEnd = addMonths(new Date(), months);
        
        updateData.plan_name = getPlanName(plan);
        updateData.billing_interval = plan;
        updateData.current_period_end = periodEnd.toISOString();
        updateData.last_event = "admin_plan_change";
      } else if (resetPeriod) {
        const { data: currentSub } = await supabase
          .from("subscriptions")
          .select("billing_interval")
          .eq("id", id)
          .single();
        
        if (currentSub) {
          const months = getMonthsForPlan(currentSub.billing_interval);
          const periodEnd = addMonths(new Date(), months);
          updateData.current_period_end = periodEnd.toISOString();
        }
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllQueries();
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
      invalidateAllQueries();
      toast({ title: "Assinatura removida!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  });

  // Delete user data mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("subscriptions").delete().eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllQueries();
      toast({ title: "Usuário removido!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" });
    }
  });

  // Create user mutation
  const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    name: z.string().min(1, "Nome é obrigatório"),
  });

  const createUserMutation = useMutation({
    mutationFn: async ({ email, password, name, city }: { email: string; password: string; name: string; city: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Você precisa estar autenticado para criar usuários.");

      const response = await supabase.functions.invoke("create-user", {
        body: { email, password, name, city },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao criar usuário");
      }
      
      if (response.data?.ok === false || response.data?.error) {
        const err = new Error(response.data?.error || "Erro ao criar usuário");
        (err as any).code = response.data?.code;
        throw err;
      }
      
      return response.data;
    },
    onSuccess: async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      await refetchUsers();
      
      toast({ title: "Usuário criado com sucesso!", description: "O usuário já aparece na lista." });
      setCreateUserDialogOpen(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setNewUserCity("");
      setCreateUserErrors({});
    },
    onError: (error: Error & { code?: string }) => {
      let title = "Erro ao criar usuário";
      let description = error.message;
      
      if (error.code === "EMAIL_ALREADY_EXISTS" || error.message?.includes("já existe")) {
        title = "E-mail já cadastrado";
        description = "Já existe um usuário cadastrado com este e-mail.";
      }
      
      toast({ title, description, variant: "destructive" });
    }
  });

  // Test email mutation
  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke("send-test-email", { body: {} });
      if (response.error) throw new Error(response.error.message || "Erro ao enviar email");
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      toast({ title: "Email de teste enviado!", description: data.message || "Verifique sua caixa de entrada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao enviar email", description: error.message, variant: "destructive" });
    }
  });

  // Resend password link mutation
  const resendPasswordLinkMutation = useMutation({
    mutationFn: async ({ userId, skipSubscriptionCheck }: { userId: string; skipSubscriptionCheck?: boolean }) => {
      const response = await supabase.functions.invoke("resend-password-link", {
        body: { userId, skipSubscriptionCheck },
      });
      if (response.error) throw new Error(response.error.message || "Erro ao enviar link");
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: (data) => {
      toast({ title: "Link enviado!", description: data.message || "O usuário receberá o email." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao enviar link", description: error.message, variant: "destructive" });
    }
  });

  const handleCreateUser = () => {
    setCreateUserErrors({});
    const result = createUserSchema.safeParse({
      email: newUserEmail,
      password: newUserPassword,
      name: newUserName,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setCreateUserErrors(errors);
      return;
    }

    createUserMutation.mutate({
      email: newUserEmail,
      password: newUserPassword,
      name: newUserName,
      city: newUserCity,
    });
  };

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
    setCreateSubDialogOpen(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setFormStatus(subscription.status as "active" | "past_due" | "canceled");
    setFormPlan(subscription.billing_interval as "month" | "quarter" | "year");
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

  const getDaysRemaining = (periodEnd: string): number => {
    const end = new Date(periodEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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

  // Show loading while checking admin status
  if (adminLoading || !adminFetched) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground text-sm">Gerenciamento de usuários e ferramentas</p>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            size="sm" 
            onClick={() => testEmailMutation.mutate()}
            variant="outline"
            className="gap-2"
            disabled={testEmailMutation.isPending}
          >
            {testEmailMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Testar Email
          </Button>
          <Button 
            size="sm" 
            onClick={() => setCreateUserDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              await queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
              await refetchUsers();
              toast({ title: "Lista atualizada!" });
            }}
            disabled={usersLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${usersLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid gap-3 grid-cols-3 lg:grid-cols-6">
        <Card className="bg-card/50">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">Usuários</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardContent className="p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-500">{activeSubscriptions}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-yellow-500">{pendingSubscriptions}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3 text-center">
            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-500">{canceledSubscriptions}</p>
            <p className="text-xs text-muted-foreground">Canceladas</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3 text-center">
            <Ban className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-bold">{noSubscription}</p>
            <p className="text-xs text-muted-foreground">Sem plano</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-3 text-center">
            <Shield className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-xl font-bold text-purple-500">{adminsCount}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Administrative Tools - Collapsible Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          Ferramentas Administrativas
        </h2>

        {/* Announcements Tool */}
        <AdminToolCard
          icon={<Megaphone className="w-5 h-5 text-primary" />}
          title="Sistema de Avisos"
          description="Envie mensagens broadcast para seus usuários"
          metrics={[
            { label: "Total", value: "—", variant: "default" },
          ]}
        >
          <AnnouncementsAdminPanel />
        </AdminToolCard>

        {/* Feedback Tool */}
        <AdminToolCard
          icon={<MessageSquare className="w-5 h-5 text-primary" />}
          title="Sistema de Avaliação"
          description="Colete feedback dos usuários com campanhas controladas"
          metrics={[
            { label: "Respondidos", value: "—", variant: "success" },
          ]}
        >
          <FeedbackAdminPanel />
        </AdminToolCard>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Usuários e Assinaturas
              </CardTitle>
              <CardDescription>Lista completa de todos os usuários</CardDescription>
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
                    <TableHead className="hidden md:table-cell">Cidade</TableHead>
                    <TableHead className="hidden lg:table-cell">Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Dias</TableHead>
                    <TableHead className="hidden lg:table-cell">Permissão</TableHead>
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
                    filteredUsers.map((user) => {
                      const daysRemaining = user.subscription?.current_period_end 
                        ? getDaysRemaining(user.subscription.current_period_end)
                        : 0;
                      
                      return (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate text-sm">{user.profile?.name || "Sem nome"}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[120px] md:max-w-[180px]">{user.user_id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm">{user.profile?.city || "-"}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm truncate">{user.subscription?.plan_name?.replace("New Gestão - ", "") || "-"}</span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(user.subscription?.status)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.subscription?.current_period_end ? (
                              <span className={`text-sm font-medium ${daysRemaining <= 7 ? "text-yellow-500" : daysRemaining <= 0 ? "text-red-500" : ""}`}>
                                {daysRemaining}d
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const userRolesList = allUserRoles.filter(r => r.user_id === user.user_id);
                                if (userRolesList.length === 0) {
                                  return <Badge variant="outline" className="text-muted-foreground text-xs">Usuário</Badge>;
                                }
                                return userRolesList.map((r) => {
                                  const colors = ROLE_COLORS[r.role as AppRole] || ROLE_COLORS.admin;
                                  return (
                                    <Badge key={r.id} className={cn(colors.bg, colors.text, colors.border, "text-xs")}>
                                      {ROLE_LABELS[r.role as AppRole] || r.role}
                                    </Badge>
                                  );
                                });
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedUserForRoles(user);
                                  setRoleManagementOpen(true);
                                }}
                                title="Gerenciar cargos"
                              >
                                <Tags className="w-4 h-4" />
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditUser(user)}
                                title="Editar usuário"
                              >
                                <UserCog className="w-4 h-4" />
                              </Button>

                              {user.subscription ? (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditSubscription(user.subscription!)}
                                  title="Editar assinatura"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleCreateSubscription(user)}
                                  title="Criar assinatura"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              )}

                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  resendPasswordLinkMutation.mutate({ 
                                    userId: user.user_id, 
                                    skipSubscriptionCheck: true 
                                  });
                                }}
                                disabled={resendPasswordLinkMutation.isPending}
                                title="Reenviar link de senha"
                              >
                                {resendPasswordLinkMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    title="Excluir usuário"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação irá remover permanentemente o perfil, assinatura e permissões do usuário.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => deleteUserMutation.mutate(user.user_id)}
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} />
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
                    toggleAdminMutation.mutate({ userId: selectedUser.user_id, makeAdmin: newValue });
                  }
                }}
                disabled={toggleAdminMutation.isPending}
              >
                {toggleAdminMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : formIsAdmin ? "Remover" : "Conceder"}
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
                  updateProfileMutation.mutate({ userId: selectedUser.user_id, name: formName, city: formCity });
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
            <DialogDescription>Para: {selectedUser?.profile?.name || "Usuário"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={formPlan} onValueChange={(v) => setFormPlan(v as typeof formPlan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensal (1 mês)</SelectItem>
                  <SelectItem value="quarter">Trimestral (3 meses)</SelectItem>
                  <SelectItem value="year">Anual (12 meses)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as typeof formStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="past_due">Pendente</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Renovação: {format(addMonths(new Date(), getMonthsForPlan(formPlan)), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button
              onClick={() => {
                if (selectedUser) {
                  createSubMutation.mutate({ userId: selectedUser.user_id, plan: formPlan, status: formStatus });
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
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSubscription && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plano atual:</span>
                  <span className="font-medium">{selectedSubscription.plan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Válido até:</span>
                  <span className="font-medium">{format(new Date(selectedSubscription.current_period_end), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Alterar Plano</Label>
              <Select value={formPlan} onValueChange={(v) => setFormPlan(v as typeof formPlan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mensal</SelectItem>
                  <SelectItem value="quarter">Trimestral</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as typeof formStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="past_due">Pendente</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
                    <AlertDialogDescription>O usuário perderá acesso ao sistema.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground"
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
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button
              onClick={() => {
                if (selectedSubscription) {
                  updateSubMutation.mutate({
                    id: selectedSubscription.id,
                    status: formStatus,
                    plan: formPlan !== selectedSubscription.billing_interval ? formPlan : undefined,
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

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Criar Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className={createUserErrors.email ? "border-destructive" : ""}
              />
              {createUserErrors.email && <p className="text-sm text-destructive">{createUserErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={createUserErrors.password ? "border-destructive" : ""}
              />
              {createUserErrors.password && <p className="text-sm text-destructive">{createUserErrors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nome completo"
                className={createUserErrors.name ? "border-destructive" : ""}
              />
              {createUserErrors.name && <p className="text-sm text-destructive">{createUserErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                value={newUserCity}
                onChange={(e) => setNewUserCity(e.target.value)}
                placeholder="Cidade (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
              {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Management Modal */}
      <RoleManagementModal
        open={roleManagementOpen}
        onOpenChange={setRoleManagementOpen}
        user={selectedUserForRoles}
      />
    </div>
  );
}
