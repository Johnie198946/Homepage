import { Navigation } from "./Navigation";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

const allWorks = [
  {
    title: "Tokyo Lights",
    subtitle: "Urban Night Photography Series",
    location: "Tokyo, Japan",
    date: "2024",
    category: "Street Photography",
    link: "/gallery?location=Japan",
  },
  {
    title: "Danube Dreams",
    subtitle: "Architectural Heritage",
    location: "Budapest, Hungary",
    date: "2024",
    category: "Architecture",
    link: "/gallery?location=Hungary",
  },
  {
    title: "Adriatic Coast",
    subtitle: "Mediterranean Seascapes",
    location: "Dubrovnik, Croatia",
    date: "2024",
    category: "Landscape",
    link: "/gallery?location=Croatia",
  },
  {
    title: "Bosphorus Nights",
    subtitle: "East Meets West",
    location: "Istanbul, Turkey",
    date: "2024",
    category: "Architecture",
    link: "/gallery?location=Turkey",
  },
  {
    title: "Swiss Alps",
    subtitle: "Alpine Serenity",
    location: "Switzerland",
    date: "2024",
    category: "Landscape",
    link: "/gallery?location=Switzerland",
  },
  {
    title: "Blue Mosque Interior",
    subtitle: "Sacred Spaces",
    location: "Istanbul, Turkey",
    date: "2023",
    category: "Architecture",
    link: "/gallery?location=Turkey",
  },
  {
    title: "Mountain Villages",
    subtitle: "Alpine Life",
    location: "Switzerland",
    date: "2023",
    category: "Landscape",
    link: "/gallery?location=Switzerland",
  },
  {
    title: "Parliament by Night",
    subtitle: "Neo-Gothic Grandeur",
    location: "Budapest, Hungary",
    date: "2023",
    category: "Architecture",
    link: "/gallery?location=Hungary",
  },
  {
    title: "Shibuya Crossing",
    subtitle: "Urban Movement",
    location: "Tokyo, Japan",
    date: "2023",
    category: "Street Photography",
    link: "/gallery?location=Japan",
  },
  {
    title: "Dubrovnik Old Town",
    subtitle: "Medieval Heritage",
    location: "Croatia",
    date: "2023",
    category: "Architecture",
    link: "/gallery?location=Croatia",
  },
];

export function Works() {
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
          <h1 className="text-4xl md:text-6xl mb-6">Works</h1>
          <p className="text-muted-foreground max-w-2xl">
            A complete archive of photographic projects from 2023 to present, spanning five
            continents and diverse cultural landscapes.
          </p>
        </motion.div>

        <div className="space-y-0 border-t border-border">
          {allWorks.map((work, index) => (
            <motion.div
              key={index}
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
                  <div className="text-muted-foreground text-sm md:text-base">
                    {work.location}
                  </div>
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
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center text-muted-foreground"
        >
          <p className="text-sm tracking-wider uppercase">
            {allWorks.length} Projects · 2023 - 2024
          </p>
        </motion.div>
      </div>
    </div>
  );
}
