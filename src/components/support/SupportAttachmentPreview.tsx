import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ZoomIn, X, ExternalLink, ImageOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Attachment {
  url: string;
  name: string;
  type?: string;
  size?: number;
  path?: string;
}

interface SupportAttachmentPreviewProps {
  attachment: Attachment;
  className?: string;
}

export function SupportAttachmentPreview({ attachment, className }: SupportAttachmentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch fresh signed URL when component mounts or path changes
  useEffect(() => {
    async function fetchSignedUrl() {
      setIsLoading(true);
      setHasError(false);

      // If we have a path, get a fresh signed URL
      if (attachment.path) {
        const { data, error } = await supabase.storage
          .from("support-attachments")
          .createSignedUrl(attachment.path, 3600); // 1 hour expiry

        if (error || !data?.signedUrl) {
          console.error("Error fetching signed URL:", error);
          setHasError(true);
          setIsLoading(false);
          return;
        }
        setImageUrl(data.signedUrl);
      } else {
        // Fallback to stored URL (may be expired)
        setImageUrl(attachment.url);
      }
      setIsLoading(false);
    }

    fetchSignedUrl();
  }, [attachment.path, attachment.url]);

  if (isLoading) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center p-6 rounded-xl bg-muted/50 border border-border",
          "w-[160px] h-[120px] md:w-[200px] md:h-[140px]",
          className
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError || !imageUrl) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border text-muted-foreground",
          "max-w-[320px] md:max-w-[320px] max-w-[260px]",
          className
        )}
      >
        <ImageOff className="h-4 w-4 flex-shrink-0" />
        <span className="text-xs">Não foi possível carregar o anexo</span>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <div 
        className={cn(
          "relative group cursor-pointer",
          "max-w-[260px] md:max-w-[320px]",
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <div className="relative overflow-hidden rounded-xl border border-border/50 bg-background/80">
          <img
            src={imageUrl}
            alt={attachment.name}
            loading="lazy"
            onError={() => setHasError(true)}
            className={cn(
              "w-full object-cover rounded-xl",
              "max-h-[160px] md:max-h-[180px]"
            )}
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl">
            <div className="flex items-center gap-1 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded-full">
              <ZoomIn className="h-3.5 w-3.5" />
              <span>Ampliar</span>
            </div>
          </div>
        </div>
        
        {/* Zoom indicator */}
        <button
          className="absolute bottom-2 right-2 p-1.5 bg-background/90 hover:bg-background border border-border rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <ZoomIn className="h-3.5 w-3.5 text-foreground" />
        </button>
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden"
          hideCloseButton
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            
            {/* Open in new tab button */}
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 right-16 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <ExternalLink className="h-5 w-5 text-white" />
            </a>

            {/* Full size image */}
            <img
              src={imageUrl}
              alt={attachment.name}
              className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
