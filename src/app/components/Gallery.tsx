import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { X } from "lucide-react";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";

import { resolvePhotoMediaUrl } from "../api/photoMedia";
import { extractApiMessage } from "../api/client";
import { fetchCollections, fetchPhotos, trackEvent } from "../api/portfolio";
import { ImageProtection } from "./ImageProtection";
import { LazyPhotoImage } from "./LazyPhotoImage";
import { Navigation } from "./Navigation";

interface Photo {
  id: number;
  imageUrl: string;
  thumbUrl?: string | null;
  description: string;
  location: string;
  details: string;
  width?: number | null;
  height?: number | null;
  category?: string;
  copyright?: string;
}

interface Collection {
  id: number;
  locationEn?: string;
  location: string;
  description: string;
  category: string;
  photos: Photo[];
}

type PhotoOrientation = "landscape" | "portrait" | "square" | "unknown";

const COLLAPSED_PHOTO_COUNT = 6;
const GALLERY_MASONRY_BREAKPOINTS = {
  0: 1,
  520: 2,
  768: 3,
  1024: 4,
};
const GALLERY_MASONRY_GUTTER = "1.5rem";
const SKELETON_ORIENTATION_PATTERN: PhotoOrientation[] = [
  "landscape",
  "portrait",
  "square",
  "portrait",
  "landscape",
  "square",
];

function getPhotoAspectRatio(photo: Pick<Photo, "width" | "height">) {
  if (!photo.width || !photo.height) {
    return "3 / 4";
  }
  return `${photo.width} / ${photo.height}`;
}

function getSkeletonAspectRatio(orientation: PhotoOrientation) {
  switch (orientation) {
    case "landscape":
      return "16 / 10";
    case "square":
      return "1 / 1";
    case "portrait":
    case "unknown":
    default:
      return "3 / 4";
  }
}

