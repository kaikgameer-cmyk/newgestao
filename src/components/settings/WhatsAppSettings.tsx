import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageCircle, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Copy,
  ExternalLink,
  Unplug
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";

export function WhatsAppSettings() {
  const { toast } = useToast();
  const { 
    connection, 
    isLoading, 
    createConnection, 
    testConnection, 
    disconnect,
    toggleEnabled 
  } = useWhatsAppConnection();

  const [wabaId, setWabaId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showForm, setShowForm] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  const handleConnect = async () => {
    if (!wabaId || !phoneNumberId || !accessToken) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para conectar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createConnection.mutateAsync({
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        access_token: accessToken,
      });
      
      toast({
        title: "Conexão criada",
        description: "Agora teste a conexão para validar as credenciais.",
      });
      
      setShowForm(false);
      setAccessToken("");
    } catch {
      toast({
        title: "Erro ao conectar",
        description: "Não foi possível salvar a conexão.",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result.success) {
        toast({
          title: "Conexão validada!",
          description: `Número: ${result.phone_number || result.verified_name}`,
        });
      } else {
        toast({
          title: "Falha na validação",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro no teste",
        description: "Não foi possível testar a conexão.",
        variant: "destructive",
      });
    }
  };

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

  const getStatusBadge = () => {
    if (!connection) return null;
    
    switch (connection.status) {
      case "connected":
        return <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary"><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</Badge>;
      case "pending":
        return <Badge variant="outline" className="border-accent/30 bg-accent/10 text-accent-foreground"><AlertTriangle className="w-3 h-3 mr-1" /> Pendente</Badge>;
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
            {connection.business_phone && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                <p className="text-sm font-medium">Número conectado</p>
                <p className="text-lg">{connection.business_phone}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Testar conexão"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnect.isPending}
                className="text-destructive hover:text-destructive"
              >
                Desconectar
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
          <>
            {!showForm ? (
              <Button onClick={() => setShowForm(true)} className="w-full">
                <MessageCircle className="w-4 h-4 mr-2" />
                Conectar WhatsApp
              </Button>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="waba_id">WABA ID</Label>
                  <Input
                    id="waba_id"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="WhatsApp Business Account ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number_id">Phone Number ID</Label>
                  <Input
                    id="phone_number_id"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="ID do número de telefone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="access_token">Access Token</Label>
                  <Input
                    id="access_token"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Token de acesso permanente"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleConnect}
                    disabled={createConnection.isPending}
                    className="flex-1"
                  >
                    {createConnection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {connection?.status === "pending" && (
          <div className="space-y-4">
            <Alert className="bg-accent/10 border-accent/30">
              <AlertTriangle className="h-4 w-4 text-accent-foreground" />
              <AlertDescription className="text-accent-foreground">
                Configure o webhook no Meta Developers para ativar a conexão.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="text-xs" />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(webhookUrl, "URL")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Verify Token</Label>
                <div className="flex gap-2">
                  <Input value={connection.verify_token} readOnly className="text-xs font-mono" />
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(connection.verify_token, "Token")}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testConnection.isPending}
              className="w-full"
            >
              {testConnection.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Testar conexão
            </Button>

            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir Meta Developers
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
