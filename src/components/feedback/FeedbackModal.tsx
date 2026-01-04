import { useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFeedback } from "@/hooks/useFeedback";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function FeedbackModal() {
  const { activeCampaign, shouldShowModal, submitResponse, dismissResponse } = useFeedback();
  const { toast } = useToast();
  
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState("");

  if (!shouldShowModal || !activeCampaign) {
    return null;
  }

  const handleSubmit = async () => {
    if (stars === 0) {
      toast({ title: "Selecione uma nota", description: "Clique nas estrelas para avaliar", variant: "destructive" });
      return;
    }

    try {
      await submitResponse.mutateAsync({ stars, comment });
      toast({ title: "Obrigado pela avaliação!", description: "Seu feedback é muito importante para nós." });
    } catch {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissResponse.mutateAsync();
    } catch {
      // Silently handle - user just wants to close
    }
  };

  const isSubmitting = submitResponse.isPending || dismissResponse.isPending;

  return (
    <Dialog open={shouldShowModal} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleDismiss}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>

        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-semibold text-center">
            {activeCampaign.title}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {activeCampaign.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStars(value)}
                onMouseEnter={() => setHoverStars(value)}
                onMouseLeave={() => setHoverStars(0)}
                disabled={isSubmitting}
                className="p-1 transition-transform hover:scale-110 disabled:opacity-50"
              >
                <Star
                  className={cn(
                    "w-10 h-10 transition-colors",
                    (hoverStars || stars) >= value
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Conte mais sobre sua experiência (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || stars === 0}
            variant="hero"
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Avaliação"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
