import { Link, useLocation } from "react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface NavigationProps {
  variant?: "light" | "dark";
  className?: string;
}

export function Navigation({ variant = "light", className = "" }: NavigationProps) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();
  const isDark = variant === "dark";

  const navItems = [
    { path: "/", label: t("nav.home") },
    { path: "/works", label: t("nav.works") },
    { path: "/gallery", label: t("nav.gallery") },
    { path: "/about", label: t("nav.about") },
  ];

  const textColor = isDark ? "text-white" : "text-black";
  const hoverColor = isDark ? "hover:text-white/70" : "hover:text-black/70";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className="max-w-[1600px] mx-auto px-8 md:px-16 py-6 md:py-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="block">
            <Logo variant={variant} size="md" />
          </Link>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden ${textColor} ${hoverColor} transition-colors`}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="hidden md:flex items-center gap-12">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${textColor} ${hoverColor} transition-colors text-sm tracking-wider uppercase ${
                  location.pathname === item.path ? "opacity-100" : "opacity-70"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <LanguageSwitcher variant={variant} />
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-8 pb-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block ${textColor} ${hoverColor} transition-colors text-sm tracking-wider uppercase ${
                  location.pathname === item.path ? "opacity-100" : "opacity-70"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-white/20">
              <LanguageSwitcher variant={variant} />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