export function Gallery() {
  const { i18n, t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isZh = i18n.language.toLowerCase().startsWith("zh");

  useEffect(() => {
    const locationParam = searchParams.get("location");
    if (locationParam) {
      setSelectedLocation(decodeURIComponent(locationParam));
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetchCollections(i18n.language),
      fetchPhotos({ page: 1, pageSize: 100, lang: i18n.language }),
    ])
      .then(([collectionItems, photoItems]) => {
        if (!active) {
          return;
        }

        const collectionMap = new Map(collectionItems.map((collection) => [collection.id, collection]));
        const photosByCollection = new Map<number, Photo[]>();
        for (const photo of photoItems) {
          const collection = collectionMap.get(photo.collectionId);
          const localizedCollectionLocation = collection
            ? isZh
              ? collection.locationZh
              : collection.locationEn
            : "";
          const localizedCollectionDescription = collection
            ? isZh
              ? collection.descriptionZh
              : collection.descriptionEn
            : "";
          const current = photosByCollection.get(photo.collectionId) || [];
          current.push({
            id: photo.id,
            imageUrl: photo.imageUrl,
            thumbUrl: photo.thumbUrl,
            description: isZh
              ? photo.titleZh || photo.descriptionZh || localizedCollectionLocation
              : photo.titleEn || photo.descriptionEn || localizedCollectionLocation,
            location: localizedCollectionLocation,
            details: isZh
              ? photo.detailsZh || photo.descriptionZh || localizedCollectionDescription
              : photo.detailsEn || photo.descriptionEn || localizedCollectionDescription,
            width: photo.width,
            height: photo.height,
            category: photo.category,
            copyright: `${photo.copyright.photographer} · ${photo.copyright.year}`,
          });
          photosByCollection.set(photo.collectionId, current);
        }

        setCollections(
          collectionItems
            .map((collection) => ({
              id: collection.id,
              locationEn: collection.locationEn,
              location: isZh ? collection.locationZh : collection.locationEn,
              description: isZh ? collection.descriptionZh : collection.descriptionEn,
              category: collection.category,
              photos: photosByCollection.get(collection.id) || [],
            }))
            .filter((collection) => collection.photos.length > 0)
        );
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (active) {
          setCollections([]);
          setErrorMessage(`${t("gallery.loadFailed")} ${extractApiMessage(error)}`);
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
  }, [i18n.language, isZh, t]);

  const loadPhotoSrc = useCallback(
    (photo: Photo, preferFull = false, forceRefresh = false) =>
      resolvePhotoMediaUrl(
        {
          id: photo.id,
          imageUrl: photo.imageUrl,
          thumbUrl: photo.thumbUrl,
        },
        { preferFull, forceRefresh }
      ),
    []
  );

  const toggleExpand = (location: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(location)) {
      newExpanded.delete(location);
    } else {
      newExpanded.add(location);
    }
    setExpandedCollections(newExpanded);
  };

  const handleLocationFilter = (location: string | null) => {
    setSelectedLocation(location);
    setSelectedCategory(null);
    if (location) {
      setSearchParams({ location: location });
    } else {
      setSearchParams({});
    }
    void trackEvent({
      eventType: "button_click",
      targetType: "gallery-filter",
      targetId: location ? `location:${location}` : "location:all",
    });
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
    setSelectedLocation(null);
    setSearchParams({});
    void trackEvent({
      eventType: "button_click",
      targetType: "gallery-filter",
      targetId: category ? `category:${category}` : "category:all",
    });
  };

  const filteredCollections = useMemo(() => {
    if (selectedLocation) {
      return collections.filter(
        (collection) =>
          collection.location === selectedLocation || collection.locationEn === selectedLocation
      );
    }

    if (selectedCategory) {
      return collections.filter((collection) => collection.category === selectedCategory);
    }

    return collections;
  }, [collections, selectedCategory, selectedLocation]);

  const categories = Array.from(new Set(collections.map((c) => c.category))).filter(Boolean);
  const hasCollections = collections.length > 0;

  return (
    <ImageProtection>
      <div className="min-h-screen bg-background">
        <Navigation variant="light" className="bg-background/95 backdrop-blur-sm" />

        <div className="pt-32 pb-24 px-8 md:px-16 max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-24"
          >
            <h1 className="text-4xl md:text-6xl mb-6">{t("gallery.title")}</h1>
            <p className="text-muted-foreground max-w-2xl mb-12">{t("gallery.description")}</p>

            {errorMessage && (
              <div className="mb-8 border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {errorMessage}
              </div>
            )}

            {categories.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm tracking-wider uppercase text-muted-foreground mb-4">
                  {t("gallery.filterByTheme")}
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleCategoryFilter(null)}
                    className={`py-3 px-6 border transition-colors text-sm tracking-wider uppercase ${
                      selectedCategory === null && selectedLocation === null
                        ? "bg-foreground text-background border-foreground"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    {t("gallery.allThemes")}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryFilter(category)}
                      className={`py-3 px-6 border transition-colors text-sm tracking-wider uppercase ${
                        selectedCategory === category
                          ? "bg-foreground text-background border-foreground"
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasCollections && (
              <div className="mb-16">
                <h3 className="text-sm tracking-wider uppercase text-muted-foreground mb-4">
                  {t("gallery.filterByLocation")}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <button
                    onClick={() => handleLocationFilter(null)}
                    className={`py-3 px-6 border transition-colors text-sm tracking-wider uppercase ${
                      selectedLocation === null && selectedCategory === null
                        ? "bg-foreground text-background border-foreground"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    {t("gallery.all")}
                  </button>
                  {collections.map((collection) => (
                    <button
                      key={collection.location}
                      onClick={() => handleLocationFilter(collection.locationEn || collection.location)}
                      className={`py-3 px-6 border transition-colors text-sm tracking-wider uppercase ${
                        selectedLocation === collection.location ||
                        selectedLocation === collection.locationEn
                          ? "bg-foreground text-background border-foreground"
                          : "border-border hover:border-foreground"
                      }`}
                    >
                      {collection.location}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {isLoading ? (
            <ResponsiveMasonry columnsCountBreakPoints={GALLERY_MASONRY_BREAKPOINTS}>
              <Masonry gutter={GALLERY_MASONRY_GUTTER}>
                {Array.from({ length: COLLAPSED_PHOTO_COUNT }).map((_, index) => {
                  const orientation =
                    SKELETON_ORIENTATION_PATTERN[index % SKELETON_ORIENTATION_PATTERN.length];
                  return (
                    <div key={index} className="space-y-4">
                      <div
                        className="animate-pulse bg-muted"
                        style={{ aspectRatio: getSkeletonAspectRatio(orientation) }}
                      />
                      <div className="h-5 w-2/3 animate-pulse bg-muted" />
                      <div className="h-4 w-1/2 animate-pulse bg-muted" />
                    </div>
                  );
                })}
              </Masonry>
            </ResponsiveMasonry>
          ) : (
            <div className="space-y-32">
              {!hasCollections && (
                <div className="border border-border bg-muted/20 px-6 py-16 text-center text-muted-foreground">
                  {t("gallery.emptyState")}
                </div>
              )}
              {hasCollections &&
                filteredCollections.map((collection, collectionIndex) => {
                  const isExpanded = expandedCollections.has(collection.location);
                  const displayPhotos = isExpanded
                    ? collection.photos
                    : collection.photos.slice(0, COLLAPSED_PHOTO_COUNT);

                  return (
                    <motion.div
                      key={collection.location}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.6, delay: collectionIndex * 0.1 }}
                    >
                      <div className="mb-12">
                        <h2 className="text-3xl md:text-4xl mb-4">{collection.location}</h2>
                        <p className="text-muted-foreground max-w-xl">{collection.description}</p>
                      </div>

                      <ResponsiveMasonry columnsCountBreakPoints={GALLERY_MASONRY_BREAKPOINTS}>
                        <Masonry gutter={GALLERY_MASONRY_GUTTER}>
                          {displayPhotos.map((photo, photoIndex) => {
                            return (
                              <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: photoIndex * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="cursor-pointer group"
                                onClick={() => {
                                  setSelectedPhoto(photo);
                                  void trackEvent({
                                    eventType: "photo_view",
                                    targetType: "photo",
                                    targetId: String(photo.id),
                                    meta: { location: photo.location },
                                  });
                                }}
                              >
                                <div
                                  className="overflow-hidden bg-muted"
                                  style={{ aspectRatio: getPhotoAspectRatio(photo) }}
                                >
                                  <LazyPhotoImage
                                    cacheKey={photo.id}
                                    loadSrc={(options) =>
                                      loadPhotoSrc(photo, false, options?.forceRefresh ?? false)
                                    }
                                    errorMessage={t("common.imageLoadError")}
                                    alt={photo.description}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    placeholderClassName="bg-muted"
                                  />
                                </div>
                                <div className="mt-4 space-y-1">
                                  <h3 className="font-medium">{photo.description}</h3>
                                  <p className="text-sm text-muted-foreground">{photo.location}</p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </Masonry>
                      </ResponsiveMasonry>

                      {collection.photos.length > COLLAPSED_PHOTO_COUNT && (
                        <div className="mt-8 text-center">
                          <button
                            onClick={() => {
                              toggleExpand(collection.location);
                              void trackEvent({
                                eventType: "button_click",
                                targetType: "gallery-collection",
                                targetId: `${collection.location}:${isExpanded ? "less" : "more"}`,
                              });
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wider uppercase"
                          >
                            {isExpanded
                              ? t("gallery.showLess")
                              : `${t("gallery.viewAll")} ${collection.photos.length} ${t("gallery.photos")} →`}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              {hasCollections && filteredCollections.length === 0 && (
                <div className="py-16 text-center text-muted-foreground">{t("gallery.noMatches")}</div>
              )}
            </div>
          )}
        </div>

      {selectedPhoto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 md:p-8"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-8 right-8 text-white hover:text-white/70 transition-colors"
          >
            <X size={32} />
          </button>

          <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="overflow-hidden bg-white/5"
              style={{ aspectRatio: getPhotoAspectRatio(selectedPhoto) }}
            >
              <LazyPhotoImage
                cacheKey={`${selectedPhoto.id}-full`}
                eager
                loadSrc={(options) =>
                  loadPhotoSrc(selectedPhoto, true, options?.forceRefresh ?? false)
                }
                errorMessage={t("common.imageLoadError")}
                alt={selectedPhoto.description}
                className="w-full h-full object-contain"
                placeholderClassName="bg-white/10"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h2 className="text-3xl md:text-4xl mb-2">{selectedPhoto.description}</h2>
                <p className="text-white/60">{selectedPhoto.location}</p>
              </div>
              <p className="text-white/80 leading-relaxed">{selectedPhoto.details}</p>
              {selectedPhoto.copyright && (
                <p className="text-sm uppercase tracking-[0.2em] text-white/50">{selectedPhoto.copyright}</p>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
      </div>
    </ImageProtection>
  );
}
