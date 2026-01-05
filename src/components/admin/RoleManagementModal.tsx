import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, User, History, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useUserRoles,
  useRoleAuditLog,
  useManageRoles,
  AppRole,
  ROLE_LABELS,
  ROLE_COLORS,
  PERMISSION_ROLES,
  LABEL_ROLES,
} from "@/hooks/useRoles";
import { cn } from "@/lib/utils";

interface RoleManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    user_id: string;
    profile: {
      name: string | null;
      email?: string | null;
    } | null;
  } | null;
}

export function RoleManagementModal({ open, onOpenChange, user }: RoleManagementModalProps) {
  const { toast } = useToast();
  const { data: userRoles = [], isLoading: rolesLoading } = useUserRoles(user?.user_id);
  const { data: auditLog = [], isLoading: auditLoading } = useRoleAuditLog(user?.user_id);
  const { addRole, removeRole } = useManageRoles();

  const [pendingChanges, setPendingChanges] = useState<Record<AppRole, boolean>>({} as Record<AppRole, boolean>);

  // Initialize pending changes when roles load
  useEffect(() => {
    if (userRoles) {
      const initial: Record<AppRole, boolean> = {} as Record<AppRole, boolean>;
      const allRoles: AppRole[] = [...PERMISSION_ROLES, ...LABEL_ROLES];
      allRoles.forEach(role => {
        initial[role] = userRoles.some(r => r.role === role);
      });
      setPendingChanges(initial);
    }
  }, [userRoles]);

  const handleToggleRole = async (role: AppRole, enabled: boolean) => {
    if (!user) return;

    // Optimistic update
    setPendingChanges(prev => ({ ...prev, [role]: enabled }));

    try {
      if (enabled) {
        await addRole.mutateAsync({ userId: user.user_id, role });
        toast({ title: `Cargo "${ROLE_LABELS[role]}" adicionado!` });
      } else {
        await removeRole.mutateAsync({ userId: user.user_id, role });
        toast({ title: `Cargo "${ROLE_LABELS[role]}" removido!` });
      }
    } catch (error: any) {
      // Revert on error
      setPendingChanges(prev => ({ ...prev, [role]: !enabled }));
      toast({
        title: "Erro ao alterar cargo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isPending = addRole.isPending || removeRole.isPending;

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Gerenciar Cargos</DialogTitle>
              <DialogDescription>
                {user.profile?.name || "Usuário"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {rolesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-6">
                {/* Permission Roles */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Cargos com Permissões
                  </h3>
                  <div className="space-y-2">
                    {PERMISSION_ROLES.map((role) => {
                      const colors = ROLE_COLORS[role];
                      const isEnabled = pendingChanges[role] ?? false;

                      return (
                        <div
                          key={role}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                            isEnabled ? `${colors.bg} ${colors.border}` : "bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Badge className={cn(colors.bg, colors.text, colors.border)}>
                              {ROLE_LABELS[role]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {role === "admin" && "Acesso total ao sistema"}
                              {role === "support" && "Pode responder tickets de suporte"}
                            </span>
                          </div>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggleRole(role, checked)}
                            disabled={isPending}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Label Roles */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Etiquetas (sem alterar permissões)
                  </h3>
                  <div className="space-y-2">
                    {LABEL_ROLES.map((role) => {
                      const colors = ROLE_COLORS[role];
                      const isEnabled = pendingChanges[role] ?? false;

                      return (
                        <div
                          key={role}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                            isEnabled ? `${colors.bg} ${colors.border}` : "bg-muted/30"
                          )}
                        >
                          <Badge className={cn(colors.bg, colors.text, colors.border)}>
                            {ROLE_LABELS[role]}
                          </Badge>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggleRole(role, checked)}
                            disabled={isPending}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Audit Log */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Alterações
                  </h3>
                  
                  {auditLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : auditLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma alteração registrada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {auditLog.map((log) => {
                        const colors = ROLE_COLORS[log.role as AppRole] || ROLE_COLORS.admin;
                        return (
                          <div
                            key={log.id}
                            className="flex items-center gap-2 text-xs p-2 rounded bg-muted/30"
                          >
                            {log.action === "add" ? (
                              <Plus className="w-3 h-3 text-green-500" />
                            ) : (
                              <Minus className="w-3 h-3 text-red-500" />
                            )}
                            <Badge variant="outline" className={cn("text-xs", colors.text)}>
                              {ROLE_LABELS[log.role as AppRole] || log.role}
                            </Badge>
                            <span className="text-muted-foreground ml-auto">
                              {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
