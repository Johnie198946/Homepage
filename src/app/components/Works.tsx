import { useEffect, useMemo, useState } from "react";
import { Navigation } from "./Navigation";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchCollections, type CollectionItem } from "../api/portfolio";

type WorkItem = {
  id: number;
  title: string;
  subtitle: string;
  meta: string;
  date: string;
  category: string;
  link: string;
};

export function Works() {
  const { t, i18n } = useTranslation();
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const toWorkItem = (collection: CollectionItem): WorkItem => ({
      id: collection.id,
      title: collection.location,
      subtitle: collection.description || collection.category,
      meta: `${collection.photoCount} ${t("gallery.photos")}`,
      date: new Date(collection.createdAt).getFullYear().toString(),
      category: collection.category,
      link: `/gallery?location=${encodeURIComponent(collection.locationEn)}`,
    });

    void fetchCollections(i18n.language)
      .then((items) => {
        if (!active) {
          return;
        }
        const nextWorks = items
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
          .map(toWorkItem);
        setWorks(nextWorks);
      })
      .catch(() => {
        if (active) {
          setWorks([]);
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
  }, [i18n.language, t]);

  const yearRange = useMemo(() => {
    if (works.length === 0) {
      return "";
    }
    const years = works
      .map((item) => Number(item.date))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    if (years.length === 0) {
      return "";
    }
    const first = years[0];
    const last = years[years.length - 1];
    return first === last ? `${first}` : `${first} - ${last}`;
  }, [works]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation variant="light" className="bg-background/95 backdrop-blur-sm" />

      <div className="pt-32 pb-24 px-8 md:px-16 max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h1 className="text-4xl md:text-6xl mb-6">{t("works.title")}</h1>
          <p className="text-muted-foreground max-w-2xl">
            {t("works.description")}
          </p>
        </motion.div>

        <div className="space-y-0 border-t border-border">
          {works.map((work, index) => (
            <motion.div
              key={work.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Link
                to={work.link}
                className="block py-8 md:py-10 border-b border-border hover:bg-muted/30 transition-colors group"
              >
                <div className="grid md:grid-cols-[1fr_200px_120px_80px] gap-4 md:gap-8 items-center">
                  <div>
                    <h2 className="text-2xl md:text-3xl mb-1 group-hover:translate-x-2 transition-transform">
                      {work.title}
                    </h2>
                    <p className="text-muted-foreground">{work.subtitle}</p>
                  </div>
                  <div className="text-muted-foreground text-sm md:text-base">{work.meta}</div>
                  <div className="text-muted-foreground text-sm uppercase tracking-wider">
                    {work.category}
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <span className="text-muted-foreground">{work.date}</span>
                    <ArrowRight
                      size={20}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
          {!isLoading && works.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">{t("works.emptyState")}</div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center text-muted-foreground"
        >
          <p className="text-sm tracking-wider uppercase">
            {isLoading ? (i18n.language.toLowerCase().startsWith("zh") ? "加载中" : "Loading") : `${works.length} ${t("works.projectCount")}${yearRange ? ` · ${yearRange}` : ""}`}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
