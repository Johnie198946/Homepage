import { api, getAdminToken, setAdminToken } from "./client";

type RangeKey = "7d" | "30d" | "90d";

interface BackendVideo {
  id: number;
  title: string;
  url: string;
  mime_type: string;
  file_size: number;
  homepage_url?: string | null;
  homepage_mime_type?: string | null;
  homepage_file_size?: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface BackendCollection {
  id: number;
  location_en: string;
  location_zh: string;
  description_en: string;
  description_zh: string;
  category: string;
  photo_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface BackendPhoto {
  id: number;
  collection_id: number;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  details_en: string;
  details_zh: string;
  location: string;
  category: string;
  image_url: string;
  thumb_url: string | null;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  copyright: {
    photographer: string;
    year: number;
  };
}

interface BackendAbout {
  lang: string;
  intro: string;
  locations: string[];
  contact: Record<string, string>;
  intro_en: string;
  intro_zh: string;
  home_title: string;
  home_subtitle: string;
  home_recent_works_label: string;
  home_explore_by_location_label: string;
  home_empty_video: string;
  home_empty_recent_works: string;
  home_empty_locations: string;
  home_loading_label: string;
  home_title_en: string;
  home_title_zh: string;
  home_subtitle_en: string;
  home_subtitle_zh: string;
  home_recent_works_label_en: string;
  home_recent_works_label_zh: string;
  home_explore_by_location_label_en: string;
  home_explore_by_location_label_zh: string;
  home_empty_video_en: string;
  home_empty_video_zh: string;
  home_empty_recent_works_en: string;
  home_empty_recent_works_zh: string;
  home_empty_locations_en: string;
  home_empty_locations_zh: string;
  home_loading_label_en: string;
  home_loading_label_zh: string;
  locations_en: string[];
  locations_zh: string[];
  portrait_url: string | null;
  updated_at: string | null;
}

interface BackendAiEntry {
  id: number;
  title: string;
  description: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface BackendBusinessInquiry {
  id: number;
  name: string;
  email: string;
  company: string;
  message: string;
  source_page: string;
  status: "new" | "in_progress" | "resolved";
  read_status: "unread" | "read";
  owner_notification_status: "disabled" | "pending" | "sent" | "failed";
  visitor_receipt_status: "disabled" | "pending" | "sent" | "failed";
  read_at: string | null;
  owner_notification_error: string | null;
  visitor_receipt_error: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendBusinessInquirySubmission {
  id: number;
  status: "new" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
}

interface BackendPresignedUrls {
  presigned_url: string;
  thumb_presigned_url: string | null;
  expires_in: number;
  expires_at: string;
  copyright: {
    photographer: string;
    year: number;
  };
}

interface BackendPhotoBatchUploadFailure {
  index: number;
  file_name: string;
  error: string;
}

interface BackendPhotoBatchUploadOut {
  created: BackendPhoto[];
  failed: BackendPhotoBatchUploadFailure[];
}

export interface VideoItem {
  id: number;
  title: string;
  url: string;
  mimeType: string;
  fileSize: number;
  homepageUrl?: string | null;
  homepageMimeType?: string | null;
  homepageFileSize?: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CollectionItem {
  id: number;
  locationEn: string;
  locationZh: string;
  location: string;
  descriptionEn: string;
  descriptionZh: string;
  description: string;
  category: string;
  photoCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoItem {
  id: number;
  collectionId: number;
  titleEn: string;
  titleZh: string;
  title: string;
  descriptionEn: string;
  descriptionZh: string;
  description: string;
  detailsEn: string;
  detailsZh: string;
  details: string;
  location: string;
  category: string;
  imageUrl: string;
  thumbUrl: string | null;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  copyright: {
    photographer: string;
    year: number;
  };
}

export interface PhotoBatchUploadResult {
  created: PhotoItem[];
  failed: Array<{
    index: number;
    fileName: string;
    error: string;
  }>;
}

export interface AboutContent {
  lang: string;
  intro: string;
  locations: string[];
  contact: Record<string, string>;
  introEn: string;
  introZh: string;
  homeTitle: string;
  homeSubtitle: string;
  homeRecentWorksLabel: string;
  homeExploreByLocationLabel: string;
  homeEmptyVideo: string;
  homeEmptyRecentWorks: string;
  homeEmptyLocations: string;
  homeLoadingLabel: string;
  homeTitleEn: string;
  homeTitleZh: string;
  homeSubtitleEn: string;
  homeSubtitleZh: string;
  homeRecentWorksLabelEn: string;
  homeRecentWorksLabelZh: string;
  homeExploreByLocationLabelEn: string;
  homeExploreByLocationLabelZh: string;
  homeEmptyVideoEn: string;
  homeEmptyVideoZh: string;
  homeEmptyRecentWorksEn: string;
  homeEmptyRecentWorksZh: string;
  homeEmptyLocationsEn: string;
  homeEmptyLocationsZh: string;
  homeLoadingLabelEn: string;
  homeLoadingLabelZh: string;
  locationsEn: string[];
  locationsZh: string[];
  portraitUrl: string | null;
  updatedAt: string | null;
}

export interface AiEntryItem {
  id: number;
  title: string;
  description: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type BusinessInquiryStatus = "new" | "in_progress" | "resolved";
export type BusinessInquiryReadStatus = "unread" | "read";
export type NotificationStatus = "disabled" | "pending" | "sent" | "failed";

export interface BusinessInquiryItem {
  id: number;
  name: string;
  email: string;
  company: string;
  message: string;
  sourcePage: string;
  status: BusinessInquiryStatus;
  readStatus: BusinessInquiryReadStatus;
  ownerNotificationStatus: NotificationStatus;
  visitorReceiptStatus: NotificationStatus;
  readAt: string | null;
  ownerNotificationError: string | null;
  visitorReceiptError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessInquirySubmissionItem {
  id: number;
  status: BusinessInquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PresignedMedia {
  imageUrl: string;
  thumbUrl: string | null;
  expiresIn: number;
  expiresAt: string;
  copyright: {
    photographer: string;
    year: number;
  };
}

export interface PageViewStats {
  range: RangeKey;
  total: number;
  items: Array<{ page: string; views: number }>;
}

export interface ButtonClickStats {
  range: RangeKey;
  total: number;
  items: Array<{ targetId: string; clicks: number }>;
}

export interface TopPhotoStats {
  photoId: number;
  views: number;
  titleEn: string;
  titleZh: string;
  mediaUrl: string | null;
  thumbUrl: string | null;
}

function resolveLang(lang?: string): "en" | "zh" {
  return lang?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function normalizeVideoMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (
    normalized === "video/quicktime" ||
    normalized === "video/x-m4v" ||
    normalized === "video/m4v"
  ) {
    return "video/mp4";
  }
  return normalized;
}

function toVideoItem(video: BackendVideo): VideoItem {
  return {
    id: video.id,
    title: video.title,
    url: video.url,
    mimeType: normalizeVideoMimeType(video.mime_type),
    fileSize: video.file_size,
    homepageUrl: video.homepage_url ?? null,
    homepageMimeType: video.homepage_mime_type ? normalizeVideoMimeType(video.homepage_mime_type) : null,
    homepageFileSize: video.homepage_file_size ?? null,
    isActive: video.is_active,
    sortOrder: video.sort_order,
    createdAt: video.created_at,
  };
}

function toCollectionItem(collection: BackendCollection, lang?: string): CollectionItem {
  const resolvedLang = resolveLang(lang);
  return {
    id: collection.id,
    locationEn: collection.location_en,
    locationZh: collection.location_zh,
    location: resolvedLang === "zh" ? collection.location_zh || collection.location_en : collection.location_en,
    descriptionEn: collection.description_en,
    descriptionZh: collection.description_zh,
    description:
      resolvedLang === "zh"
        ? collection.description_zh || collection.description_en
        : collection.description_en || collection.description_zh,
    category: collection.category,
    photoCount: collection.photo_count,
    sortOrder: collection.sort_order,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
  };
}

function toPhotoItem(photo: BackendPhoto, lang?: string): PhotoItem {
  const resolvedLang = resolveLang(lang);
  return {
    id: photo.id,
    collectionId: photo.collection_id,
    titleEn: photo.title_en,
    titleZh: photo.title_zh,
    title: resolvedLang === "zh" ? photo.title_zh || photo.title_en : photo.title_en || photo.title_zh,
    descriptionEn: photo.description_en,
    descriptionZh: photo.description_zh,
    description:
      resolvedLang === "zh"
        ? photo.description_zh || photo.description_en
        : photo.description_en || photo.description_zh,
    detailsEn: photo.details_en,
    detailsZh: photo.details_zh,
    details: resolvedLang === "zh" ? photo.details_zh || photo.details_en : photo.details_en || photo.details_zh,
    location: photo.location,
    category: photo.category,
    imageUrl: photo.image_url,
    thumbUrl: photo.thumb_url,
    mimeType: photo.mime_type,
    fileSize: photo.file_size,
    width: photo.width,
    height: photo.height,
    sortOrder: photo.sort_order,
    createdAt: photo.created_at,
    updatedAt: photo.updated_at,
    copyright: photo.copyright,
  };
}

function toAboutContent(content: BackendAbout): AboutContent {
  const contact =
    content.contact && typeof content.contact === "object" && !Array.isArray(content.contact)
      ? content.contact
      : {};

  return {
    lang: content.lang || "en",
    intro: content.intro || "",
    locations: Array.isArray(content.locations) ? content.locations : [],
    contact,
    introEn: content.intro_en || "",
    introZh: content.intro_zh || "",
    homeTitle: content.home_title || "",
    homeSubtitle: content.home_subtitle || "",
    homeRecentWorksLabel: content.home_recent_works_label || "",
    homeExploreByLocationLabel: content.home_explore_by_location_label || "",
    homeEmptyVideo: content.home_empty_video || "",
    homeEmptyRecentWorks: content.home_empty_recent_works || "",
    homeEmptyLocations: content.home_empty_locations || "",
    homeLoadingLabel: content.home_loading_label || "",
    homeTitleEn: content.home_title_en || "",
    homeTitleZh: content.home_title_zh || "",
    homeSubtitleEn: content.home_subtitle_en || "",
    homeSubtitleZh: content.home_subtitle_zh || "",
    homeRecentWorksLabelEn: content.home_recent_works_label_en || "",
    homeRecentWorksLabelZh: content.home_recent_works_label_zh || "",
    homeExploreByLocationLabelEn: content.home_explore_by_location_label_en || "",
    homeExploreByLocationLabelZh: content.home_explore_by_location_label_zh || "",
    homeEmptyVideoEn: content.home_empty_video_en || "",
    homeEmptyVideoZh: content.home_empty_video_zh || "",
    homeEmptyRecentWorksEn: content.home_empty_recent_works_en || "",
    homeEmptyRecentWorksZh: content.home_empty_recent_works_zh || "",
    homeEmptyLocationsEn: content.home_empty_locations_en || "",
    homeEmptyLocationsZh: content.home_empty_locations_zh || "",
    homeLoadingLabelEn: content.home_loading_label_en || "",
    homeLoadingLabelZh: content.home_loading_label_zh || "",
    locationsEn: Array.isArray(content.locations_en) ? content.locations_en : [],
    locationsZh: Array.isArray(content.locations_zh) ? content.locations_zh : [],
    portraitUrl: content.portrait_url,
    updatedAt: content.updated_at,
  };
}

function toAiEntry(entry: BackendAiEntry): AiEntryItem {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description,
    titleEn: entry.title_en,
    titleZh: entry.title_zh,
    descriptionEn: entry.description_en,
    descriptionZh: entry.description_zh,
    url: entry.url,
    isActive: entry.is_active,
    sortOrder: entry.sort_order,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

function toBusinessInquiry(item: BackendBusinessInquiry): BusinessInquiryItem {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    company: item.company,
    message: item.message,
    sourcePage: item.source_page,
    status: item.status,
    readStatus: item.read_status,
    ownerNotificationStatus: item.owner_notification_status,
    visitorReceiptStatus: item.visitor_receipt_status,
    readAt: item.read_at,
    ownerNotificationError: item.owner_notification_error,
    visitorReceiptError: item.visitor_receipt_error,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function toBusinessInquirySubmission(item: BackendBusinessInquirySubmission): BusinessInquirySubmissionItem {
  return {
    id: item.id,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export function hasAdminSession(): boolean {
  return Boolean(getAdminToken());
}

export async function loginAdmin(username: string, password: string) {
  const result = await api.post<{ access_token: string; expires_at: string }>("/api/auth/login", {
    username,
    password,
  });
  setAdminToken(result.access_token);
  return result;
}

export async function logoutAdmin() {
  await api.post("/api/auth/logout", undefined, true);
  setAdminToken(null);
}

export async function fetchPublicVideos() {
  const videos = await api.get<BackendVideo[]>("/api/videos");
  return videos.map(toVideoItem);
}

export async function fetchAllVideos() {
  const videos = await api.get<BackendVideo[]>("/api/videos/all", true);
  return videos.map(toVideoItem);
}

export async function createVideo(formData: FormData) {
  const video = await api.post<BackendVideo>("/api/videos", formData, true);
  return toVideoItem(video);
}

export async function updateVideo(id: number, payload: { title?: string; sort_order?: number; is_active?: boolean }) {
  const video = await api.put<BackendVideo>(`/api/videos/${id}`, payload, true);
  return toVideoItem(video);
}

export async function toggleVideoStatus(id: number, isActive: boolean) {
  const video = await api.patch<BackendVideo>(`/api/videos/${id}/status?is_active=${String(isActive)}`, undefined, true);
  return toVideoItem(video);
}

export async function deleteVideo(id: number) {
  await api.delete(`/api/videos/${id}`, true);
}

export async function fetchCollections(lang?: string) {
  const collections = await api.get<BackendCollection[]>("/api/collections");
  return collections.map((item) => toCollectionItem(item, lang));
}

export async function createCollection(
  payload: {
    location_en: string;
    location_zh: string;
    description_en: string;
    description_zh: string;
    category: string;
    sort_order: number;
  },
  lang?: string
) {
  const collection = await api.post<BackendCollection>("/api/collections", payload, true);
  return toCollectionItem(collection, lang);
}

export async function updateCollection(
  id: number,
  payload: Partial<{
    location_en: string;
    location_zh: string;
    description_en: string;
    description_zh: string;
    category: string;
    sort_order: number;
  }>,
  lang?: string
) {
  const collection = await api.put<BackendCollection>(`/api/collections/${id}`, payload, true);
  return toCollectionItem(collection, lang);
}

export async function deleteCollection(id: number) {
  await api.delete(`/api/collections/${id}`, true);
}

export async function fetchPhotos(params: {
  lang?: string;
  location?: string | null;
  category?: string | null;
  collectionId?: number | null;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();
  if (params.location) {
    search.set("location", params.location);
  }
  if (params.category) {
    search.set("category", params.category);
  }
  if (params.collectionId !== null && params.collectionId !== undefined) {
    search.set("collection_id", String(params.collectionId));
  }
  search.set("page", String(params.page ?? 1));
  search.set("page_size", String(params.pageSize ?? 20));
  const photos = await api.get<BackendPhoto[]>(`/api/photos?${search.toString()}`);
  return photos.map((item) => toPhotoItem(item, params.lang));
}

export async function fetchPhotoPresigned(id: number) {
  const media = await api.get<BackendPresignedUrls>(`/api/photos/${id}/presigned`);
  return {
    imageUrl: media.presigned_url,
    thumbUrl: media.thumb_presigned_url,
    expiresIn: media.expires_in,
    expiresAt: media.expires_at,
    copyright: media.copyright,
  } satisfies PresignedMedia;
}

export async function createPhoto(formData: FormData) {
  const photo = await api.post<BackendPhoto>("/api/photos", formData, true);
  return toPhotoItem(photo);
}

export async function batchCreatePhotos(formData: FormData, lang?: string): Promise<PhotoBatchUploadResult> {
  const result = await api.post<BackendPhotoBatchUploadOut>("/api/photos/batch", formData, true);
  return {
    created: result.created.map((item) => toPhotoItem(item, lang)),
    failed: result.failed.map((item) => ({
      index: item.index,
      fileName: item.file_name,
      error: item.error,
    })),
  };
}

export async function updatePhoto(id: number, payload: Record<string, unknown>, lang?: string) {
  const photo = await api.put<BackendPhoto>(`/api/photos/${id}`, payload, true);
  return toPhotoItem(photo, lang);
}

export async function deletePhoto(id: number) {
  await api.delete(`/api/photos/${id}`, true);
}

export async function batchDeletePhotos(ids: number[]) {
  return api.post<{ deleted: number }>("/api/photos/batch-delete", { ids }, true);
}

export async function batchUpdatePhotos(payload: {
  ids: number[];
  collection_id?: number;
  location?: string;
  category?: string;
  copyright_name?: string;
  copyright_year?: number;
}) {
  return api.patch<{ updated: number }>("/api/photos/batch-update", payload, true);
}

export async function fetchAbout(lang?: string) {
  const content = await api.get<BackendAbout>(`/api/about?lang=${resolveLang(lang)}`);
  return toAboutContent(content);
}

export async function updateAbout(payload: {
  intro_en: string;
  intro_zh: string;
  home_title_en: string;
  home_title_zh: string;
  home_subtitle_en: string;
  home_subtitle_zh: string;
  home_recent_works_label_en: string;
  home_recent_works_label_zh: string;
  home_explore_by_location_label_en: string;
  home_explore_by_location_label_zh: string;
  home_empty_video_en: string;
  home_empty_video_zh: string;
  home_empty_recent_works_en: string;
  home_empty_recent_works_zh: string;
  home_empty_locations_en: string;
  home_empty_locations_zh: string;
  home_loading_label_en: string;
  home_loading_label_zh: string;
  locations_en: string[];
  locations_zh: string[];
  contact: Record<string, string>;
  portrait_url?: string | null;
}) {
  const content = await api.put<BackendAbout>("/api/about", payload, true);
  return toAboutContent(content);
}

export async function fetchAiEntries(lang?: string, includeAll = false) {
  const path = includeAll ? `/api/ai-entries/all?lang=${resolveLang(lang)}` : `/api/ai-entries?lang=${resolveLang(lang)}`;
  const entries = await api.get<BackendAiEntry[]>(path, includeAll);
  return entries.map(toAiEntry);
}

export async function createAiEntry(payload: {
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  url: string;
  is_active: boolean;
  sort_order: number;
}) {
  const entry = await api.post<BackendAiEntry>("/api/ai-entries", payload, true);
  return toAiEntry(entry);
}

export async function updateAiEntry(
  id: number,
  payload: Partial<{
    title_en: string;
    title_zh: string;
    description_en: string;
    description_zh: string;
    url: string;
    is_active: boolean;
    sort_order: number;
  }>
) {
  const entry = await api.put<BackendAiEntry>(`/api/ai-entries/${id}`, payload, true);
  return toAiEntry(entry);
}

export async function deleteAiEntry(id: number) {
  await api.delete(`/api/ai-entries/${id}`, true);
}

export async function submitBusinessInquiry(payload: {
  name: string;
  email: string;
  company?: string;
  message: string;
  source_page?: string;
}) {
  const inquiry = await api.post<BackendBusinessInquirySubmission>("/api/business-inquiries", payload);
  return toBusinessInquirySubmission(inquiry);
}

export async function fetchBusinessInquiries() {
  const inquiries = await api.get<BackendBusinessInquiry[]>("/api/business-inquiries", true);
  return inquiries.map(toBusinessInquiry);
}

export async function fetchBusinessInquiry(id: number) {
  const inquiry = await api.get<BackendBusinessInquiry>(`/api/business-inquiries/${id}`, true);
  return toBusinessInquiry(inquiry);
}

export async function updateBusinessInquiryStatus(id: number, status: BusinessInquiryStatus) {
  const inquiry = await api.patch<BackendBusinessInquiry>(`/api/business-inquiries/${id}/status`, { status }, true);
  return toBusinessInquiry(inquiry);
}

export async function trackEvent(payload: {
  eventType: "page_view" | "button_click" | "photo_view";
  page?: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await api.post("/api/analytics/events", {
      eventType: payload.eventType,
      page: payload.page ?? window.location.pathname,
      targetType: payload.targetType ?? "",
      targetId: payload.targetId ?? payload.page ?? window.location.pathname,
      timestamp: new Date().toISOString(),
      meta: payload.meta ?? {},
    });
  } catch {
    // Analytics failures are intentionally ignored.
  }
}

export async function fetchPageviews(range: RangeKey) {
  const stats = await api.get<{ range: RangeKey; total: number; items: Array<{ page: string; views: number }> }>(
    `/api/analytics/pageviews?range=${range}`,
    true
  );
  return stats;
}

export async function fetchButtonClicks(range: RangeKey) {
  const stats = await api.get<{ range: RangeKey; total: number; items: Array<{ target_id: string; clicks: number }> }>(
    `/api/analytics/button-clicks?range=${range}`,
    true
  );
  return {
    range: stats.range,
    total: stats.total,
    items: stats.items.map((item) => ({ targetId: item.target_id, clicks: item.clicks })),
  } satisfies ButtonClickStats;
}

export async function fetchTopPhotos(limit = 10) {
  const items = await api.get<
    Array<{
      photo_id: number;
      views: number;
      title_en: string;
      title_zh: string;
      media_url: string | null;
      thumb_url: string | null;
    }>
  >(`/api/analytics/top-photos?limit=${limit}`, true);
  return items.map((item) => ({
    photoId: item.photo_id,
    views: item.views,
    titleEn: item.title_en,
    titleZh: item.title_zh,
    mediaUrl: item.media_url,
    thumbUrl: item.thumb_url,
  })) satisfies TopPhotoStats[];
}
