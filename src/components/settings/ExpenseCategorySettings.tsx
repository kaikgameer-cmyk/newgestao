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
import { Receipt, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { useExpenseCategories, ExpenseCategory } from "@/hooks/useExpenseCategories";
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon } from "@/components/ui/category-icon";
import { IconPicker } from "@/components/ui/icon-picker";

export function ExpenseCategorySettings() {
  const { toast } = useToast();
  const {
    categories,
    userCategories,
    enabledCategories,
    loadingCategories,
    loadingUserCategories,
    initializeUserCategories,
    isCategoryEnabled,
    toggleCategory,
    createCategory,
    deleteCategory,
    updateCategory,
  } = useExpenseCategories();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("Tag");
  const [newCategoryColor, setNewCategoryColor] = useState("#EF4444");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("Tag");
  const [editCategoryColor, setEditCategoryColor] = useState("#EF4444");

  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<ExpenseCategory | null>(null);

  // Initialize user category preferences when component mounts
  useEffect(() => {
    if (categories.length > 0 && userCategories.length === 0) {
      initializeUserCategories.mutate();
    }
  }, [categories.length, userCategories.length]);

  const isLoading = loadingCategories || loadingUserCategories;

  const handleCreateCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    const safeColor = /^#[0-9A-Fa-f]{6}$/.test(newCategoryColor)
      ? newCategoryColor
      : "#EF4444";

    createCategory.mutate(
      { name: trimmedName, color: safeColor, icon: newCategoryIcon },
      {
        onSuccess: () => {
          setNewCategoryName("");
          setNewCategoryIcon("Tag");
          setNewCategoryColor("#EF4444");
          setIsCreateDialogOpen(false);
        },
      }
    );
  };

  const handleOpenEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryIcon(category.icon || "Tag");
    setEditCategoryColor(category.color || "#EF4444");
    setIsEditDialogOpen(true);
  };

  const handleEditCategory = () => {
    if (!editingCategory) return;
    const trimmedName = editCategoryName.trim();
    if (!trimmedName) return;

    const safeColor = /^#[0-9A-Fa-f]{6}$/.test(editCategoryColor)
      ? editCategoryColor
      : "#EF4444";

    updateCategory.mutate(
      { categoryId: editingCategory.id, name: trimmedName, color: safeColor, icon: editCategoryIcon },
      {
        onSuccess: () => {
          setEditingCategory(null);
          setEditCategoryName("");
          setEditCategoryIcon("Tag");
          setEditCategoryColor("#EF4444");
          setIsEditDialogOpen(false);
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmCategory) return;

    deleteCategory.mutate(
      { categoryId: deleteConfirmCategory.id, categoryKey: deleteConfirmCategory.key },
      {
        onSuccess: () => {
          setDeleteConfirmCategory(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Categorias de Despesas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Separate system categories (user_id=null) from user categories (user_id !== null)
  // User categories (including defaults added by the user) should be editable/deletable
  const systemCategories = categories.filter((c) => c.is_system || c.user_id === null);
  const userCategories_list = categories.filter((c) => !c.is_system && c.user_id !== null);

  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Categorias de Despesas</CardTitle>
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
            Selecione as categorias de despesas que você usa. Apenas as habilitadas aparecerão ao lançar despesas.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* System Categories - only toggle, no edit/delete */}
          {systemCategories.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                Categorias do sistema
              </p>
              {systemCategories.map((category) => {
                const isEnabled = isCategoryEnabled(category.key);
                const isLastEnabled = isEnabled && enabledCategories.length === 1;

                return (
                  <div
                    key={category.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        iconName={category.icon}
                        color={category.color}
                        size={18}
                      />
                      <Label
                        htmlFor={`category-${category.key}`}
                        className="font-medium cursor-pointer"
                      >
                        {category.name}
                      </Label>
                    </div>

                    <Switch
                      id={`category-${category.key}`}
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        if (!checked && isLastEnabled) {
                          toast({
                            title: "Pelo menos uma categoria é obrigatória",
                            description:
                              "Você precisa ter ao menos uma categoria habilitada.",
                            variant: "destructive",
                          });
                          return;
                        }
                        toggleCategory.mutate({
                          categoryKey: category.key,
                          enabled: checked,
                        });
                      }}
                      disabled={toggleCategory.isPending}
                    />
                  </div>
                );
              })}
            </>
          )}

          {/* User Categories - with edit/delete */}
          {userCategories_list.length > 0 && (
            <div className={systemCategories.length > 0 ? "border-t border-border pt-4 mt-4" : ""}>
              <p className="text-xs text-muted-foreground mb-3">
                Suas categorias
              </p>

              {userCategories_list.map((category) => {
                const isEnabled = isCategoryEnabled(category.key);
                const isLastEnabled = isEnabled && enabledCategories.length === 1;

                return (
                  <div
                    key={category.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CategoryIcon
                        iconName={category.icon}
                        color={category.color}
                        size={18}
                      />
                      <Label
                        htmlFor={`category-${category.key}`}
                        className="font-medium cursor-pointer"
                      >
                        {category.name}
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id={`category-${category.key}`}
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          if (!checked && isLastEnabled) {
                            toast({
                              title: "Pelo menos uma categoria é obrigatória",
                              description:
                                "Você precisa ter ao menos uma categoria habilitada.",
                              variant: "destructive",
                            });
                            return;
                          }
                          toggleCategory.mutate({
                            categoryKey: category.key,
                            enabled: checked,
                          });
                        }}
                        disabled={toggleCategory.isPending}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(category)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmCategory(category)}
                        disabled={deleteCategory.isPending}
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

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar nova categoria de despesa</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="category-name">Nome</Label>
              <Input
                id="category-name"
                placeholder="Ex: Seguro, IPVA, Multas..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="h-9 w-9 rounded-md border border-border bg-background p-1 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  Escolha uma cor para identificar esta categoria.
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewCategoryName("");
                setNewCategoryColor("#EF4444");
                setIsCreateDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="hero"
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim() || createCategory.isPending}
            >
              {createCategory.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria de despesa</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-category-name">Nome</Label>
              <Input
                id="edit-category-name"
                placeholder="Ex: Seguro, IPVA, Multas..."
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEditCategory();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editCategoryColor}
                  onChange={(e) => setEditCategoryColor(e.target.value)}
                  className="h-9 w-9 rounded-md border border-border bg-background p-1 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  Escolha uma cor para identificar esta categoria.
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null);
                setEditCategoryName("");
                setEditCategoryColor("#EF4444");
                setIsEditDialogOpen(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="hero"
              onClick={handleEditCategory}
              disabled={!editCategoryName.trim() || updateCategory.isPending}
            >
              {updateCategory.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmCategory} onOpenChange={(open) => !open && setDeleteConfirmCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteConfirmCategory?.name}"?</AlertDialogTitle>
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
              {deleteCategory.isPending ? (
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
