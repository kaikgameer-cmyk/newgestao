import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// All available roles in the system
export type AppRole = "admin" | "support" | "kiwify" | "affiliate" | "creuzin_team";

// Roles that grant actual permissions
export const PERMISSION_ROLES: AppRole[] = ["admin", "support"];

// Roles that are just labels/tags (no permission changes)
export const LABEL_ROLES: AppRole[] = ["kiwify", "affiliate", "creuzin_team"];

// Human-readable role names
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  support: "Suporte",
  kiwify: "Kiwify",
  affiliate: "Afiliado",
  creuzin_team: "Equipe Creuzin",
};

// Role colors for badges
export const ROLE_COLORS: Record<AppRole, { bg: string; text: string; border: string }> = {
  admin: { bg: "bg-purple-500/20", text: "text-purple-500", border: "border-purple-500/30" },
  support: { bg: "bg-blue-500/20", text: "text-blue-500", border: "border-blue-500/30" },
  kiwify: { bg: "bg-green-500/20", text: "text-green-500", border: "border-green-500/30" },
  affiliate: { bg: "bg-orange-500/20", text: "text-orange-500", border: "border-orange-500/30" },
  creuzin_team: { bg: "bg-primary/20", text: "text-primary", border: "border-primary/30" },
};

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface RoleAuditLog {
  id: string;
  target_user_id: string;
  actor_user_id: string;
  action: "add" | "remove";
  role: AppRole;
  created_at: string;
}

// Hook to get all roles for a specific user
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!userId,
  });
}

// Hook to get all roles for all users (admin view)
export function useAllUserRoles() {
  return useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");

      if (error) throw error;
      return data as UserRole[];
    },
  });
}

// Hook to get audit log for a user
export function useRoleAuditLog(userId: string | undefined) {
  return useQuery({
    queryKey: ["role-audit-log", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("role_audit_log")
        .select("*")
        .eq("target_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as RoleAuditLog[];
    },
    enabled: !!userId,
  });
}

// Hook to manage roles (add/remove)
export function useManageRoles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!user) throw new Error("Não autenticado");

      // Add the role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (roleError) {
        if (roleError.code === "23505") {
          throw new Error("Usuário já possui este cargo");
        }
        throw roleError;
      }

      // Log the action
      const { error: logError } = await supabase
        .from("role_audit_log")
        .insert({
          target_user_id: userId,
          actor_user_id: user.id,
          action: "add",
          role,
        });

      if (logError) console.error("Error logging role change:", logError);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-roles", userId] });
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-audit-log", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["supportAccess"] });
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!user) throw new Error("Não autenticado");

      // Remove the role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (roleError) throw roleError;

      // Log the action
      const { error: logError } = await supabase
        .from("role_audit_log")
        .insert({
          target_user_id: userId,
          actor_user_id: user.id,
          action: "remove",
          role,
        });

      if (logError) console.error("Error logging role change:", logError);
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["user-roles", userId] });
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-audit-log", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users-full"] });
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["supportAccess"] });
    },
  });

  return { addRole, removeRole };
}
