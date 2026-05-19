import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";

import { trackEvent } from "../api/portfolio";

export function Root() {
  const location = useLocation();

  useEffect(() => {
    void trackEvent({
      eventType: "page_view",
      page: location.pathname,
      targetType: "page",
      targetId: location.pathname,
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}
