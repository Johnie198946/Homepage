import { useEffect, ReactNode, useRef, useState } from "react";

interface ImageProtectionProps {
  children: ReactNode;
  watermarkText?: string;
}

export function ImageProtection({ children, watermarkText = "© Johnie Photography" }: ImageProtectionProps) {
  const [showProtectionOverlay, setShowProtectionOverlay] = useState(false);
  const overlayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const flashProtectionOverlay = (durationMs = 1200) => {
      setShowProtectionOverlay(true);
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
      }
      overlayTimerRef.current = window.setTimeout(() => {
        setShowProtectionOverlay(false);
        overlayTimerRef.current = null;
      }, durationMs);
    };

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      flashProtectionOverlay(900);
      return false;
    };

    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      flashProtectionOverlay(900);
      return false;
    };

    // Disable keyboard shortcuts for saving/copying
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        flashProtectionOverlay();
        return false;
      }
      // Disable Ctrl+Shift+S (Save As)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "s") {
        e.preventDefault();
        flashProtectionOverlay();
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "x")) {
        e.preventDefault();
        flashProtectionOverlay();
        return false;
      }
      // Disable Print Screen (limited effectiveness)
      if (e.key === "PrintScreen") {
        e.preventDefault();
        flashProtectionOverlay(1500);
        document.body.style.filter = "blur(12px)";
        setTimeout(() => {
          document.body.style.filter = "none";
        }, 250);
        return false;
      }
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative select-none">
      <div className="pointer-events-auto">{children}</div>

      {showProtectionOverlay && (
        <div className="absolute inset-0 pointer-events-none select-none bg-black/30 backdrop-blur-[2px]">
          <div
            className="absolute inset-0 flex items-center justify-center text-white/35 text-3xl md:text-5xl font-semibold tracking-[0.35em] uppercase"
            style={{
              transform: "rotate(-24deg)",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {watermarkText}
          </div>
        </div>
      )}
    </div>
  );
}
