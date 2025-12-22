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
import { Receipt, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { useExpenseCategories, ExpenseCategory } from "@/hooks/useExpenseCategories";
import { useToast } from "@/hooks/use-toast";

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
  const [newCategoryColor, setNewCategoryColor] = useState("#EF4444");

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("#EF4444");

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
      { name: trimmedName, color: safeColor },
      {
        onSuccess: () => {
          setNewCategoryName("");
          setNewCategoryColor("#EF4444");
          setIsCreateDialogOpen(false);
        },
      }
    );
  };

  const handleOpenEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
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
      { categoryId: editingCategory.id, name: trimmedName, color: safeColor },
      {
        onSuccess: () => {
          setEditingCategory(null);
          setEditCategoryName("");
          setEditCategoryColor("#EF4444");
          setIsEditDialogOpen(false);
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

  // Separate system categories from custom (user) categories
  const systemCategories = categories.filter((c) => c.is_system);
  const customCategories = categories.filter((c) => !c.is_system);

  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
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
          {/* System Categories */}
          {systemCategories.map((category) => {
            const isEnabled = isCategoryEnabled(category.key);
            const isLastEnabled = isEnabled && enabledCategories.length === 1;

            return (
              <div
                key={category.key}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color || "#EF4444" }}
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

          {/* Divider if there are custom categories */}
          {customCategories.length > 0 && (
            <div className="border-t border-border pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Suas categorias personalizadas
              </p>

              {customCategories.map((category) => {
                const isEnabled = isCategoryEnabled(category.key);
                const isLastEnabled = isEnabled && enabledCategories.length === 1;

                return (
                  <div
                    key={category.key}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color || "#EF4444" }}
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
                        onClick={() =>
                          deleteCategory.mutate({
                            categoryId: category.id,
                            categoryKey: category.key,
                          })
                        }
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
    </>
  );
}
