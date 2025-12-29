import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateTicket } from "@/hooks/useSupport";
import { ticketCreateSchema, TicketCreateInput } from "@/lib/supportSchemas";
import { toast } from "@/hooks/use-toast";
import { Loader2, ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NewTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketCreated: (ticketId: string) => void;
  userId: string;
}

export function NewTicketModal({
  open,
  onOpenChange,
  onTicketCreated,
  userId,
}: NewTicketModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<Array<{ file: File; preview: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createTicket = useCreateTicket();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 3) {
      toast({
        title: "Muitas imagens",
        description: "Você pode anexar no máximo 3 imagens por ticket.",
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name} não é uma imagem.`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede 5MB.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [
          ...prev,
          { file, preview: e.target?.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = ticketCreateSchema.safeParse({
      subject: subject.trim() || undefined,
      message: message.trim(),
      images: images.length > 0 ? images : undefined,
    });

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    try {
      // Upload images
      let uploadedAttachments: Array<{
        path: string;
        url: string;
        type: string;
        size: number;
        name: string;
      }> = [];

      if (images.length > 0) {
        uploadedAttachments = await Promise.all(
          images.map(async (img) => {
            const fileExt = img.file.name.split(".").pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const tempTicketId = `temp-${Date.now()}`;
            const filePath = `support/${userId}/${tempTicketId}/${Date.now()}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("support-attachments")
              .upload(filePath, img.file, {
                cacheControl: "3600",
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from("support-attachments")
              .getPublicUrl(filePath);

            return {
              path: filePath,
              url: urlData.publicUrl,
              type: img.file.type,
              size: img.file.size,
              name: img.file.name,
            };
          })
        );
      }

      const result = await createTicket.mutateAsync({
        userId,
        subject: subject.trim() || undefined,
        message: message.trim(),
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });

      onTicketCreated(result.ticket.id);
      setSubject("");
      setMessage("");
      setImages([]);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating ticket:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Ticket de Suporte</DialogTitle>
          <DialogDescription>
            Descreva seu problema e anexe prints se necessário. Nossa equipe responderá em breve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Assunto (opcional)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Erro ao carregar dashboard"
              maxLength={80}
            />
            {errors.subject && (
              <p className="text-sm text-destructive mt-1">{errors.subject}</p>
            )}
          </div>

          <div>
            <Label htmlFor="message">Descreva o problema *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva em detalhes o que aconteceu..."
              className="min-h-[120px]"
              maxLength={3000}
            />
            {errors.message && (
              <p className="text-sm text-destructive mt-1">{errors.message}</p>
            )}
          </div>

          <div>
            <Label>Anexar Imagens (até 3)</Label>
            <div className="mt-2 flex gap-2 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img.preview}
                    alt="preview"
                    className="w-24 h-24 object-cover rounded border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <label className="w-24 h-24 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </label>
              )}
            </div>
            {errors.images && (
              <p className="text-sm text-destructive mt-1">{errors.images}</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Ticket"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
