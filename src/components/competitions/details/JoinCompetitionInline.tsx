import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { LogIn, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Key, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPixKey, detectPixType, type PixKeyType } from "@/lib/pixMasks";

// Schema for step 1: password
const step1Schema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
});

// Schema for step 2: transparency acceptance
const step2Schema = z.object({
  transparencyAccepted: z.boolean().refine((val) => val === true, {
    message: "Você precisa aceitar o compromisso de transparência",
  }),
});

// Schema for step 3: PIX
const step3Schema = z.object({
  pix_key: z.string().min(3, "Chave PIX deve ter no mínimo 3 caracteres").max(140, "Chave muito longa"),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"], {
    required_error: "Selecione o tipo da chave",
  }),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;

interface JoinCompetitionInlineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitionId: string;
  competitionName: string;
  hasPrize: boolean;
}

export function JoinCompetitionInline({
  open,
  onOpenChange,
  competitionId,
  competitionName,
  hasPrize,
}: JoinCompetitionInlineProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step1Form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { password: "" },
  });

  const step2Form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { transparencyAccepted: false },
  });

  const step3Form = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      pix_key: "",
      pix_key_type: "" as unknown as Step3Values["pix_key_type"],
    },
  });

  const resetForms = () => {
    step1Form.reset();
    step2Form.reset();
    step3Form.reset();
    setStep(1);
    setStep1Data(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForms();
    onOpenChange(false);
  };

  const onStep1Submit = (values: Step1Values) => {
    setStep1Data(values);
    setStep(2);
  };

  const onStep2Submit = () => {
    if (!hasPrize) {
      // Competição sem prêmio: pula etapa de PIX e entra direto com chave fictícia
      onStep3Submit({
        pix_key: "sem-premio",
        pix_key_type: "random",
      } as Step3Values);
    } else {
      setStep(3);
    }
  };

  const onStep3Submit = async (values: Step3Values) => {
    if (!step1Data) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("join_competition_with_password", {
        p_competition_id: competitionId,
        p_password: step1Data.password,
        p_pix_key: values.pix_key,
        p_pix_key_type: values.pix_key_type,
      });

      if (error) throw error;

      const result = data as { competition_id: string; membership_id: string; message: string };

      if (result.message === "already_member") {
        toast.info("Você já participa desta competição (PIX atualizado)");
      } else {
        toast.success(`Você entrou na competição "${competitionName}"!`);
      }

      await queryClient.invalidateQueries({ queryKey: ["competition-dashboard", competitionId] });
      await queryClient.invalidateQueries({ queryKey: ["competitions-for-tabs"] });

      handleClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao entrar na competição";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedPixType = step3Form.watch("pix_key_type") as PixKeyType;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 && (
              <>
                <LogIn className="w-5 h-5" />
                Senha da Competição
              </>
            )}
            {step === 2 && (
              <>
                <Shield className="w-5 h-5" />
                Compromisso de Transparência
              </>
            )}
            {step === 3 && hasPrize && (
              <>
                <Key className="w-5 h-5" />
                Sua Chave PIX
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Digite a senha fornecida pelo organizador"}
            {step === 2 && "Confirme seu compromisso com resultados reais"}
            {step === 3 && hasPrize && "Informe sua chave PIX para receber o prêmio"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          {hasPrize && (
            <div className={`h-2 flex-1 rounded-full ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>

        {step === 1 && (
          <Form {...step1Form}>
            <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
              <FormField
                control={step1Form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
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
                    <FormDescription>
                      Senha fornecida pelo organizador da competição
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === 2 && (
          <Form {...step2Form}>
            <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Esta competição é baseada nos seus lançamentos reais de receita.</p>
                <p>
                  <strong className="text-foreground">Não tente manipular resultados.</strong> O
                  objetivo é evolução, disciplina e competição saudável.
                </p>
                <p>
                  Ao confirmar, você se compromete com honestidade total nos seus lançamentos.
                </p>
              </div>

              <FormField
                control={step2Form.control}
                name="transparencyAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/40">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Eu concordo e me comprometo a lançar resultados com 100% de transparência
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!step2Form.watch("transparencyAccepted")}
                >
                  Confirmar e continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === 3 && hasPrize && (
          <Form {...step3Form}>
            <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-4">
              <FormField
                control={step3Form.control}
                name="pix_key_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo da Chave *</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(val) => {
                        field.onChange(val);
                        const currentKey = step3Form.getValues("pix_key");
                        if (currentKey) {
                          step3Form.setValue(
                            "pix_key",
                            formatPixKey(currentKey, val as PixKeyType),
                          );
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="phone">Celular</SelectItem>
                        <SelectItem value="random">Chave Aleatória</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step3Form.control}
                name="pix_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          watchedPixType === "cpf"
                            ? "000.000.000-00"
                            : watchedPixType === "email"
                              ? "seu@email.com"
                              : watchedPixType === "phone"
                                ? "(00) 00000-0000"
                                : "Sua chave PIX"
                        }
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const type = step3Form.getValues("pix_key_type") || detectPixType(val);
                          field.onChange(formatPixKey(val, type as PixKeyType));
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Esta chave será usada para receber seu prêmio caso você ganhe
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
