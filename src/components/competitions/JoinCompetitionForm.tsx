import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { LogIn, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Key } from "lucide-react";
import { useJoinCompetition } from "@/hooks/useCompetitions";
import { supabase } from "@/integrations/supabase/client";

const step1Schema = z.object({
  code: z
    .string()
    .min(6, "Código deve ter 6 caracteres")
    .max(8, "Código inválido")
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  password: z.string().min(1, "Senha é obrigatória"),
});

const step2Schema = z.object({
  pix_key: z.string().min(5, "Chave PIX deve ter no mínimo 5 caracteres").optional(),
  pix_key_type: z.string().optional(),
});

const step3Schema = z.object({
  accepted_terms: z.boolean().refine((v) => v === true, {
    message: "Você precisa aceitar os termos para entrar",
  }),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;

interface JoinCompetitionFormProps {
  initialCode?: string;
}

export default function JoinCompetitionForm({ initialCode = "" }: JoinCompetitionFormProps) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Values | null>(null);
  const [hasPrize, setHasPrize] = useState<boolean | null>(null);
  const [isCheckingCompetition, setIsCheckingCompetition] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  const joinMutation = useJoinCompetition();

  const step1Form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      code: initialCode,
      password: "",
    },
  });

  const step2Form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      pix_key: "",
      pix_key_type: "",
    },
  });

  const step3Form = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      accepted_terms: false,
    },
  });

  useEffect(() => {
    if (initialCode) {
      step1Form.setValue("code", initialCode.toUpperCase());
    }
  }, [initialCode, step1Form]);

  const onStep1Submit = async (values: Step1Values) => {
    setStep1Data(values);
    setStep1Error(null);
    setIsCheckingCompetition(true);

    try {
      const { data, error } = await supabase
        .from("competitions")
        .select("prize_value")
        .eq("code", values.code.toUpperCase())
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar competição", error);
        setStep1Error("Não foi possível buscar a competição. Tente novamente.");
        return;
      }

      if (!data) {
        setStep1Error("Competição não encontrada. Verifique o código digitado.");
        return;
      }

      const hasPrizeFlag = (data.prize_value || 0) > 0;
      setHasPrize(hasPrizeFlag);
      setStep(hasPrizeFlag ? 2 : 3);
    } catch (err) {
      console.error("Erro inesperado ao buscar competição", err);
      setStep1Error("Ocorreu um erro ao buscar a competição. Tente novamente em alguns segundos.");
    } finally {
      setIsCheckingCompetition(false);
    }
  };
  const onStep2Submit = (values: Step2Values) => {
    setStep2Data(values);
    setStep(3);
  };

  const onStep3Submit = async (_values: Step3Values) => {
     if (!step1Data) return;
 
     const result = await joinMutation.mutateAsync({
       code: step1Data.code,
       password: step1Data.password,
       pix_key: hasPrize ? step2Data?.pix_key || "" : "",
       pix_key_type: hasPrize ? step2Data?.pix_key_type || undefined : undefined,
     });
 
     if (result.competition_id) {
-      navigate(`/dashboard/competicoes`);
+      navigate(`/dashboard/competicoes/${result.competition_id}`);
     }
   };

  const handleBack = () => {
    setStep((prev) => (prev === 3 ? (hasPrize ? 2 : 1) : 1));
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {step === 1 && (
            <>
              <LogIn className="w-5 h-5" />
              Entrar em Competição
            </>
          )}
          {step === 2 && (
            <>
              <Key className="w-5 h-5" />
              Sua Chave PIX
            </>
          )}
          {step === 3 && (
            <>
              <Key className="w-5 h-5" />
              Termos de Participação
            </>
          )}
        </CardTitle>
        <CardDescription>
          {step === 1 && "Digite o código e a senha da competição para participar"}
          {step === 2 && "Informe sua chave PIX para receber o prêmio caso ganhe"}
          {step === 3 && "Leia e aceite os termos antes de entrar na competição"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          {hasPrize && (
            <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          )}
          <div className={`h-2 flex-1 rounded-full ${step === 3 ? "bg-primary" : "bg-muted"}`} />
        </div>

        {step === 1 ? (
          <Form {...step1Form}>
            <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
              <FormField
                control={step1Form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código da Competição</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABC123"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "");
                          field.onChange(value);
                        }}
                        maxLength={8}
                        className="font-mono text-lg tracking-wider uppercase"
                      />
                    </FormControl>
                    <FormDescription>
                      Código de 6 caracteres fornecido pelo host
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </Form>
        ) : step === 2 ? (
          <Form {...step2Form}>
            <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
              <FormField
                control={step2Form.control}
                name="pix_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX {hasPrize && "*"}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Esta chave será usada para receber seu prêmio caso você ganhe
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={step2Form.control}
                name="pix_key_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo da Chave (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" className="flex-1">
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...step3Form}>
            <form onSubmit={step3Form.handleSubmit(onStep3Submit)} className="space-y-4">
              <FormField
                control={step3Form.control}
                name="accepted_terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/40">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Eu li e aceito os termos da competição e me comprometo com resultados reais.
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={joinMutation.isPending}>
                  {joinMutation.isPending ? (
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
      </CardContent>
    </Card>
  );
}
