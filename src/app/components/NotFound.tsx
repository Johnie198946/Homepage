import { Link } from "react-router";
import { Navigation } from "./Navigation";

export function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation variant="light" className="bg-background/95 backdrop-blur-sm" />

      <div className="pt-32 pb-24 px-8 md:px-16 max-w-[800px] mx-auto text-center">
        <h1 className="text-6xl mb-6">404</h1>
        <h2 className="text-2xl mb-8">Page Not Found</h2>
        <p className="text-muted-foreground mb-12">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block px-8 py-4 bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
