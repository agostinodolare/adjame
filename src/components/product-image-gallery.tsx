import { useRef, useState } from "react";
import { ImagePlus, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProductImageGalleryProps = {
  images: Array<string | null>;
  productName: string;
  className?: string;
  imageClassName?: string;
  hoverZoom?: boolean;
};

export function ProductImageGallery({
  images,
  productName,
  className = "",
  imageClassName = "",
  hoverZoom = false,
}: ProductImageGalleryProps) {
  const availableImages = images.filter((image): image is string => Boolean(image));
  const [activeImage, setActiveImage] = useState<string | null>(availableImages[0] ?? null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const hoverImageRef = useRef<HTMLImageElement>(null);
  const displayedImage =
    activeImage && availableImages.includes(activeImage)
      ? activeImage
      : (availableImages[0] ?? null);

  return (
    <>
      <div className={className}>
        <div
          className={`relative overflow-hidden bg-secondary ${hoverZoom ? "cursor-zoom-in" : ""} ${imageClassName}`}
          onMouseMove={(event) => {
            if (!hoverZoom) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const image = hoverImageRef.current;
            if (!image || bounds.width === 0 || bounds.height === 0) return;
            image.style.transformOrigin = `${((event.clientX - bounds.left) / bounds.width) * 100}% ${((event.clientY - bounds.top) / bounds.height) * 100}%`;
            image.style.transform = "scale(2)";
          }}
          onMouseLeave={() => {
            if (!hoverImageRef.current) return;
            hoverImageRef.current.style.transform = "";
            hoverImageRef.current.style.transformOrigin = "";
          }}
        >
          {displayedImage ? (
            <>
              <img
                ref={hoverZoom ? hoverImageRef : undefined}
                src={displayedImage}
                alt={productName}
                className={`size-full object-cover ${hoverZoom ? "transition-transform duration-100 motion-reduce:transition-none" : ""}`}
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute bottom-3 right-3 shadow-md"
                aria-label={`Agrandir la photo de ${productName}`}
                onClick={() => {
                  setZoomedImage(displayedImage);
                  setZoomLevel(1);
                }}
              >
                <ZoomIn className="size-4" />
              </Button>
            </>
          ) : (
            <div className="grid size-full min-h-48 place-items-center text-primary/50">
              <ImagePlus className="size-14" />
            </div>
          )}
        </div>
        {availableImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label={`Photos de ${productName}`}>
            {availableImages.map((image, index) => (
              <Button
                key={image}
                type="button"
                variant="ghost"
                className={`size-16 shrink-0 overflow-hidden rounded-md border p-0 ${
                  displayedImage === image
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                }`}
                onClick={() => setActiveImage(image)}
                aria-label={`Afficher la photo ${index + 1} de ${productName}`}
                aria-pressed={displayedImage === image}
              >
                <img src={image} alt="" className="size-full object-cover" loading="lazy" />
              </Button>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(zoomedImage)}
        onOpenChange={(open) => {
          if (!open) {
            setZoomedImage(null);
            setZoomLevel(1);
          }
        }}
      >
        {zoomedImage && (
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle>{productName}</DialogTitle>
              <DialogDescription>
                Agrandissez l’image pour examiner les détails de l’article.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Dézoomer"
                disabled={zoomLevel <= 1}
                onClick={() => setZoomLevel((level) => Math.max(1, level - 0.5))}
              >
                <ZoomOut className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Zoomer"
                disabled={zoomLevel >= 3}
                onClick={() => setZoomLevel((level) => Math.min(3, level + 0.5))}
              >
                <ZoomIn className="size-4" />
              </Button>
            </div>
            <div className="max-h-[65vh] overflow-auto rounded-md bg-secondary p-2">
              <img
                src={zoomedImage}
                alt={productName}
                className="mx-auto max-h-[62vh] max-w-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
