import { Navigation } from "./Navigation";
import { motion } from "motion/react";
import { Mail, Instagram, Globe } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { extractApiMessage } from "../api/client";
import { fetchAbout, submitBusinessInquiry, trackEvent } from "../api/portfolio";
import { toast } from "sonner";

export function About() {
  const { i18n, t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [aboutIntro, setAboutIntro] = useState("");
  const [aboutLocations, setAboutLocations] = useState<string[]>([]);
  const [contactLinks, setContactLinks] = useState<Record<string, string>>({});
  const [portraitUrl, setPortraitUrl] = useState("https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800");
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: "success" | "warning";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingInquiry(true);
    setSubmissionFeedback(null);

    try {
      await submitBusinessInquiry({
        ...formData,
        source_page: "/about",
      });
      void trackEvent({
        eventType: "button_click",
        targetType: "form",
        targetId: "about-send-message",
      });
      const message = t("about.formSuccess");

      setSubmissionFeedback({
        type: "success",
        message,
      });
      toast.success(message);
      setFormData({ name: "", email: "", company: "", message: "" });
    } catch (error) {
      const isZh = i18n.language.toLowerCase().startsWith("zh");
      const message = isZh
        ? `内部信发送失败：${extractApiMessage(error)}`
        : `Failed to send internal message: ${extractApiMessage(error)}`;
      toast.error(message);
      setSubmissionFeedback({
        type: "warning",
        message,
      });
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  useEffect(() => {
    let active = true;

    void fetchAbout(i18n.language)
      .then((content) => {
        if (!active) {
          return;
        }
        setAboutIntro(content.intro);
        setAboutLocations(content.locations);
        setContactLinks(content.contact);
        setPortraitUrl(content.portraitUrl || "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800");
        setIsFallback(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setAboutIntro([t("about.intro1"), t("about.intro2"), t("about.intro3")].join("\n\n"));
        setAboutLocations([
          t("locations.switzerland"),
          t("locations.turkey"),
          t("locations.croatia"),
          t("locations.hungary"),
          t("locations.japan"),
        ]);
        setContactLinks({
          email: "mailto:hello@johniephoto.com",
          instagram: "https://instagram.com/johniephoto",
          apps: "/apps",
        });
        setPortraitUrl("https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800");
        setIsFallback(true);
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

  const introParagraphs = useMemo(() => {
    if (!aboutIntro) {
      return [t("about.intro1"), t("about.intro2"), t("about.intro3")];
    }
    return aboutIntro
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [aboutIntro, t]);

  const emailLink = contactLinks.email || contactLinks.mail || "mailto:hello@johniephoto.com";
  const instagramLink = contactLinks.instagram || "https://instagram.com/johniephoto";
  const appsLink = contactLinks.apps || "/apps";
  const isZh = i18n.language.toLowerCase().startsWith("zh");

  return (
    <div className="min-h-screen bg-background">
      <Navigation variant="light" className="bg-background/95 backdrop-blur-sm" />

      <div className="pt-32 pb-24 px-8 md:px-16 max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-24"
        >
          <h1 className="text-4xl md:text-6xl mb-16">{t("about.title")}</h1>

          {isFallback && (
            <div className="mb-8 border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              About 内容加载失败，已回退到本地文案。
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-16 mb-24">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl mb-6">{t("about.subtitle")}</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-5 w-full animate-pulse bg-muted" />
                      ))
                    : introParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
              </div>

              <div className="pt-8">
                <h3 className="text-xl mb-4">{t("about.locationsCaptured")}</h3>
                <div className="space-y-2 text-muted-foreground">
                  {isLoading ? (
                    <>
                      <div className="h-5 w-2/3 animate-pulse bg-muted" />
                      <div className="h-5 w-1/2 animate-pulse bg-muted" />
                    </>
                  ) : (
                    <>
                      <p>{aboutLocations.slice(0, 3).join(" · ")}</p>
                      <p>{aboutLocations.slice(3).join(" · ") || "And more..."}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-8">
                <h3 className="text-xl mb-4">{t("about.connect")}</h3>
                <div className="flex gap-6">
                  <a
                    href={emailLink}
                    onClick={() =>
                      void trackEvent({
                        eventType: "button_click",
                        targetType: "link",
                        targetId: "about-contact-email",
                      })
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail size={24} />
                  </a>
                  <a
                    href={instagramLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      void trackEvent({
                        eventType: "button_click",
                        targetType: "link",
                        targetId: "about-contact-instagram",
                      })
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Instagram size={24} />
                  </a>
                  <a
                    href={appsLink}
                    onClick={() =>
                      void trackEvent({
                        eventType: "button_click",
                        targetType: "link",
                        targetId: "about-contact-apps",
                      })
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="AI Apps"
                  >
                    <Globe size={24} />
                  </a>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="aspect-[3/4] bg-muted overflow-hidden"
            >
              <img
                src={portraitUrl}
                alt="Photographer at work"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="border-t border-border pt-16"
          >
            <h2 className="text-3xl mb-8">{t("about.businessTitle")}</h2>
            <p className="text-muted-foreground mb-12 max-w-2xl">
              {t("about.businessDesc")}
            </p>

            <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="name" className="block mb-3 text-sm">
                    {t("about.formName")}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-0 py-3 bg-transparent border-b border-border focus:border-foreground outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block mb-3 text-sm">
                    {t("about.formEmail")}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-0 py-3 bg-transparent border-b border-border focus:border-foreground outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block mb-3 text-sm">
                  {t("about.formCompany")}
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-0 py-3 bg-transparent border-b border-border focus:border-foreground outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="message" className="block mb-3 text-sm">
                  {t("about.formMessage")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-0 py-3 bg-transparent border-b border-border focus:border-foreground outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingInquiry}
                className="px-12 py-4 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 transition-colors"
              >
                {isSubmittingInquiry ? (isZh ? "发送中..." : "Sending...") : t("about.formSubmit")}
              </button>
              {submissionFeedback && (
                <p
                  className={`text-sm ${
                    submissionFeedback.type === "success" ? "text-muted-foreground" : "text-amber-700"
                  }`}
                >
                  {submissionFeedback.message}
                </p>
              )}
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
