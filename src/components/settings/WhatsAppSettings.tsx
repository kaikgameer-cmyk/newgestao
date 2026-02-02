import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Copy,
  ExternalLink,
  Unplug,
  RefreshCw,
  Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function WhatsAppSettings() {
  const { toast } = useToast();
  const { 
    connection, 
    isLoading, 
    createPairingCode,
    disconnect,
    toggleEnabled,
    refetch
  } = useWhatsAppConnection();

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiry, setPairingExpiry] = useState<Date | null>(null);
  const [waLink, setWaLink] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!pairingExpiry) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((pairingExpiry.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pairingExpiry]);

  // Poll for connection status while modal is open
  useEffect(() => {
    if (!showPairingModal || !pairingCode) return;

    const pollInterval = setInterval(async () => {
      await refetch();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [showPairingModal, pairingCode, refetch]);

  // Close modal when connected
  useEffect(() => {
    if (connection?.status === 'connected' && showPairingModal) {
      setShowPairingModal(false);
      toast({
        title: "WhatsApp conectado!",
        description: "Agora você pode criar lançamentos por mensagem.",
      });
    }
  }, [connection?.status, showPairingModal, toast]);

  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await createPairingCode.mutateAsync();
      setPairingCode(result.code);
      setPairingExpiry(new Date(result.expires_at));
      setWaLink(result.wa_link);
      setShowPairingModal(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao gerar código";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [createPairingCode, toast]);

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast({ title: "WhatsApp desconectado" });
    } catch {
      toast({
        title: "Erro ao desconectar",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    if (!connection) return null;
    
    switch (connection.status) {
      case "connected":
        return <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary"><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent-foreground"><Smartphone className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge variant="outline"><Unplug className="w-3 h-3 mr-1" /> Desconectado</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">WhatsApp Bot</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Feature description */}
          <Alert className="bg-muted/50 border-muted-foreground/20">
            <MessageCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Conecte seu WhatsApp para criar lançamentos por mensagem. 
              Envie comandos como "receita hoje uber 250 km 120 horas 8 corridas 12" e confirme com SIM.
            </AlertDescription>
          </Alert>

          {connection?.status === "connected" && (
            <>
              {/* Enable/disable toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Bot ativo</Label>
                  <p className="text-xs text-muted-foreground">Receber e processar mensagens</p>
                </div>
                <Switch
                  checked={connection.whatsapp_enabled}
                  onCheckedChange={(checked) => toggleEnabled.mutate(checked)}
                  disabled={toggleEnabled.isPending}
                />
              </div>

              {/* Connected info */}
              {connection.wa_phone && (
                <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                  <p className="text-sm font-medium">Número conectado</p>
                  <p className="text-lg font-mono">+{connection.wa_phone}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnect.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {disconnect.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desconectar"}
                </Button>
              </div>
            </>
          )}

          {connection?.status === "error" && connection.last_error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{connection.last_error}</AlertDescription>
            </Alert>
          )}

          {(!connection || connection.status === "disconnected" || connection.status === "error") && (
            <Button onClick={handleGenerateCode} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
              )}
              Conectar WhatsApp
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Pairing Modal */}
      <Dialog open={showPairingModal} onOpenChange={setShowPairingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Envie o código abaixo para o nosso bot no WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Pairing Code */}
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">Seu código de conexão</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-3xl font-mono font-bold tracking-wider px-4 py-3 bg-muted rounded-lg">
                  {pairingCode}
                </code>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => pairingCode && copyToClipboard(pairingCode, "Código")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Countdown */}
            {countdown > 0 ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Expira em <span className="font-mono font-medium text-foreground">{formatCountdown(countdown)}</span>
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">Código expirado</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Gerar novo código
                </Button>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Como conectar:</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Clique no botão abaixo para abrir o WhatsApp</li>
                <li>Envie a mensagem que já estará preenchida</li>
                <li>Aguarde a confirmação de conexão</li>
              </ol>
            </div>

            {/* WhatsApp Button */}
            {waLink && countdown > 0 && (
              <Button 
                className="w-full" 
                onClick={() => window.open(waLink, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </Button>
            )}

            {/* Copy command manually */}
            {pairingCode && countdown > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(`CONNECT ${pairingCode}`, "Comando")}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar comando completo
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
