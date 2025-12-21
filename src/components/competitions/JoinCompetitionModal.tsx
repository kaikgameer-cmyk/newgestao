import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

const step1Schema = z.object({
  code: z
    .string()
    .min(6, "Código deve ter 6 caracteres")
    .max(8, "Código inválido")
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  password: z.string().min(1, "Senha é obrigatória"),
});

const step2Schema = z.object({
  pix_key: z.string().min(5, "Informe uma chave Pix válida"),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "phone", "random"], {
    required_error: "Selecione o tipo da chave",
  }),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

interface JoinCompetitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCode?: string;
}

export default function JoinCompetitionModal({ 
  open, 
  onOpenChange, 
  initialCode = "" 
}: JoinCompetitionModalProps) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  
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
      pix_key_type: "random",
    },
  });

  useEffect(() => {
    if (initialCode && open) {
      step1Form.setValue("code", initialCode.toUpperCase());
    }
  }, [initialCode, open, step1Form]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setStep1Data(null);
      step1Form.reset();
      step2Form.reset();
    }
  }, [open, step1Form, step2Form]);

  const onStep1Submit = (values: Step1Values) => {
    setStep1Data(values);
    step2Form.reset({ pix_key: "", pix_key_type: "random" });
    setStep(2);
  };

  const onStep2Submit = async (values: Step2Values) => {
    if (!step1Data) return;

    const result = await joinMutation.mutateAsync({
      code: step1Data.code,
      password: step1Data.password,
      pix_key: values.pix_key,
      pix_key_type: values.pix_key_type || undefined,
    });

    if (result.competition_id) {
      handleClose();
      navigate(`/dashboard/competicoes`);
    }
  };

  const handleClose = () => {
    step1Form.reset();
    step2Form.reset();
    setStep(1);
    setStep1Data(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 1 ? (
              <>
                <LogIn className="w-5 h-5" />
                Entrar em Competição
              </>
            ) : (
              <>
                <Key className="w-5 h-5" />
                Sua Chave PIX
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Digite o código e a senha da competição para participar"
              : "Informe sua chave PIX para receber o prêmio caso ganhe"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
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
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
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
        ) : (
          <Form {...step2Form}>
            <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-4">
              <FormField
                control={step2Form.control}
                name="pix_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                        {...field}
                        value={field.value ?? ""}
                        onChange={field.onChange}
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
                    <FormLabel>Tipo da Chave *</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
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

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={joinMutation.isPending}
                >
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
      </DialogContent>
    </Dialog>
  );
}