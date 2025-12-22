import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  defaultPlatforms,
  defaultExpenseCategories,
  normalizeForComparison,
  generateSlug,
} from "@/config/defaults";

export function useApplyDefaults() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Apply default platforms
  const applyDefaultPlatforms = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // Fetch existing user platforms
      const { data: existingPlatforms, error: fetchError } = await supabase
        .from("platforms")
        .select("name")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      // Normalize existing platform names for comparison
      const existingNames = new Set(
        (existingPlatforms || []).map((p) => normalizeForComparison(p.name))
      );

      // Filter out platforms that already exist
      const platformsToAdd = defaultPlatforms.filter(
        (dp) => !existingNames.has(normalizeForComparison(dp.name))
      );

      if (platformsToAdd.length === 0) {
        return { added: 0, message: "Todas as plataformas padrão já existem." };
      }

      // Generate unique slugs
      const { data: allPlatforms } = await supabase
        .from("platforms")
        .select("key");
      
      const existingSlugs = new Set((allPlatforms || []).map((p) => p.key));

      const insertData = platformsToAdd.map((platform) => {
        let slug = generateSlug(platform.name);
        let counter = 2;
        while (existingSlugs.has(slug)) {
          slug = `${generateSlug(platform.name)}-${counter++}`;
        }
        existingSlugs.add(slug);

        return {
          user_id: user.id,
          key: slug,
          name: platform.name,
          color: platform.color,
          is_active: true,
          is_other: false,
        };
      });

      const { error: insertError } = await supabase
        .from("platforms")
        .insert(insertData);

      if (insertError) throw insertError;

      // Auto-enable all new platforms
      const prefData = insertData.map((p) => ({
        user_id: user.id,
        platform_key: p.key,
        enabled: true,
      }));

      await supabase
        .from("user_platforms")
        .upsert(prefData, { onConflict: "user_id,platform_key" });

      return { added: platformsToAdd.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["platforms"] });
      queryClient.invalidateQueries({ queryKey: ["user_platforms"] });
      
      if (result.added > 0) {
        toast({
          title: "Plataformas padrão adicionadas!",
          description: `${result.added} plataforma(s) foram adicionadas.`,
        });
      } else {
        toast({
          title: "Nenhuma nova plataforma",
          description: result.message,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar plataformas padrão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Apply default expense categories
  const applyDefaultExpenseCategories = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      // Fetch existing user categories
      const { data: existingCategories, error: fetchError } = await supabase
        .from("expense_categories")
        .select("name")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      // Normalize existing category names for comparison
      const existingNames = new Set(
        (existingCategories || []).map((c) => normalizeForComparison(c.name))
      );

      // Filter out categories that already exist
      const categoriesToAdd = defaultExpenseCategories.filter(
        (dc) => !existingNames.has(normalizeForComparison(dc.name))
      );

      if (categoriesToAdd.length === 0) {
        return { added: 0, message: "Todas as categorias padrão já existem." };
      }

      // Generate unique keys
      const timestamp = Date.now();
      const insertData = categoriesToAdd.map((category, index) => {
        const baseKey = generateSlug(category.name);
        const key = `custom_${baseKey}_${timestamp + index}`;

        return {
          user_id: user.id,
          key,
          name: category.name,
          color: category.color,
          is_active: true,
          is_system: false,
        };
      });

      const { error: insertError } = await supabase
        .from("expense_categories")
        .insert(insertData);

      if (insertError) throw insertError;

      // Auto-enable all new categories
      const prefData = insertData.map((c) => ({
        user_id: user.id,
        category_key: c.key,
        enabled: true,
      }));

      await supabase
        .from("user_expense_categories")
        .upsert(prefData, { onConflict: "user_id,category_key" });

      return { added: categoriesToAdd.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories"] });
      queryClient.invalidateQueries({ queryKey: ["user_expense_categories"] });
      
      if (result.added > 0) {
        toast({
          title: "Categorias padrão adicionadas!",
          description: `${result.added} categoria(s) foram adicionadas.`,
        });
      } else {
        toast({
          title: "Nenhuma nova categoria",
          description: result.message,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar categorias padrão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Apply all defaults (platforms + categories)
  const applyAllDefaults = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");

      let platformsAdded = 0;
      let categoriesAdded = 0;

      // Apply platforms
      try {
        const platformResult = await applyDefaultPlatforms.mutateAsync();
        platformsAdded = platformResult.added;
      } catch (e) {
        console.error("Error applying platform defaults:", e);
      }

      // Apply categories
      try {
        const categoryResult = await applyDefaultExpenseCategories.mutateAsync();
        categoriesAdded = categoryResult.added;
      } catch (e) {
        console.error("Error applying category defaults:", e);
      }

      return { platformsAdded, categoriesAdded };
    },
    onSuccess: (result) => {
      const total = result.platformsAdded + result.categoriesAdded;
      if (total > 0) {
        toast({
          title: "Opções padrão adicionadas!",
          description: `${result.platformsAdded} plataforma(s) e ${result.categoriesAdded} categoria(s) foram adicionadas.`,
        });
      } else {
        toast({
          title: "Nenhuma nova opção",
          description: "Todas as opções padrão já existem.",
        });
      }
    },
  });

  return {
    applyDefaultPlatforms,
    applyDefaultExpenseCategories,
    applyAllDefaults,
  };
}
