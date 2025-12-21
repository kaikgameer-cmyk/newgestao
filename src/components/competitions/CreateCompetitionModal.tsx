import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, Loader2, Copy, Check, Trophy } from "lucide-react";
import { useCreateCompetition } from "@/hooks/useCompetitions";
import { format, addDays } from "date-fns";

const createSchema = z
  .object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
    description: z.string().max(500).optional(),
    goal_value: z.coerce.number().positive("Meta deve ser maior que zero"),
    prize_value: z.coerce.number().positive("Prêmio deve ser maior que zero"),
    start_date: z.string().min(1, "Data de início é obrigatória"),
    end_date: z.string().min(1, "Data de fim é obrigatória"),
    password: z.string().min(4, "Senha deve ter pelo menos 4 caracteres"),
    confirm_password: z.string(),
    max_members: z.coerce.number().int().positive().optional().or(z.literal("")),
    allow_teams: z.boolean().default(false),
    team_size: z.coerce.number().int().min(2).optional().or(z.literal("")),
    host_participates: z.boolean().default(true),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Senhas não conferem",
    path: ["confirm_password"],
  })
  .refine((data) => new Date(data.end_date) >= new Date(data.start_date), {
    message: "Data de fim deve ser após data de início",
    path: ["end_date"],
  })
  .refine((data) => !data.allow_teams || (data.team_size && Number(data.team_size) >= 2), {
    message: "Tamanho do time deve ser no mínimo 2",
    path: ["team_size"],
  });

type CreateFormValues = z.infer<typeof createSchema>;

interface CreateCompetitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCompetitionModal({
  open,
  onOpenChange,
}: CreateCompetitionModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateCompetition();

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultEnd = format(addDays(new Date(), 30), "yyyy-MM-dd");

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      description: "",
      goal_value: 0,
      prize_value: 0,
      start_date: today,
      end_date: defaultEnd,
      password: "",
      confirm_password: "",
      max_members: "",
      allow_teams: false,
      team_size: "",
      host_participates: true,
    },
  });

  const watchAllowTeams = form.watch("allow_teams");

  const onSubmit = async (values: CreateFormValues) => {
    const result = await createMutation.mutateAsync({
      name: values.name,
      description: values.description,
      goal_type: "income_goal",
      goal_value: values.goal_value,
      prize_value: values.prize_value,
      start_date: values.start_date,
      end_date: values.end_date,
      password: values.password,
      max_members: values.max_members ? Number(values.max_members) : undefined,
      allow_teams: values.allow_teams,
      team_size: values.team_size ? Number(values.team_size) : undefined,
      host_participates: values.host_participates,
    });

    if (result.code) {
      setCreatedCode(result.code);
    }
  };

  const handleCopyCode = async () => {
    if (!createdCode) return;
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setCreatedCode(null);
    form.reset();
    onOpenChange(false);
  };

  if (createdCode) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Trophy className="w-5 h-5" />
              Competição Criada!
            </DialogTitle>
            <DialogDescription>
              Envie o código + senha para seus amigos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código da Competição</label>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-3 bg-muted rounded-lg text-2xl font-mono tracking-widest text-center">
                  {createdCode}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Clique para copiar o código
              </p>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-500 font-medium">
                ⚠️ A senha é obrigatória para entrar. Envie o código e a senha separadamente para os participantes!
              </p>
            </div>
          </div>

          <Button onClick={handleClose} className="w-full">
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Competição</DialogTitle>
          <DialogDescription>
            Configure os detalhes da competição e defina uma senha
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Competição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Desafio de Janeiro" {...field} />
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
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o objetivo da competição..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
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
                    <FormLabel>Meta de Receita (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="5000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prize_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Prêmio (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                    <FormLabel>Data de Fim *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha *</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="host_participates"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Host vai participar?</FormLabel>
                    <FormDescription>
                      Se desativado, você gerencia mas não entra no ranking
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_members"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx. Participantes</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Sem limite"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>Deixe em branco para sem limite</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allow_teams"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Habilitar Times</FormLabel>
                    <FormDescription>
                      Dividir participantes em equipes
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchAllowTeams && (
              <FormField
                control={form.control}
                name="team_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamanho do Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 5"
                        min={2}
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Quantidade de membros por time (mínimo 2)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Competição"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
