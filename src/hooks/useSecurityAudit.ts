import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format } from "date-fns";

export type SecurityAction = 
  | "LOGIN_SUCCESS"
  | "LOGIN_FAIL"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_SET"
  | "ROLE_CHANGED"
  | "ROLE_ADDED"
  | "ROLE_REMOVED"
  | "TICKET_DELETED"
  | "TICKET_ARCHIVED"
  | "MESSAGE_DELETED"
  | "WEBHOOK_RECEIVED"
  | "WEBHOOK_REJECTED"
  | "UPLOAD_BLOCKED"
  | "RATE_LIMIT_EXCEEDED"
  | "SUSPICIOUS_ACTIVITY";

export type SecuritySeverity = "info" | "warn" | "error" | "critical";

export interface SecurityAuditLog {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  action: SecurityAction;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  severity: SecuritySeverity;
}

export interface SecurityStats {
  loginFailures7d: number;
  passwordResets7d: number;
  webhooksRejected7d: number;
  criticalActions7d: number;
  uploadsBlocked7d: number;
  rateLimitExceeded7d: number;
}

// Action labels in Portuguese
export const ACTION_LABELS: Record<SecurityAction, string> = {
  LOGIN_SUCCESS: "Login bem-sucedido",
  LOGIN_FAIL: "Falha de login",
  PASSWORD_RESET_REQUEST: "Solicitação de reset de senha",
  PASSWORD_SET: "Senha definida",
  ROLE_CHANGED: "Cargo alterado",
  ROLE_ADDED: "Cargo adicionado",
  ROLE_REMOVED: "Cargo removido",
  TICKET_DELETED: "Ticket excluído",
  TICKET_ARCHIVED: "Ticket arquivado",
  MESSAGE_DELETED: "Mensagem excluída",
  WEBHOOK_RECEIVED: "Webhook recebido",
  WEBHOOK_REJECTED: "Webhook rejeitado",
  UPLOAD_BLOCKED: "Upload bloqueado",
  RATE_LIMIT_EXCEEDED: "Rate limit excedido",
  SUSPICIOUS_ACTIVITY: "Atividade suspeita",
};

export const SEVERITY_COLORS: Record<SecuritySeverity, { bg: string; text: string; border: string }> = {
  info: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  warn: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  error: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  critical: { bg: "bg-red-600/20", text: "text-red-300", border: "border-red-600/30" },
};

export function useSecurityStats() {
  return useQuery({
    queryKey: ["security-stats"],
    queryFn: async (): Promise<SecurityStats> => {
      const sevenDaysAgo = format(subDays(startOfDay(new Date()), 7), "yyyy-MM-dd'T'HH:mm:ss");

      const { data, error } = await supabase
        .from("security_audit_logs")
        .select("action, severity")
        .gte("created_at", sevenDaysAgo);

      if (error) {
        console.error("Error fetching security stats:", error);
        throw error;
      }

      const logs = data || [];

      return {
        loginFailures7d: logs.filter(l => l.action === "LOGIN_FAIL").length,
        passwordResets7d: logs.filter(l => l.action === "PASSWORD_RESET_REQUEST").length,
        webhooksRejected7d: logs.filter(l => l.action === "WEBHOOK_REJECTED").length,
        criticalActions7d: logs.filter(l => 
          ["ROLE_CHANGED", "ROLE_ADDED", "ROLE_REMOVED", "TICKET_DELETED", "MESSAGE_DELETED"].includes(l.action)
        ).length,
        uploadsBlocked7d: logs.filter(l => l.action === "UPLOAD_BLOCKED").length,
        rateLimitExceeded7d: logs.filter(l => l.action === "RATE_LIMIT_EXCEEDED").length,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export interface SecurityLogsFilters {
  action?: SecurityAction;
  severity?: SecuritySeverity;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  limit?: number;
  offset?: number;
}

export function useSecurityLogs(filters: SecurityLogsFilters = {}) {
  const { action, severity, startDate, endDate, userId, limit = 50, offset = 0 } = filters;

  return useQuery({
    queryKey: ["security-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("security_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (action) {
        query = query.eq("action", action);
      }

      if (severity) {
        query = query.eq("severity", severity);
      }

      if (startDate) {
        query = query.gte("created_at", format(startDate, "yyyy-MM-dd'T'HH:mm:ss"));
      }

      if (endDate) {
        query = query.lte("created_at", format(endDate, "yyyy-MM-dd'T'23:59:59"));
      }

      if (userId) {
        query = query.eq("actor_user_id", userId);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching security logs:", error);
        throw error;
      }

      return {
        logs: (data || []) as SecurityAuditLog[],
        total: count || 0,
      };
    },
  });
}

export function useRecentSecurityAlerts() {
  return useQuery({
    queryKey: ["security-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_audit_logs")
        .select("*")
        .in("severity", ["error", "critical"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching security alerts:", error);
        throw error;
      }

      return (data || []) as SecurityAuditLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
