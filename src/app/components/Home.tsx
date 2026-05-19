import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Navigation } from "./Navigation";
import { LazyPhotoImage } from "./LazyPhotoImage";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Grid3x3, Briefcase } from "lucide-react";
import { fetchAbout, fetchCollections, fetchPhotos, fetchPublicVideos, trackEvent, type AboutContent } from "../api/portfolio";
import { resolvePhotoMediaUrl } from "../api/photoMedia";

type FeaturedProject = {
  photoId: number;
  title: string;
  location: string;
  year: string;
  imageUrl: string;
  thumbUrl?: string | null;
  link: string;
};

type HomeVideoSource = {
  src: string;
  type?: string;
  title?: string;
};

const fallbackVideoSources: HomeVideoSource[] = [
  {
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    type: "video/mp4",
  },
  {
    src: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
    type: "video/mp4",
  },
];

export function Home() {
  const [showNav, setShowNav] = useState(false);
  const [showWorksButton, setShowWorksButton] = useState(false);
  const [showLocationButton, setShowLocationButton] = useState(false);
  const [videoSources, setVideoSources] = useState<HomeVideoSource[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [failedVideoSources, setFailedVideoSources] = useState<string[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedProject[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
  const [homeContent, setHomeContent] = useState<AboutContent | null>(null);
  const { t, i18n } = useTranslation();

  const homeText = {
    title: homeContent?.homeTitle || t("home.title"),
    subtitle: homeContent?.homeSubtitle || t("home.subtitle"),
    recentWorks: homeContent?.homeRecentWorksLabel || t("home.recentWorks"),
    exploreByLocation: homeContent?.homeExploreByLocationLabel || t("home.exploreByLocation"),
    emptyVideo: homeContent?.homeEmptyVideo || t("home.emptyVideo"),
    emptyRecentWorks: homeContent?.homeEmptyRecentWorks || t("home.emptyRecentWorks"),
    emptyLocations: homeContent?.homeEmptyLocations || t("home.emptyLocations"),
    loading: homeContent?.homeLoadingLabel || (i18n.language.toLowerCase().startsWith("zh") ? "加载中" : "Loading"),
  };

  useEffect(() => {
    // Disable right-click on video
    const handleContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "VIDEO") {
        e.preventDefault();
        return false;
      }
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
 
  useEffect(() => {
    let active = true;

    void fetchAbout(i18n.language)
      .then((content) => {
        if (active) {
          setHomeContent(content);
        }
      })
      .catch(() => {
        if (active) {
          setHomeContent(null);
        }
      });

    return () => {
      active = false;
    };
  }, [i18n.language]);

  useEffect(() => {
    let active = true;

    void fetchPublicVideos()
      .then((items) => {
        if (!active) {
          return;
        }
        const nextSources = items
          .filter((video) => video.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
          .slice(0, 3)
          .map((video) => ({
            src: video.homepageUrl || video.url,
            type: video.homepageMimeType || video.mimeType,
            title: video.title,
          }));
        setVideoSources(nextSources);
        setCurrentVideoIndex(0);
        setFailedVideoSources([]);
      })
      .catch(() => {
        if (active) {
          setVideoSources(fallbackVideoSources.slice(0, 3));
          setCurrentVideoIndex(0);
          setFailedVideoSources([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsVideoLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const playableVideoSources = videoSources.filter((video) => !failedVideoSources.includes(video.src));

  useEffect(() => {
    if (playableVideoSources.length === 0) {
      setCurrentVideoIndex(0);
      return;
    }

    if (currentVideoIndex >= playableVideoSources.length) {
      setCurrentVideoIndex(0);
    }
  }, [currentVideoIndex, playableVideoSources.length]);

  const currentVideo = playableVideoSources[currentVideoIndex] ?? null;
  const hasMultipleVideos = playableVideoSources.length > 1;

  const handleAdvanceVideo = () => {
    if (playableVideoSources.length <= 1) {
      return;
    }
    setCurrentVideoIndex((prev) => (prev + 1) % playableVideoSources.length);
  };

  const handleVideoError = (src: string) => {
    setFailedVideoSources((prev) => (prev.includes(src) ? prev : [...prev, src]));
  };

  useEffect(() => {
    let active = true;

    void Promise.all([
      fetchCollections("en"),
      fetchPhotos({ pageSize: 100, page: 1, lang: "en" }),
    ])
      .then(([collections, photos]) => {
        if (!active) {
          return;
        }

        const coverMap = new Map<
          number,
          { photoId: number; imageUrl: string; thumbUrl: string | null }
        >();
        for (const photo of photos) {
          if (!coverMap.has(photo.collectionId)) {
            coverMap.set(photo.collectionId, {
              photoId: photo.id,
              imageUrl: photo.imageUrl,
              thumbUrl: photo.thumbUrl,
            });
          }
        }

        const mappedProjects: FeaturedProject[] = collections
          .flatMap((collection) => {
            const cover = coverMap.get(collection.id);
            if (!cover) {
              return [];
            }

            return [
              {
                photoId: cover.photoId,
                title: collection.locationEn,
                location: collection.locationEn,
                year: new Date(collection.createdAt).getFullYear().toString(),
                imageUrl: cover.imageUrl,
                thumbUrl: cover.thumbUrl,
                link: `/gallery?location=${encodeURIComponent(collection.locationEn)}`,
              },
            ];
          })
          .slice(0, 5);

        setFeaturedItems(mappedProjects);
      })
      .catch(() => {
        if (active) {
          setFeaturedItems([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsFeaturedLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const hasVideoSources = playableVideoSources.length > 0;
  const hasFeaturedItems = featuredItems.length > 0;

  return (
    <div className="min-h-screen bg-background select-none">
      <div
        className="relative w-full h-screen overflow-hidden"
        onMouseMove={() => setShowNav(true)}
        onMouseLeave={() => setShowNav(false)}
      >
        {hasVideoSources && currentVideo ? (
          <AnimatePresence mode="wait">
            <motion.video
              key={currentVideo.src}
              initial={hasMultipleVideos ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={hasMultipleVideos ? { opacity: 0 } : undefined}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              autoPlay
              muted
              loop={!hasMultipleVideos}
              playsInline
              preload="auto"
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              onEnded={hasMultipleVideos ? handleAdvanceVideo : undefined}
              onError={() => handleVideoError(currentVideo.src)}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            >
              <source src={currentVideo.src} type={currentVideo.type} />
            </motion.video>
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-800" />
        )}

        <div className="absolute inset-0 bg-black/30" />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: showNav ? 1 : 0, y: showNav ? 0 : -20 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-auto"
        >
          <Navigation variant="dark" />
        </motion.div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-7xl mb-4 tracking-tight">{homeText.title}</h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto tracking-wide">
              {homeText.subtitle}
            </p>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-8 pb-16 px-8">
          <div
            className="relative flex flex-col items-center"
            onMouseEnter={() => setShowWorksButton(true)}
            onMouseLeave={() => setShowWorksButton(false)}
          >
            <AnimatePresence>
              {showWorksButton && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4 flex gap-2"
                >
                  {hasFeaturedItems ? (
                    featuredItems.slice(0, 3).map((project, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Link
                          to={project.link}
                          onClick={() =>
                            void trackEvent({
                              eventType: "button_click",
                              targetType: "link",
                              targetId: "home-recent-work-card",
                              meta: { location: project.location },
                            })
                          }
                          className="block w-16 h-20 overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 rounded hover:border-white/40 hover:scale-105 transition-all"
                          title={project.title}
                        >
                          <LazyPhotoImage
                            cacheKey={project.photoId || project.link}
                            eager
                            loadSrc={(options) =>
                              resolvePhotoMediaUrl(
                                {
                                  id: project.photoId,
                                  imageUrl: project.imageUrl,
                                  thumbUrl: project.thumbUrl,
                                },
                                { forceRefresh: options?.forceRefresh }
                              )
                            }
                            errorMessage={t("common.imageLoadError")}
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      </motion.div>
                    ))
                  ) : (
                    <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs tracking-[0.2em] uppercase text-white/80 backdrop-blur-md">
                      {homeText.emptyRecentWorks}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ width: 64, height: 64 }}
              animate={{
                width: showWorksButton ? 240 : 64,
                height: 64,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full overflow-hidden"
            >
              <Link
                to="/works"
                onClick={() =>
                  void trackEvent({
                    eventType: "button_click",
                    targetType: "link",
                    targetId: "home-recent-works",
                  })
                }
                className="flex items-center justify-center h-full px-4 text-white hover:bg-white/5 transition-colors"
              >
                <Briefcase size={24} className="flex-shrink-0" />
                <AnimatePresence>
                  {showWorksButton && (
                    <motion.div
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: "auto", marginLeft: 12 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2 whitespace-nowrap text-sm tracking-wider uppercase overflow-hidden"
                    >
                      <span>{homeText.recentWorks}</span>
                      <ArrowRight size={16} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          </div>

          <div
            className="relative flex flex-col items-center"
            onMouseEnter={() => setShowLocationButton(true)}
            onMouseLeave={() => setShowLocationButton(false)}
          >
            <AnimatePresence>
              {showLocationButton && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4 flex gap-2"
                >
                  {hasFeaturedItems ? (
                    featuredItems.slice(0, 5).map((project, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        transition={{ duration: 0.3, delay: index * 0.08 }}
                      >
                        <Link
                          to={project.link}
                          onClick={() =>
                            void trackEvent({
                              eventType: "button_click",
                              targetType: "link",
                              targetId: "home-location-card",
                              meta: { location: project.location },
                            })
                          }
                          className="block w-12 h-16 overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 rounded hover:border-white/40 hover:scale-105 transition-all"
                          title={project.location}
                        >
                          <LazyPhotoImage
                            cacheKey={project.photoId || project.link}
                            eager
                            loadSrc={(options) =>
                              resolvePhotoMediaUrl(
                                {
                                  id: project.photoId,
                                  imageUrl: project.imageUrl,
                                  thumbUrl: project.thumbUrl,
                                },
                                { forceRefresh: options?.forceRefresh }
                              )
                            }
                            errorMessage={t("common.imageLoadError")}
                            alt={project.location}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                      </motion.div>
                    ))
                  ) : (
                    <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs tracking-[0.2em] uppercase text-white/80 backdrop-blur-md">
                      {homeText.emptyLocations}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ width: 64, height: 64 }}
              animate={{
                width: showLocationButton ? 280 : 64,
                height: 64,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full overflow-hidden"
            >
              <Link
                to="/gallery"
                onClick={() =>
                  void trackEvent({
                    eventType: "button_click",
                    targetType: "link",
                    targetId: "home-explore-gallery",
                  })
                }
                className="flex items-center justify-center h-full px-4 text-white hover:bg-white/5 transition-colors"
              >
                <Grid3x3 size={24} className="flex-shrink-0" />
                <AnimatePresence>
                  {showLocationButton && (
                    <motion.div
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: "auto", marginLeft: 12 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-2 whitespace-nowrap text-sm tracking-wider uppercase overflow-hidden"
                    >
                      <span>{homeText.exploreByLocation}</span>
                      <ArrowRight size={16} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          </div>
        </div>

        {(isVideoLoading || isFeaturedLoading) && (
          <div className="absolute bottom-6 right-8 text-xs tracking-[0.25em] uppercase text-white/70">
            {homeText.loading}
          </div>
        )}
        {!isVideoLoading && !hasVideoSources && (
          <div className="absolute bottom-6 right-8 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] tracking-[0.25em] uppercase text-white/70 backdrop-blur-md">
            {homeText.emptyVideo}
          </div>
        )}
      </div>

    </div>
  );
}
