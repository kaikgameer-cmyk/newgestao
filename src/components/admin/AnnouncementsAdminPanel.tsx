import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Megaphone,
  Send,
  XCircle,
  Loader2,
  Users,
  CheckCircle,
  Clock,
  Copy,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAnnouncementsAdmin, Announcement, AnnouncementAck, AnnouncementStats } from "@/hooks/useAnnouncements";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface UserOption {
  user_id: string;
  name: string | null;
  email: string | null;
}

export function AnnouncementsAdminPanel() {
  const { toast } = useToast();
  const {
    announcements,
    loadingAnnouncements,
    fetchAcks,
    fetchStats,
    createAnnouncement,
    closeAnnouncement,
    duplicateAnnouncement,
  } = useAnnouncementsAdmin();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [targetMode, setTargetMode] = useState<"all" | "users">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(false);

  // Stats cache
  const [statsCache, setStatsCache] = useState<Record<string, AnnouncementStats>>({});
  const [acksCache, setAcksCache] = useState<Record<string, AnnouncementAck[]>>({});
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  // Search users for targeting
  useEffect(() => {
    if (userSearchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, name, email")
          .or(`name.ilike.%${userSearchTerm}%,email.ilike.%${userSearchTerm}%`)
          .limit(10);

        setSearchResults(data || []);
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [userSearchTerm]);

  const handleCreateAnnouncement = async () => {
    if (!newMessage.trim()) {
      toast({ title: "Mensagem é obrigatória", variant: "destructive" });
      return;
    }

    if (targetMode === "users" && selectedUserIds.length === 0) {
      toast({ title: "Selecione pelo menos um usuário", variant: "destructive" });
      return;
    }

    try {
      await createAnnouncement.mutateAsync({
        title: newTitle.trim() || undefined,
        message: newMessage.trim(),
        targetMode,
        targetUserIds: targetMode === "users" ? selectedUserIds : undefined,
      });

      toast({ title: "Aviso disparado com sucesso!" });
      setCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Erro ao criar aviso", description: error.message, variant: "destructive" });
    }
  };

  const handleCloseAnnouncement = async (id: string) => {
    try {
      await closeAnnouncement.mutateAsync(id);
      toast({ title: "Aviso encerrado" });
    } catch (error: any) {
      toast({ title: "Erro ao encerrar", description: error.message, variant: "destructive" });
    }
  };

  const handleDuplicateAnnouncement = async (id: string) => {
    try {
      await duplicateAnnouncement.mutateAsync(id);
      toast({ title: "Aviso duplicado e ativado!" });
    } catch (error: any) {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    }
  };

  const loadAnnouncementDetails = async (announcement: Announcement) => {
    if (expandedAnnouncement === announcement.id) {
      setExpandedAnnouncement(null);
      return;
    }

    setLoadingDetails(announcement.id);
    try {
      const [stats, acks] = await Promise.all([
        fetchStats(announcement),
        fetchAcks(announcement.id),
      ]);

      setStatsCache(prev => ({ ...prev, [announcement.id]: stats }));
      setAcksCache(prev => ({ ...prev, [announcement.id]: acks }));
      setExpandedAnnouncement(announcement.id);
    } catch (error) {
      console.error("Error loading details:", error);
      toast({ title: "Erro ao carregar detalhes", variant: "destructive" });
    } finally {
      setLoadingDetails(null);
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewMessage("");
    setTargetMode("all");
    setSelectedUserIds([]);
    setUserSearchTerm("");
    setSearchResults([]);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const activeAnnouncements = announcements.filter(a => a.status === "active");
  const closedAnnouncements = announcements.filter(a => a.status === "closed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Sistema de Avisos
          </h2>
          <p className="text-sm text-muted-foreground">
            Envie mensagens broadcast para seus usuários
          </p>
        </div>

        <Button variant="hero" onClick={() => setCreateDialogOpen(true)}>
          <Send className="w-4 h-4 mr-2" />
          Novo Aviso
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{announcements.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Ativos</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{activeAnnouncements.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Encerrados</span>
            </div>
            <p className="text-2xl font-bold">{closedAnnouncements.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Avisos ({announcements.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingAnnouncements ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              Nenhum aviso criado ainda. Clique em "Novo Aviso" para começar.
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y divide-border">
                {announcements.map((announcement) => {
                  const stats = statsCache[announcement.id];
                  const acks = acksCache[announcement.id] || [];
                  const isExpanded = expandedAnnouncement === announcement.id;
                  const isLoading = loadingDetails === announcement.id;

                  return (
                    <Collapsible
                      key={announcement.id}
                      open={isExpanded}
                      onOpenChange={() => loadAnnouncementDetails(announcement)}
                    >
                      <div className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">
                                {announcement.title || "Aviso sem título"}
                              </span>
                              <Badge
                                variant={announcement.status === "active" ? "default" : "secondary"}
                                className={cn(
                                  "text-xs",
                                  announcement.status === "active" && "bg-green-500/20 text-green-500"
                                )}
                              >
                                {announcement.status === "active" ? "Ativo" : "Encerrado"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {announcement.target_mode === "all" ? "Todos" : "Específicos"}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {announcement.message}
                            </p>

                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(announcement.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                              </span>
                              {stats && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {stats.acked_count}/{stats.total_targets} OK
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {announcement.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloseAnnouncement(announcement.id);
                                }}
                                disabled={closeAnnouncement.isPending}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateAnnouncement(announcement.id);
                              }}
                              disabled={duplicateAnnouncement.isPending}
                              title="Duplicar e ativar"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          {stats && (
                            <div className="mt-4 pt-4 border-t space-y-4">
                              {/* Stats */}
                              <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 rounded bg-muted/50 text-center">
                                  <p className="text-lg font-bold">{stats.total_targets}</p>
                                  <p className="text-xs text-muted-foreground">Destinatários</p>
                                </div>
                                <div className="p-2 rounded bg-green-500/10 text-center">
                                  <p className="text-lg font-bold text-green-500">{stats.acked_count}</p>
                                  <p className="text-xs text-muted-foreground">Clicaram OK</p>
                                </div>
                                <div className="p-2 rounded bg-yellow-500/10 text-center">
                                  <p className="text-lg font-bold text-yellow-500">{stats.pending_count}</p>
                                  <p className="text-xs text-muted-foreground">Pendentes</p>
                                </div>
                              </div>

                              {/* Users who clicked OK */}
                              {acks.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Quem clicou OK ({acks.length})
                                  </h4>
                                  <ScrollArea className="max-h-[150px]">
                                    <div className="space-y-1">
                                      {acks.map((ack) => (
                                        <div
                                          key={ack.id}
                                          className="flex items-center justify-between text-xs p-2 rounded bg-muted/30"
                                        >
                                          <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 text-muted-foreground" />
                                            <span>{ack.profiles?.name || ack.profiles?.email || "Usuário"}</span>
                                          </div>
                                          <span className="text-muted-foreground">
                                            {format(new Date(ack.acked_at), "dd/MM HH:mm", { locale: ptBR })}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              )}
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Announcement Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Novo Aviso
            </DialogTitle>
            <DialogDescription>
              Crie uma mensagem para enviar aos usuários
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Atualização importante"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite a mensagem do aviso..."
                rows={6}
                maxLength={3000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {newMessage.length}/3000
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Quem deve receber?</Label>
              <RadioGroup
                value={targetMode}
                onValueChange={(v) => setTargetMode(v as "all" | "users")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="target-all" />
                  <Label htmlFor="target-all" className="font-normal cursor-pointer">
                    Todos os usuários
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="users" id="target-users" />
                  <Label htmlFor="target-users" className="font-normal cursor-pointer">
                    Usuários específicos
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {targetMode === "users" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Buscar usuários</Label>
                  <Input
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Digite nome ou email..."
                  />
                </div>

                {searching && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando...
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.user_id}
                        onClick={() => toggleUserSelection(user.user_id)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                          selectedUserIds.includes(user.user_id)
                            ? "bg-primary/20 border border-primary/30"
                            : "bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{user.name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        {selectedUserIds.includes(user.user_id) && (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedUserIds.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">
                      {selectedUserIds.length} selecionado(s)
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUserIds([])}
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAnnouncement}
              disabled={createAnnouncement.isPending || !newMessage.trim()}
            >
              {createAnnouncement.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Disparar Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
