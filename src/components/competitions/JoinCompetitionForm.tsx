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
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { useJoinCompetition } from "@/hooks/useCompetitions";

const joinSchema = z.object({
  code: z
    .string()
    .min(6, "Código deve ter 6 caracteres")
    .max(8, "Código inválido")
    .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  password: z.string().min(1, "Senha é obrigatória"),
});

type JoinFormValues = z.infer<typeof joinSchema>;

interface JoinCompetitionFormProps {
  initialCode?: string;
}

export default function JoinCompetitionForm({ initialCode = "" }: JoinCompetitionFormProps) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const joinMutation = useJoinCompetition();

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: {
      code: initialCode,
      password: "",
    },
  });

  useEffect(() => {
    if (initialCode) {
      form.setValue("code", initialCode.toUpperCase());
    }
  }, [initialCode, form]);

  const onSubmit = async (values: JoinFormValues) => {
    const result = await joinMutation.mutateAsync({
      code: values.code,
      password: values.password,
    });
    if (result.competition_id) {
      navigate(`/dashboard/competicoes`);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogIn className="w-5 h-5" />
          Entrar em Competição
        </CardTitle>
        <CardDescription>
          Digite o código e a senha da competição para participar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
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
              control={form.control}
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

            <Button
              type="submit"
              className="w-full"
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
                  Entrar na Competição
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
