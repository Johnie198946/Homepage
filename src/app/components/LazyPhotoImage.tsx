import type { ImgHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";

interface LoadSrcOptions {
  forceRefresh?: boolean;
}

interface LazyPhotoImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  cacheKey?: string | number;
  eager?: boolean;
  errorMessage?: string;
  loadSrc: (options?: LoadSrcOptions) => Promise<string | null>;
  placeholderClassName?: string;
}

export function LazyPhotoImage({
  cacheKey,
  eager = false,
  errorMessage = "Image unavailable",
  loadSrc,
  placeholderClassName = "",
  className,
  alt,
  ...imgProps
}: LazyPhotoImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const loadSrcRef = useRef(loadSrc);
  const retryRef = useRef(0);
  const pendingForceRefreshRef = useRef(false);
  const [isVisible, setIsVisible] = useState(eager);
  const [src, setSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    loadSrcRef.current = loadSrc;
  }, [loadSrc]);

  useEffect(() => {
    if (eager) {
      setIsVisible(true);
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [eager]);

  useEffect(() => {
    retryRef.current = 0;
    pendingForceRefreshRef.current = false;
    setSrc(null);
    setHasError(false);
    setReloadToken(0);
  }, [cacheKey]);

  useEffect(() => {
    if (!isVisible || src || hasError) {
      return;
    }

    let active = true;
    const forceRefresh = pendingForceRefreshRef.current;
    pendingForceRefreshRef.current = false;

    void loadSrcRef
      .current({ forceRefresh })
      .then((resolvedSrc) => {
        if (!active) {
          return;
        }
        if (!resolvedSrc) {
          setHasError(true);
          return;
        }
        setSrc(resolvedSrc);
      })
      .catch(() => {
        if (active) {
          setHasError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [hasError, isVisible, reloadToken, src]);

  const handleError = () => {
    if (retryRef.current === 0) {
      retryRef.current += 1;
      pendingForceRefreshRef.current = true;
      setSrc(null);
      setReloadToken((value) => value + 1);
      return;
    }

    setSrc(null);
    setHasError(true);
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      {src ? (
        <img src={src} alt={alt} className={className} onError={handleError} {...imgProps} />
      ) : hasError ? (
        <div
          className={`flex w-full h-full items-center justify-center bg-muted px-4 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground ${placeholderClassName}`}
          role="img"
          aria-label={typeof alt === "string" && alt.trim() ? alt : errorMessage}
        >
          {errorMessage}
        </div>
      ) : (
        <div className={`w-full h-full animate-pulse bg-muted ${placeholderClassName}`} aria-hidden="true" />
      )}
    </div>
  );
}
