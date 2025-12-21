import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Car, Loader2, Plus, Trash2 } from "lucide-react";
import { usePlatforms } from "@/hooks/usePlatforms";
import { useToast } from "@/hooks/use-toast";

export function PlatformSettings() {
  const { toast } = useToast();
  const {
    platforms,
    userPlatforms,
    enabledPlatforms,
    loadingPlatforms,
    loadingUserPlatforms,
    initializeUserPlatforms,
    togglePlatform,
    createPlatform,
    deletePlatform,
    isPlatformEnabled,
  } = usePlatforms();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");

  // Initialize user platforms when component mounts
  useEffect(() => {
    if (platforms.length > 0 && userPlatforms.length === 0) {
      initializeUserPlatforms.mutate();
    }
  }, [platforms.length, userPlatforms.length]);

  const isLoading = loadingPlatforms || loadingUserPlatforms;

  const handleCreatePlatform = () => {
    if (!newPlatformName.trim()) return;
    
    createPlatform.mutate(
      { name: newPlatformName },
      {
        onSuccess: () => {
          setNewPlatformName("");
          setIsCreateDialogOpen(false);
        },
      }
    );
  };

  const getPlatformColor = (key: string): string => {
    if (key === "uber") return "bg-black";
    if (key === "99") return "bg-[#FFB800]";
    if (key === "indrive") return "bg-[#2DCC70]";
    return "bg-primary";
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Plataformas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Separate system platforms from custom (user) platforms
  const systemPlatforms = platforms.filter((p) => p.user_id === null);
  const customPlatforms = platforms.filter((p) => p.user_id !== null);

  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Plataformas</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Cadastrar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Selecione as plataformas que você trabalha. Apenas as habilitadas aparecerão ao lançar receitas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* System Platforms */}
          {systemPlatforms.map((platform) => {
            const isEnabled = isPlatformEnabled(platform.key);
            // Check if this is the last enabled platform
            const isLastEnabled = isEnabled && enabledPlatforms.length === 1;

            return (
              <div
                key={platform.key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getPlatformColor(platform.key)}`} />
                  <Label htmlFor={`platform-${platform.key}`} className="font-medium cursor-pointer">
                    {platform.name}
                  </Label>
                </div>
                <Switch
                  id={`platform-${platform.key}`}
                  checked={isEnabled}
                  onCheckedChange={(checked) => {
                    if (!checked && isLastEnabled) {
                      toast({
                        title: "Pelo menos uma plataforma é obrigatória",
                        description: "Você precisa ter ao menos uma plataforma habilitada.",
                        variant: "destructive",
                      });
                      return;
                    }
                    togglePlatform.mutate({ platformKey: platform.key, enabled: checked });
                  }}
                  disabled={togglePlatform.isPending}
                />
              </div>
            );
          })}

          {/* Divider if there are custom platforms */}
          {customPlatforms.length > 0 && (
            <div className="border-t border-border pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-3">Suas plataformas customizadas</p>
              {customPlatforms.map((platform) => {
                const isEnabled = isPlatformEnabled(platform.key);
                const isLastEnabled = isEnabled && enabledPlatforms.length === 1;

                return (
                  <div
                    key={platform.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <Label htmlFor={`platform-${platform.key}`} className="font-medium cursor-pointer">
                        {platform.name}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`platform-${platform.key}`}
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          if (!checked && isLastEnabled) {
                            toast({
                              title: "Pelo menos uma plataforma é obrigatória",
                              description: "Você precisa ter ao menos uma plataforma habilitada.",
                              variant: "destructive",
                            });
                            return;
                          }
                          togglePlatform.mutate({ platformKey: platform.key, enabled: checked });
                        }}
                        disabled={togglePlatform.isPending}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          deletePlatform.mutate({ platformId: platform.id, platformKey: platform.key })
                        }
                        disabled={deletePlatform.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Platform Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Plataforma</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="platform-name">Nome da Plataforma</Label>
            <Input
              id="platform-name"
              placeholder="Ex: Bolt, Lalamove, DriveX..."
              value={newPlatformName}
              onChange={(e) => setNewPlatformName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreatePlatform();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewPlatformName("");
                setIsCreateDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="hero"
              onClick={handleCreatePlatform}
              disabled={!newPlatformName.trim() || createPlatform.isPending}
            >
              {createPlatform.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
