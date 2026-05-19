import { useTranslation } from "react-i18next";
import { motion } from "motion/react";

interface LanguageSwitcherProps {
  variant?: "light" | "dark";
}

export function LanguageSwitcher({ variant = "light" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const isDark = variant === "dark";
  const currentLang = i18n.language;

  const textColor = isDark ? "text-white" : "text-black";
  const activeColor = isDark ? "text-white" : "text-black";
  const inactiveColor = isDark ? "text-white/50" : "text-black/40";

  const switchLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => switchLanguage("en")}
        className={`transition-colors ${
          currentLang === "en" ? activeColor : inactiveColor
        } hover:opacity-70`}
      >
        EN
      </button>
      <span className={`${textColor} opacity-30`}>/</span>
      <button
        onClick={() => switchLanguage("zh")}
        className={`transition-colors ${
          currentLang === "zh" ? activeColor : inactiveColor
        } hover:opacity-70`}
      >
        中文
      </button>
    </div>
  );
}
