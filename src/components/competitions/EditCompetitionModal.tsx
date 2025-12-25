import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCompetition } from "@/hooks/useCompetitions";
import { format, parseISO } from "date-fns";

const editCompetitionSchema = z
  .object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
    description: z
      .string()
      .max(3000, "A descrição deve ter no máximo 3000 caracteres.")
      .optional(),
    goal_value: z.coerce.number().positive("Meta deve ser maior que zero"),
    has_prize: z.boolean().default(false),
    prize_value: z
      .preprocess(
        (val) => {
          if (val === "" || val === undefined || val === null) return null;
          const num = Number(val);
          return Number.isFinite(num) ? num : null;
        },
        z
          .number()
          .nonnegative("Prêmio não pode ser negativo")
          .nullable()
      ),
    start_date: z.string().min(1, "Data inicial é obrigatória"),
    end_date: z.string().min(1, "Data final é obrigatória"),
    max_members: z.coerce.number().int().min(2).optional().nullable(),
  })
  .refine((data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  }, {
    message: "Data final não pode ser anterior à data inicial",
    path: ["end_date"],
  })
  .superRefine((data, ctx) => {
    if (data.has_prize) {
      if (data.prize_value === null || data.prize_value === undefined || data.prize_value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["prize_value"],
          message: "Valor do prêmio é obrigatório e deve ser maior que zero",
        });
      }
    }
  });

type EditCompetitionFormValues = z.infer<typeof editCompetitionSchema>;

interface EditCompetitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: {
    id: string;
    name: string;
    description?: string | null;
    goal_value: number;
    prize_value: number;
    has_prize?: boolean | null;
    start_date: string;
    end_date: string;
    max_members?: number | null;
  };
}

export function EditCompetitionModal({
  open,
  onOpenChange,
  competition,
}: EditCompetitionModalProps) {
  const updateMutation = useUpdateCompetition();

  const initialHasPrize = competition.has_prize ?? competition.prize_value > 0;

  const form = useForm<EditCompetitionFormValues>({
    resolver: zodResolver(editCompetitionSchema),
    defaultValues: {
      name: competition.name,
      description: competition.description || "",
      goal_value: competition.goal_value,
      has_prize: initialHasPrize,
      prize_value: initialHasPrize ? competition.prize_value : null,
      start_date: competition.start_date,
      end_date: competition.end_date,
      max_members: competition.max_members || null,
    },
  });

  const watchHasPrize = form.watch("has_prize");

  // Reset form when modal opens or competition changes
  useEffect(() => {
    if (open) {
      const currentHasPrize = competition.has_prize ?? competition.prize_value > 0;
      form.reset({
        name: competition.name,
        description: competition.description || "",
        goal_value: competition.goal_value,
        has_prize: currentHasPrize,
        prize_value: currentHasPrize ? competition.prize_value : null,
        start_date: competition.start_date,
        end_date: competition.end_date,
        max_members: competition.max_members || null,
      });
    }
  }, [open, competition, form]);

  const onSubmit = async (values: EditCompetitionFormValues) => {
    await updateMutation.mutateAsync({
      competition_id: competition.id,
      name: values.name,
      description: values.description,
      goal_value: values.goal_value,
      has_prize: values.has_prize,
      prize_value: values.has_prize ? values.prize_value ?? null : null,
      start_date: values.start_date,
      end_date: values.end_date,
      max_members: values.max_members || undefined,
    });
    onOpenChange(false);
  };

  const formatDateForInput = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "yyyy-MM-dd");
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Editar Competição
          </DialogTitle>
          <DialogDescription>
            Atualize os dados da competição. Apenas o host pode fazer isso.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da competição" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição da competição... Suporta **negrito**, *itálico*, listas e [links](url)"
                      className="resize-none"
                      rows={4}
                      maxLength={3000}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Suporta formatação markdown: **negrito**, *itálico*, listas e links
                  </FormDescription>
                  <div className="text-xs text-muted-foreground text-right">
                    {field.value?.length || 0}/3000
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="goal_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="1000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchHasPrize && (
                <FormField
                  control={form.control}
                  name="prize_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prêmio (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="100"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="has_prize"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Competição com prêmio</FormLabel>
                    <FormDescription>
                      Habilite para definir um valor de prêmio
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          form.setValue("prize_value", null);
                          form.clearErrors("prize_value");
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={formatDateForInput(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fim</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={formatDateForInput(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="max_members"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máximo de Participantes (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="2"
                      placeholder="Sem limite"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === "" ? null : Number(val));
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Deixe em branco para não ter limite
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
