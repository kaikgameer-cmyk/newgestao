import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed" | "canceled" | string;
    platform: string;
  }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const alreadyDismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem("pwa-install-dismissed") === "true";

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (alreadyDismissed) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      setIsVisible(false);
    } else {
      window.localStorage.setItem("pwa-install-dismissed", "true");
      setIsVisible(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    window.localStorage.setItem("pwa-install-dismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-6 pointer-events-none">
      <Card
        variant="elevated"
        className="pointer-events-auto w-full max-w-md border-primary/40 shadow-primary bg-background/95 backdrop-blur"
        aria-label="Instalar aplicativo New Gestão"
        role="dialog"
      >
        <CardContent className="flex flex-col gap-3 pt-4 sm:pt-6">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">
              Instale o app New Gestão
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione o New Gestão à tela inicial para acessar mais rápido, em
              modo tela cheia e com melhor desempenho.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              Agora não
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleInstallClick}
              autoFocus
            >
              Instalar app
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
