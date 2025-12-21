import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  firstName,
  lastName,
  email,
}: AvatarUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const getFullAvatarUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Validate file
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Formato inválido. Use JPG, PNG ou WebP.");
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Arquivo muito grande. Máximo 2MB.");
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        await supabase.storage.from("avatars").remove([currentAvatarUrl]);
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      return filePath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setPreviewUrl(null);
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi salva com sucesso.",
      });
    },
    onError: (error: Error) => {
      setPreviewUrl(null);
      toast({
        title: "Erro ao enviar foto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!currentAvatarUrl) return;

      // Delete from storage
      await supabase.storage.from("avatars").remove([currentAvatarUrl]);

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast({
        title: "Foto removida",
        description: "Sua foto de perfil foi removida.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover foto",
        description: "Não foi possível remover a foto.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadMutation.mutate(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isLoading = uploadMutation.isPending || removeMutation.isPending;
  const displayUrl = previewUrl || getFullAvatarUrl(currentAvatarUrl);

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <UserAvatar
          avatarUrl={displayUrl}
          firstName={firstName}
          lastName={lastName}
          email={email}
          size="lg"
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="gap-2"
          >
            <Camera className="w-4 h-4" />
            {currentAvatarUrl ? "Alterar foto" : "Adicionar foto"}
          </Button>
          {currentAvatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeMutation.mutate()}
              disabled={isLoading}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          JPG, PNG ou WebP. Máximo 2MB.
        </p>
      </div>
    </div>
  );
}
