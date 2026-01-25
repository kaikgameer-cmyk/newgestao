import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Redirect page for deprecated features (Competitions/Ranking)
 * Shows toast and redirects to dashboard
 */
export default function DeprecatedFeature() {
  const navigate = useNavigate();

  useEffect(() => {
    toast.info("Este recurso foi descontinuado", {
      description: "Você foi redirecionado para o Dashboard",
      duration: 4000,
    });
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}
