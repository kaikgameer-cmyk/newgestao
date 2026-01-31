import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { 
  Shield, 
  AlertTriangle, 
  KeyRound, 
  Ban, 
  UserX,
  Webhook,
  Upload,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  useSecurityStats, 
  useSecurityLogs, 
  useRecentSecurityAlerts,
  ACTION_LABELS,
  SEVERITY_COLORS,
  SecurityAction,
  SecuritySeverity,
  SecurityLogsFilters
} from "@/hooks/useSecurityAudit";
import { cn } from "@/lib/utils";

function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  loading,
  variant = "default"
}: { 
  icon: React.ElementType;
  title: string;
  value: number;
  loading: boolean;
  variant?: "default" | "warning" | "danger";
}) {
  const variants = {
    default: "text-muted-foreground",
    warning: "text-yellow-500",
    danger: "text-red-500",
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-muted/50", variants[variant])}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            {loading ? (
              <Skeleton className="h-6 w-12 mt-1" />
            ) : (
              <p className={cn("text-xl font-semibold", value > 0 && variant !== "default" && variants[variant])}>
                {value}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityOverview() {
  const { data: stats, isLoading, refetch, isRefetching } = useSecurityStats();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Visão Geral (últimos 7 dias)</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()} 
          disabled={isRefetching}
        >
          <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard 
          icon={UserX} 
          title="Falhas de Login" 
          value={stats?.loginFailures7d ?? 0}
          loading={isLoading}
          variant={stats?.loginFailures7d && stats.loginFailures7d > 10 ? "danger" : "default"}
        />
        <StatCard 
          icon={KeyRound} 
          title="Resets de Senha" 
          value={stats?.passwordResets7d ?? 0}
          loading={isLoading}
        />
        <StatCard 
          icon={Webhook} 
          title="Webhooks Rejeitados" 
          value={stats?.webhooksRejected7d ?? 0}
          loading={isLoading}
          variant={stats?.webhooksRejected7d && stats.webhooksRejected7d > 5 ? "warning" : "default"}
        />
        <StatCard 
          icon={Shield} 
          title="Ações Críticas" 
          value={stats?.criticalActions7d ?? 0}
          loading={isLoading}
          variant={stats?.criticalActions7d && stats.criticalActions7d > 0 ? "warning" : "default"}
        />
        <StatCard 
          icon={Upload} 
          title="Uploads Bloqueados" 
          value={stats?.uploadsBlocked7d ?? 0}
          loading={isLoading}
          variant={stats?.uploadsBlocked7d && stats.uploadsBlocked7d > 0 ? "warning" : "default"}
        />
        <StatCard 
          icon={Ban} 
          title="Rate Limits" 
          value={stats?.rateLimitExceeded7d ?? 0}
          loading={isLoading}
          variant={stats?.rateLimitExceeded7d && stats.rateLimitExceeded7d > 10 ? "danger" : "default"}
        />
      </div>
    </div>
  );
}

function RecentAlerts() {
  const { data: alerts, isLoading } = useRecentSecurityAlerts();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!alerts?.length) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhum alerta recente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map(alert => (
        <div 
          key={alert.id}
          className={cn(
            "p-3 rounded-lg border flex items-center gap-3",
            SEVERITY_COLORS[alert.severity].bg,
            SEVERITY_COLORS[alert.severity].border
          )}
        >
          <AlertTriangle className={cn("h-4 w-4 flex-shrink-0", SEVERITY_COLORS[alert.severity].text)} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", SEVERITY_COLORS[alert.severity].text)}>
              {ACTION_LABELS[alert.action as SecurityAction] || alert.action}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
              {alert.ip_address && ` • ${alert.ip_address}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SecurityLogsTable() {
  const [filters, setFilters] = useState<SecurityLogsFilters>({
    limit: 20,
    offset: 0,
  });

  const { data, isLoading, refetch, isRefetching } = useSecurityLogs(filters);

  const handleFilterChange = (key: keyof SecurityLogsFilters, value: unknown) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value,
      offset: 0 // Reset pagination on filter change
    }));
  };

  const handlePageChange = (direction: "prev" | "next") => {
    const newOffset = direction === "next" 
      ? filters.offset! + filters.limit!
      : Math.max(0, filters.offset! - filters.limit!);
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;
  const totalPages = Math.ceil((data?.total || 0) / (filters.limit || 20));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={filters.action || "all"}
          onValueChange={(v) => handleFilterChange("action", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.severity || "all"}
          onValueChange={(v) => handleFilterChange("severity", v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Aviso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
          </SelectContent>
        </Select>

        <DatePicker
          date={filters.startDate}
          onDateChange={(d) => handleFilterChange("startDate", d)}
          placeholder="Data início"
          className="w-auto"
        />

        <DatePicker
          date={filters.endDate}
          onDateChange={(d) => handleFilterChange("endDate", d)}
          placeholder="Data fim"
          className="w-auto"
        />

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead className="w-[100px]">Severidade</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                </TableRow>
              ))
            ) : data?.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado
                </TableCell>
              </TableRow>
            ) : (
              data?.logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {ACTION_LABELS[log.action as SecurityAction] || log.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs",
                        SEVERITY_COLORS[log.severity].bg,
                        SEVERITY_COLORS[log.severity].text,
                        SEVERITY_COLORS[log.severity].border
                      )}
                    >
                      {log.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {log.ip_address || "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.entity_type && `${log.entity_type}`}
                    {log.entity_id && `: ${log.entity_id.substring(0, 8)}...`}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(data?.total || 0) > (filters.limit || 20) && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {filters.offset! + 1} - {Math.min(filters.offset! + filters.limit!, data?.total || 0)} de {data?.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange("prev")}
              disabled={filters.offset === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange("next")}
              disabled={filters.offset! + filters.limit! >= (data?.total || 0)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SecurityPanel() {
  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <SecurityOverview />

      {/* Alerts + Logs Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Alerts */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentAlerts />
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Logs de Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SecurityLogsTable />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
