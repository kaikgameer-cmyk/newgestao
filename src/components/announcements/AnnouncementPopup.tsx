import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone, Loader2, X } from "lucide-react";
import { useAnnouncementPrompt } from "@/hooks/useAnnouncementPrompt";

export function AnnouncementPopup() {
  const {
    shouldShowModal,
    announcement,
    acknowledgeAnnouncement,
    dismissAnnouncement,
    isAcking,
  } = useAnnouncementPrompt();

  if (!shouldShowModal || !announcement) return null;

  return (
    <Dialog open={shouldShowModal} onOpenChange={(open) => !open && dismissAnnouncement()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <button
          onClick={dismissAnnouncement}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>

        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">
              {announcement.title || "Aviso"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription asChild>
          <div className="py-4">
            <div className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
              {announcement.message}
            </div>
          </div>
        </DialogDescription>

        <div className="flex justify-end pt-2">
          <Button
            onClick={acknowledgeAnnouncement}
            disabled={isAcking}
            className="min-w-[100px]"
          >
            {isAcking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "OK, entendi"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
