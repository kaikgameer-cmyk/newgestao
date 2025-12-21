import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Key } from "lucide-react";
import { useUpdateMemberPix, useMemberPix } from "@/hooks/useCompetitions";

interface EditPixModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId: string;
}

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave Aleatória" },
] as const;

const pixFormSchema = z.object({
  pix_key: z.string().min(5, "Informe uma chave Pix válida"),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"], {
    required_error: "Selecione o tipo da chave",
  }),
});

type PixFormValues = z.infer<typeof pixFormSchema>;

export function EditPixModal({ open, onOpenChange, competitionId }: EditPixModalProps) {
  const { data: currentPix, isLoading: loadingPix } = useMemberPix(competitionId);
  const updatePixMutation = useUpdateMemberPix();

  const form = useForm<PixFormValues>({
    resolver: zodResolver(pixFormSchema),
    defaultValues: {
      pix_key: "",
      pix_key_type: "random",
    },
  });

  // Garante que o reset com dados existentes rode apenas UMA vez
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      form.reset({ pix_key: "", pix_key_type: "random" });
      return;
    }

    if (hydratedRef.current) return;
    if (!currentPix) return;

    form.reset({
      pix_key: currentPix.pix_key ?? "",
      pix_key_type: (currentPix.pix_key_type as PixFormValues["pix_key_type"]) ?? "random",
    });

    hydratedRef.current = true;
  }, [open, currentPix, form]);

  const handleSave = async (values: PixFormValues) => {
    await updatePixMutation.mutateAsync({
      competition_id: competitionId,
      pix_key: values.pix_key.trim(),
      pix_key_type: values.pix_key_type,
    });

    onOpenChange(false);
  };

  const isSubmitting = updatePixMutation.isPending || form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Editar Chave PIX
          </DialogTitle>
          <DialogDescription>
            Atualize sua chave PIX para receber prêmios desta competição
          </DialogDescription>
        </DialogHeader>

        {loadingPix ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form className="space-y-4 py-4" onSubmit={form.handleSubmit(handleSave)}>
              <FormField
                control={form.control}
                name="pix_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pix_key_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo da Chave *</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border z-50">
                          {PIX_KEY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* DEBUG TEMPORÁRIO (comentar/remover depois):
              <pre className="text-xs text-muted-foreground break-all">
                {JSON.stringify(form.watch("pix_key"))}
              </pre>
              */}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
