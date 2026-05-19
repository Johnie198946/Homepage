from fastapi import APIRouter

from app.api.routes import (
  about,
  ai_entries,
  analytics,
  auth,
  business_inquiries,
  collections,
  photos,
  videos,
)


api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(videos.router, tags=["videos"])
api_router.include_router(collections.router, tags=["collections"])
api_router.include_router(photos.router, tags=["photos"])
api_router.include_router(about.router, tags=["about"])
api_router.include_router(ai_entries.router, tags=["ai-entries"])
api_router.include_router(analytics.router, tags=["analytics"])
api_router.include_router(business_inquiries.router, tags=["business-inquiries"])
