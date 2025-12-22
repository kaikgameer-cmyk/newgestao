import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, Fuel, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import heroCarImage from "@/assets/hero-car.png";
import logo from "@/assets/logo-ng.png";
import { z } from "zod";

// Zod schema for input validation
const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email é obrigatório")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .email("Formato de email inválido"),
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres"),
});

// Simple client-side rate limiting for login attempts
const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 60000, // 1 minute
  attempts: [] as number[],
};

function checkLoginRateLimit(): { allowed: boolean; waitTime: number } {
  const now = Date.now();
  // Remove old attempts outside the window
  LOGIN_RATE_LIMIT.attempts = LOGIN_RATE_LIMIT.attempts.filter(
    (t) => now - t < LOGIN_RATE_LIMIT.windowMs
  );
  
  if (LOGIN_RATE_LIMIT.attempts.length >= LOGIN_RATE_LIMIT.maxAttempts) {
    const oldestAttempt = LOGIN_RATE_LIMIT.attempts[0];
    const waitTime = Math.ceil((LOGIN_RATE_LIMIT.windowMs - (now - oldestAttempt)) / 1000);
    return { allowed: false, waitTime };
  }
  
  LOGIN_RATE_LIMIT.attempts.push(now);
  return { allowed: true, waitTime: 0 };
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  // Forgot password modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  // Check for recovery tokens in URL hash and redirect to /definir-senha
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes("access_token") || hash.includes("type=recovery"))) {
      console.log("[LOGIN] Detected recovery tokens in hash, redirecting to /definir-senha");
      // Redirect to definir-senha with the hash intact
      navigate(`/definir-senha${hash}`, { replace: true });
      return;
    }
  }, [navigate]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Check rate limit before attempting login
    const rateLimit = checkLoginRateLimit();
    if (!rateLimit.allowed) {
      toast({
        title: "Muitas tentativas",
        description: `Aguarde ${rateLimit.waitTime} segundos antes de tentar novamente.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email.toLowerCase().trim(),
        password: result.data.password,
      });

      if (error) {
        // Handle specific error types
        let errorMessage = "Email ou senha incorretos";
        
        if (error.message.includes("rate limit")) {
          errorMessage = "Muitas tentativas de login. Tente novamente em alguns minutos.";
        } else if (error.message === "Invalid login credentials") {
          errorMessage = "Email ou senha incorretos";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Email não confirmado. Verifique sua caixa de entrada.";
        }
        
        toast({
          title: "Erro ao entrar",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bem-vindo!",
          description: "Login realizado com sucesso",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    
    const emailValidation = z.string().email("Formato de email inválido").safeParse(forgotEmail);
    if (!emailValidation.success) {
      setForgotError(emailValidation.error.errors[0].message);
      return;
    }

    setForgotLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("resend-password-link", {
        body: { email: forgotEmail.toLowerCase().trim() },
      });

      if (error) {
        throw new Error(error.message || "Erro ao processar solicitação");
      }

      if (data?.error) {
        setForgotError(data.error);
        return;
      }

      toast({
        title: "Link enviado!",
        description: data?.message || "Verifique sua caixa de entrada.",
      });
      setForgotPasswordOpen(false);
      setForgotEmail("");
    } catch (error: any) {
      setForgotError(error.message || "Ocorreu um erro inesperado");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroCarImage}
            alt="Carro de app à noite"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12">
          <Link to="/" className="flex items-center gap-2 mb-12">
            <img src={logo} alt="New Gestão" className="w-10 h-10" />
            <span className="text-xl font-semibold">New Gestão</span>
          </Link>
          
          <h1 className="text-4xl font-bold mb-4">
            Seu painel financeiro de motorista
          </h1>
          <p className="text-xl text-muted-foreground mb-12">
            Acompanhe seus ganhos e despesas de forma simples
          </p>
          
          {/* Floating stats cards */}
          <div className="space-y-4">
            <Card className="inline-flex animate-float bg-card/90 backdrop-blur-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lucro da semana</p>
                  <p className="text-xl font-bold">R$ 1.250</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="inline-flex animate-float ml-8 bg-card/90 backdrop-blur-sm" style={{ animationDelay: "1s" }}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Fuel className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Combustível</p>
                  <p className="text-xl font-bold">18% das despesas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <img src={logo} alt="New Gestão" className="w-10 h-10" />
            <span className="text-xl font-semibold">New Gestão</span>
          </div>
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-2">Entrar</h2>
            <p className="text-muted-foreground">
              Acesse sua conta para ver seus resultados
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={errors.password ? "border-destructive" : ""}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            
            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
            
            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotError("");
                  setForgotPasswordOpen(true);
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueci minha senha / Definir senha
              </button>
            </div>
          </form>
          
          <p className="text-center text-sm text-muted-foreground">
            Seu painel financeiro de motorista, em segundos.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Definir Senha
            </DialogTitle>
            <DialogDescription>
              Digite seu email para receber um link de definição de senha.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className={forgotError ? "border-destructive" : ""}
                autoFocus
              />
              {forgotError && (
                <p className="text-sm text-destructive">{forgotError}</p>
              )}
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotPasswordOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={forgotLoading || !forgotEmail}
              >
                {forgotLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Link"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
