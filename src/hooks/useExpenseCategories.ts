import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ExpenseCategory {
  id: string;
  key: string;
  name: string;
  color: string;
  icon: string | null;
  is_active: boolean;
  is_system: boolean;
  is_default: boolean;
  user_id: string | null;
}

export interface UserExpenseCategory {
  id: string;
  user_id: string;
  category_key: string;
  enabled: boolean;
}

export function useExpenseCategories() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available categories (system + user's custom)
  const {
    data: categories = [],
    isLoading: loadingCategories,
  } = useQuery({
    queryKey: ["expense_categories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data || []) as ExpenseCategory[];
    },
    enabled: !!user,
  });

  // Fetch user's category preferences
  const {
    data: userCategories = [],
    isLoading: loadingUserCategories,
  } = useQuery({
    queryKey: ["user_expense_categories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_expense_categories")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []) as UserExpenseCategory[];
    },
    enabled: !!user,
  });

  // Initialize user category preferences if not exists
  const initializeUserCategories = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const systemCategories = categories.filter((c) => c.is_system);
      const existingKeys = userCategories.map((uc) => uc.category_key);
      const missingCategories = systemCategories.filter(
        (c) => !existingKeys.includes(c.key)
      );

      if (missingCategories.length === 0) return;

      const { error } = await supabase.from("user_expense_categories").insert(
        missingCategories.map((c) => ({
          user_id: user.id,
          category_key: c.key,
          enabled: true,
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_expense_categories"] });
    },
  });

  // Check if a category is enabled
  const isCategoryEnabled = (categoryKey: string): boolean => {
    const userCategory = userCategories.find((uc) => uc.category_key === categoryKey);
    // If no user preference exists, default to enabled for system categories
    if (!userCategory) {
      const category = categories.find((c) => c.key === categoryKey);
      return category?.is_system ? true : false;
    }
    return userCategory.enabled;
  };

  // Get enabled categories
  const enabledCategories = categories.filter((c) => isCategoryEnabled(c.key));

  // Toggle category enabled/disabled
  const toggleCategory = useMutation({
    mutationFn: async ({
      categoryKey,
      enabled,
    }: {
      categoryKey: string;
      enabled: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_expense_categories")
        .upsert(
          {
            user_id: user.id,
            category_key: categoryKey,
            enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,category_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_expense_categories"] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar categoria",
        variant: "destructive",
      });
    },
  });

  // Create custom category
  const createCategory = useMutation({
    mutationFn: async ({ name, color, icon }: { name: string; color: string; icon?: string }) => {
      if (!user) throw new Error("Não autenticado");

      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Nome é obrigatório");

      // Normalize for case-insensitive comparison
      const normalizedName = trimmedName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      // Check against system categories (user_id IS NULL, is_system=true)
      const { data: systemCategories, error: systemError } = await supabase
        .from("expense_categories")
        .select("name")
        .is("user_id", null)
        .eq("is_system", true);

      if (systemError) throw systemError;

      const systemNames = new Set(
        (systemCategories || []).map((c) =>
          c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        )
      );

      if (systemNames.has(normalizedName)) {
        throw new Error(`Já existe uma categoria padrão com o nome "${trimmedName}". Escolha outro nome.`);
      }

      // Check against user's own categories
      const { data: userCategories, error: userError } = await supabase
        .from("expense_categories")
        .select("name")
        .eq("user_id", user.id);

      if (userError) throw userError;

      const userNames = new Set(
        (userCategories || []).map((c) =>
          c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        )
      );

      if (userNames.has(normalizedName)) {
        throw new Error(`Você já possui uma categoria com o nome "${trimmedName}".`);
      }

      // Generate key
      const key = trimmedName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      const categoryKey = `custom_${key}_${Date.now()}`;

      const { error: categoryError } = await supabase
        .from("expense_categories")
        .insert({
          key: categoryKey,
          name: trimmedName,
          color,
          icon: icon || "Tag",
          is_system: false,
          is_default: false,
          user_id: user.id,
        });
      if (categoryError) throw categoryError;

      // Auto-enable the new category
      await supabase
        .from("user_expense_categories")
        .insert({
          user_id: user.id,
          category_key: categoryKey,
          enabled: true,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories"] });
      queryClient.invalidateQueries({ queryKey: ["user_expense_categories"] });
      toast({
        title: "Categoria criada!",
        description: "Nova categoria de despesa adicionada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete custom category
  const deleteCategory = useMutation({
    mutationFn: async ({ categoryId, categoryKey }: { categoryId: string; categoryKey: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Delete user preference first
      await supabase
        .from("user_expense_categories")
        .delete()
        .eq("user_id", user.id)
        .eq("category_key", categoryKey);

      // Delete the category
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", categoryId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories"] });
      queryClient.invalidateQueries({ queryKey: ["user_expense_categories"] });
      toast({
        title: "Categoria removida",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover categoria",
        variant: "destructive",
      });
    },
  });

  // Update custom category
  const updateCategory = useMutation({
    mutationFn: async ({
      categoryId,
      name,
      color,
      icon,
    }: {
      categoryId: string;
      name: string;
      color: string;
      icon?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("expense_categories")
        .update({ name, color, icon: icon || "Tag" })
        .eq("id", categoryId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories"] });
      toast({
        title: "Categoria atualizada",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar categoria",
        variant: "destructive",
      });
    },
  });

  return {
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
  };
}
