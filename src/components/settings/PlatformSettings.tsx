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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Car, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { usePlatforms, Platform } from "@/hooks/usePlatforms";
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon } from "@/components/ui/category-icon";
import { IconPicker } from "@/components/ui/icon-picker";

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
    updatePlatform,
    isPlatformEnabled,
  } = usePlatforms();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformIcon, setNewPlatformIcon] = useState("Car");
  const [newPlatformColor, setNewPlatformColor] = useState("#FFC700");

  const [editingPlatformId, setEditingPlatformId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingIcon, setEditingIcon] = useState("Car");
  const [editingColor, setEditingColor] = useState("#FFC700");

  const [deleteConfirmPlatform, setDeleteConfirmPlatform] = useState<Platform | null>(null);

  // Initialize user platforms when component mounts
  useEffect(() => {
    if (platforms.length > 0 && userPlatforms.length === 0) {
      initializeUserPlatforms.mutate();
    }
  }, [platforms.length, userPlatforms.length]);

  const isLoading = loadingPlatforms || loadingUserPlatforms;

  const handleCreatePlatform = () => {
    const trimmedName = newPlatformName.trim();
    if (!trimmedName) return;

    const safeColor = /^#[0-9A-Fa-f]{6}$/.test(newPlatformColor) ? newPlatformColor : "#FFC700";

    createPlatform.mutate(
      { name: trimmedName, color: safeColor, icon: newPlatformIcon },
      {
        onSuccess: () => {
          setNewPlatformName("");
          setNewPlatformIcon("Car");
          setNewPlatformColor("#FFC700");
          setIsCreateDialogOpen(false);
        },
      }
    );
  };

  const openEditDialog = (platform: Platform) => {
    setEditingPlatformId(platform.id);
    setEditingName(platform.name);
    setEditingIcon(platform.icon || "Car");
    setEditingColor(platform.color || "#FFC700");
  };

  const handleUpdatePlatform = () => {
    if (!editingPlatformId) return;

    const trimmedName = editingName.trim();
    if (!trimmedName) return;

    const safeColor = /^#[0-9A-Fa-f]{6}$/.test(editingColor) ? editingColor : "#FFC700";

    updatePlatform.mutate(
      { platformId: editingPlatformId, name: trimmedName, color: safeColor, icon: editingIcon },
      {
        onSuccess: () => {
          setEditingPlatformId(null);
          setEditingIcon("Car");
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmPlatform) return;
    
    deletePlatform.mutate(
      { platformId: deleteConfirmPlatform.id, platformKey: deleteConfirmPlatform.key },
      {
        onSuccess: () => {
          setDeleteConfirmPlatform(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Plataformas e outras receitas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Separate system platforms (user_id=null) from user platforms (user_id !== null)
  // User platforms (including defaults added by the user) should be editable/deletable
  const systemPlatforms = platforms.filter((p) => p.user_id === null);
  const userPlatforms_list = platforms.filter((p) => p.user_id !== null);

  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Plataformas e outras receitas</CardTitle>
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
            Selecione as plataformas e outras fontes de receita que você usa. Apenas as habilitadas aparecerão ao lançar receitas.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* System Platforms - only toggle, no edit/delete */}
          {systemPlatforms.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Plataformas do sistema
              </p>
              {systemPlatforms.map((platform) => {
                const isEnabled = isPlatformEnabled(platform.key);
                const isLastEnabled = isEnabled && enabledPlatforms.length === 1;

                return (
                  <div
                    key={platform.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        iconName={platform.icon}
                        color={platform.color}
                        size={18}
                      />
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
            </>
          )}

          {/* User Platforms - with edit/delete */}
          {userPlatforms_list.length > 0 && (
            <div className={systemPlatforms.length > 0 ? "border-t border-border pt-4 mt-4" : ""}>
              <p className="text-xs text-muted-foreground mb-3">Suas plataformas e receitas</p>

              {userPlatforms_list.map((platform) => {
                const isEnabled = isPlatformEnabled(platform.key);
                const isLastEnabled = isEnabled && enabledPlatforms.length === 1;

                return (
                  <div
                    key={platform.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        iconName={platform.icon}
                        color={platform.color}
                        size={18}
                      />
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
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(platform)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmPlatform(platform)}
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
            <DialogTitle>Cadastrar nova plataforma ou receita</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="platform-name">Nome</Label>
              <Input
                id="platform-name"
                placeholder="Ex: Bolt, Lojinha, Caixinha de Natal..."
                value={newPlatformName}
                onChange={(e) => setNewPlatformName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <IconPicker
                value={newPlatformIcon}
                onChange={setNewPlatformIcon}
                color={newPlatformColor}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newPlatformColor}
                  onChange={(e) => setNewPlatformColor(e.target.value)}
                  className="h-9 w-9 rounded-md border border-border bg-background p-1 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  Cor do ícone
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewPlatformName("");
                setNewPlatformIcon("Car");
                setNewPlatformColor("#FFC700");
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

      {/* Edit Platform Dialog */}
      <Dialog open={!!editingPlatformId} onOpenChange={(open) => !open && setEditingPlatformId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar plataforma ou receita</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-platform-name">Nome</Label>
              <Input
                id="edit-platform-name"
                placeholder="Nome da plataforma"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <IconPicker
                value={editingIcon}
                onChange={setEditingIcon}
                color={editingColor}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editingColor}
                  onChange={(e) => setEditingColor(e.target.value)}
                  className="h-9 w-9 rounded-md border border-border bg-background p-1 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  Cor do ícone
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPlatformId(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="hero"
              onClick={handleUpdatePlatform}
              disabled={!editingName.trim() || updatePlatform.isPending}
            >
              {updatePlatform.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmPlatform} onOpenChange={(open) => !open && setDeleteConfirmPlatform(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteConfirmPlatform?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove a opção das configurações. Lançamentos antigos não serão apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlatform.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
