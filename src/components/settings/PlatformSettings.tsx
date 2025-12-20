import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Car, Loader2 } from "lucide-react";
import { usePlatforms } from "@/hooks/usePlatforms";

export function PlatformSettings() {
  const {
    platforms,
    userPlatforms,
    loadingPlatforms,
    loadingUserPlatforms,
    initializeUserPlatforms,
    togglePlatform,
    isPlatformEnabled,
  } = usePlatforms();

  // Initialize user platforms when component mounts
  useEffect(() => {
    if (platforms.length > 0 && userPlatforms.length === 0) {
      initializeUserPlatforms.mutate();
    }
  }, [platforms.length, userPlatforms.length]);

  const isLoading = loadingPlatforms || loadingUserPlatforms;

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Plataformas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Plataformas</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione as plataformas que você trabalha. Apenas as habilitadas aparecerão ao lançar receitas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {platforms.map((platform) => (
          <div
            key={platform.key}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  platform.key === "uber"
                    ? "bg-black"
                    : platform.key === "99"
                    ? "bg-[#FFB800]"
                    : platform.key === "indrive"
                    ? "bg-[#2DCC70]"
                    : "bg-primary"
                }`}
              />
              <Label htmlFor={`platform-${platform.key}`} className="font-medium cursor-pointer">
                {platform.name}
              </Label>
              {platform.is_other && (
                <span className="text-xs text-muted-foreground">(permite nome customizado)</span>
              )}
            </div>
            <Switch
              id={`platform-${platform.key}`}
              checked={isPlatformEnabled(platform.key)}
              onCheckedChange={(checked) =>
                togglePlatform.mutate({ platformKey: platform.key, enabled: checked })
              }
              disabled={togglePlatform.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
