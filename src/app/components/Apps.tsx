import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Navigation } from "./Navigation";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import { fetchAiEntries, trackEvent, type AiEntryItem } from "../api/portfolio";

export function Apps() {
  const { i18n } = useTranslation();
  const [items, setItems] = useState<AiEntryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetchAiEntries(i18n.language)
      .then((data) => {
        if (!active) {
          return;
        }
        setItems(data);
        setErrorMessage(null);
      })
      .catch(() => {
        if (active) {
          setItems([]);
          setErrorMessage("AI Apps 加载失败，请稍后再试。");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [i18n.language]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation variant="light" className="bg-background/95 backdrop-blur-sm" />

      <div className="pt-32 pb-24 px-8 md:px-16 max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h1 className="text-4xl md:text-6xl mb-6">AI Apps</h1>
          <p className="text-muted-foreground max-w-2xl">
            A curated list of AI applications and experiments.
          </p>
        </motion.div>

        {errorMessage && (
          <div className="mb-8 border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {errorMessage}
          </div>
        )}

        <div className="space-y-0 border-t border-border">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="py-8 md:py-10 border-b border-border">
                <div className="space-y-4">
                  <div className="h-8 w-1/3 animate-pulse bg-muted" />
                  <div className="h-5 w-2/3 animate-pulse bg-muted" />
                </div>
              </div>
            ))}

          {!isLoading &&
            items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  void trackEvent({
                    eventType: "button_click",
                    targetType: "ai-app",
                    targetId: String(item.id),
                    meta: { title: item.title },
                  })
                }
                className="block py-8 md:py-10 border-b border-border hover:bg-muted/30 transition-colors group"
              >
                <div className="grid md:grid-cols-[1fr_40px] gap-4 md:gap-8 items-center">
                  <div>
                    <h2 className="text-2xl md:text-3xl mb-1 group-hover:translate-x-2 transition-transform">
                      {item.title}
                    </h2>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex justify-end text-muted-foreground group-hover:text-foreground transition-colors">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
              </a>
            ))}

          {!isLoading && items.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">No apps published yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
 
