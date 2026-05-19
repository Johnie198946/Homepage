import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Navigation } from "./Navigation";
import { motion } from "motion/react";
import {
  BarChart3,
  Database,
  Globe,
  Image,
  Mail,
  LogIn,
  LogOut,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { extractApiMessage } from "../api/client";
import {
  batchCreatePhotos,
  batchDeletePhotos,
  batchUpdatePhotos,
  createAiEntry,
  createCollection,
  createVideo,
  deleteAiEntry,
  deleteCollection,
  deletePhoto,
  deleteVideo,
  fetchAbout,
  fetchAiEntries,
  fetchAllVideos,
  fetchBusinessInquiries,
  fetchBusinessInquiry,
  fetchButtonClicks,
  fetchCollections,
  fetchPageviews,
  fetchPhotos,
  fetchTopPhotos,
  hasAdminSession,
  loginAdmin,
  logoutAdmin,
  toggleVideoStatus,
  trackEvent,
  updateAbout,
  updateAiEntry,
  updateBusinessInquiryStatus,
  updateCollection,
  updatePhoto,
  updateVideo,
  type AboutContent,
  type AiEntryItem,
  type BusinessInquiryItem,
  type BusinessInquiryReadStatus,
  type BusinessInquiryStatus,
  type ButtonClickStats,
  type CollectionItem,
  type PageViewStats,
  type PhotoItem,
  type TopPhotoStats,
  type VideoItem,
} from "../api/portfolio";

type AdminTab = "about" | "business" | "ai" | "videos" | "gallery" | "analytics";
type AnalyticsRange = "7d" | "30d" | "90d";
type InquiryVisualReadStatus = BusinessInquiryReadStatus | "reading";

const CATEGORY_OPTIONS = ["Landscape", "Architecture", "Street Photography"];
const VIDEO_UPLOAD_ACCEPT = "video/mp4,video/webm,video/quicktime,video/x-m4v,video/m4v,.mp4,.webm,.mov,.m4v";
const BUSINESS_STATUS_OPTIONS: Array<{ value: BusinessInquiryStatus; label: string }> = [
  { value: "new", label: "待跟进" },
  { value: "in_progress", label: "处理中" },
  { value: "resolved", label: "已处理" },
];
const EMPTY_ABOUT_CONTENT: AboutContent = {
  lang: "en",
  intro: "",
  locations: [],
  contact: {},
  introEn: "",
  introZh: "",
  locationsEn: [],
  locationsZh: [],
  portraitUrl: null,
  updatedAt: null,
};

function parseMultiline(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

type CollectionDraft = {
  locationEn: string;
  locationZh: string;
  descriptionEn: string;
  descriptionZh: string;
  category: string;
  sortOrder: number;
};

type PhotoDraft = {
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  location: string;
  category: string;
  collectionId: number;
};

function toPhotoDraft(photo: PhotoItem): PhotoDraft {
  return {
    titleEn: photo.titleEn,
    titleZh: photo.titleZh,
    descriptionEn: photo.descriptionEn,
    descriptionZh: photo.descriptionZh,
    location: photo.location,
    category: photo.category,
    collectionId: photo.collectionId,
  };
}

function toCollectionDraft(collection: CollectionItem): CollectionDraft {
  return {
    locationEn: collection.locationEn,
    locationZh: collection.locationZh,
    descriptionEn: collection.descriptionEn,
    descriptionZh: collection.descriptionZh,
    category: collection.category,
    sortOrder: collection.sortOrder,
  };
}

function getInquiryStatusLabel(status: BusinessInquiryStatus) {
  return BUSINESS_STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
}

function getReadStatusLabel(status: BusinessInquiryReadStatus) {
  return status === "unread" ? "未读" : "已读";
}

function getVisualReadStatusLabel(status: InquiryVisualReadStatus) {
  if (status === "reading") {
    return "转为已读中";
  }
  return getReadStatusLabel(status);
}

function getNotificationStatusLabel(status: "disabled" | "pending" | "sent" | "failed") {
  if (status === "disabled") {
    return "内部信模式";
  }
  if (status === "sent") {
    return "已发送";
  }
  if (status === "failed") {
    return "发送失败";
  }
  return "待发送";
}

function getInquiryStatusBadgeClassName(status: BusinessInquiryStatus) {
  if (status === "resolved") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700";
  }
  if (status === "in_progress") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-700";
  }
  return "border-sky-500/40 bg-sky-500/10 text-sky-700";
}

function getReadStatusBadgeClassName(status: InquiryVisualReadStatus) {
  if (status === "reading") {
    return "border-foreground/30 bg-muted text-foreground";
  }
  if (status === "unread") {
    return "border-foreground bg-foreground text-background";
  }
  return "border-border bg-background text-muted-foreground";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "未记录";
  }
  return new Date(value).toLocaleString();
}

export function Admin() {
  const { i18n } = useTranslation();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const hasSession = hasAdminSession();
  const [activeTab, setActiveTab] = useState<AdminTab>(hasSession ? "business" : "about");
  const [isAuthenticated, setIsAuthenticated] = useState(hasSession);
  const [isInitializing, setIsInitializing] = useState(hasSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authForm, setAuthForm] = useState({ username: "admin", password: "" });

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [about, setAbout] = useState<AboutContent>(EMPTY_ABOUT_CONTENT);
  const [aiEntries, setAiEntries] = useState<AiEntryItem[]>([]);
  const [inquiries, setInquiries] = useState<BusinessInquiryItem[]>([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<BusinessInquiryItem | null>(null);
  const [isAboutSaving, setIsAboutSaving] = useState(false);
  const [isAboutDirty, setIsAboutDirty] = useState(false);
  const [isInquiryDetailLoading, setIsInquiryDetailLoading] = useState(false);
  const [isInquiryStatusSaving, setIsInquiryStatusSaving] = useState(false);
  const [pendingReadInquiryId, setPendingReadInquiryId] = useState<number | null>(null);
  const [pendingInquiryStatus, setPendingInquiryStatus] = useState<BusinessInquiryStatus | null>(null);

  const [videoDrafts, setVideoDrafts] = useState<Record<number, { title: string; sortOrder: number; isActive: boolean }>>({});
  const [collectionDrafts, setCollectionDrafts] = useState<Record<number, CollectionDraft>>({});
  const [photoDrafts, setPhotoDrafts] = useState<Record<number, PhotoDraft>>({});
  const [aiDrafts, setAiDrafts] = useState<
    Record<number, { titleEn: string; titleZh: string; descriptionEn: string; descriptionZh: string; url: string; isActive: boolean; sortOrder: number }>
  >({});

  const [aboutForm, setAboutForm] = useState({
    introEn: "",
    introZh: "",
    locationsEn: "",
    locationsZh: "",
    email: "",
    instagram: "",
    apps: "",
    portraitUrl: "",
  });

  const [newAiEntry, setNewAiEntry] = useState({
    titleEn: "",
    titleZh: "",
    descriptionEn: "",
    descriptionZh: "",
    url: "",
    isActive: true,
    sortOrder: 100,
  });

  const [newVideo, setNewVideo] = useState({ title: "", sortOrder: 100, isActive: true });
  const [newVideoFile, setNewVideoFile] = useState<File | null>(null);
  const [newCollection, setNewCollection] = useState<CollectionDraft>({
    locationEn: "",
    locationZh: "",
    descriptionEn: "",
    descriptionZh: "",
    category: "",
    sortOrder: 100,
  });

  const [uploadCollectionId, setUploadCollectionId] = useState<number>(0);
  const [uploadLocation, setUploadLocation] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Landscape");
  const [uploadCopyrightName, setUploadCopyrightName] = useState("Johnie Photography");
  const [uploadCopyrightYear, setUploadCopyrightYear] = useState<number>(new Date().getFullYear());
  const [uploadSortStart, setUploadSortStart] = useState<number>(100);
  const [uploadSortStep, setUploadSortStep] = useState<number>(10);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadDrafts, setUploadDrafts] = useState<
    Array<{
      titleEn: string;
      titleZh: string;
      descriptionEn: string;
      descriptionZh: string;
      detailsEn: string;
      detailsZh: string;
      sortOrder: number;
    }>
  >([]);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [uploadFailures, setUploadFailures] = useState<Array<{ fileName: string; error: string }>>([]);

  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [batchEdit, setBatchEdit] = useState({
    collectionId: 0,
    location: "",
    category: "",
    copyrightName: "",
    copyrightYear: "",
  });

  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("7d");
  const [pageviews, setPageviews] = useState<PageViewStats | null>(null);
  const [buttonClicks, setButtonClicks] = useState<ButtonClickStats | null>(null);
  const [topPhotos, setTopPhotos] = useState<TopPhotoStats[]>([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);

  const collectionOptions = useMemo(
    () => collections.map((item) => ({ id: item.id, label: item.location })),
    [collections]
  );
  const collectionPhotoCounts = useMemo(() => {
    const counts = new Map<number, number>();
    photos.forEach((photo) => {
      counts.set(photo.collectionId, (counts.get(photo.collectionId) ?? 0) + 1);
    });
    return counts;
  }, [photos]);
  const inquiryStats = useMemo(
    () => ({
      total: inquiries.length,
      unread: inquiries.filter((item) => item.readStatus === "unread").length,
      unresolved: inquiries.filter((item) => item.status !== "resolved").length,
      failedNotifications: inquiries.filter(
        (item) => item.ownerNotificationStatus === "failed" || item.visitorReceiptStatus === "failed"
      ).length,
    }),
    [inquiries]
  );
  const hasUnreadInquiries = inquiryStats.unread > 0;
  const sortedInquiries = useMemo(() => {
    return [...inquiries].sort((left, right) => {
      const leftPriority = left.readStatus === "unread" ? 0 : 1;
      const rightPriority = right.readStatus === "unread" ? 0 : 1;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const createdDiff = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      if (createdDiff !== 0) {
        return createdDiff;
      }

      return right.id - left.id;
    });
  }, [inquiries]);
  const selectedInquirySummary = useMemo(
    () => sortedInquiries.find((item) => item.id === selectedInquiryId) ?? null,
    [selectedInquiryId, sortedInquiries]
  );
  const currentInquiry =
    selectedInquiry && selectedInquiry.id === selectedInquiryId ? selectedInquiry : selectedInquirySummary;

  const resetAboutForm = (content: AboutContent) => {
    setAboutForm({
      introEn: content.introEn,
      introZh: content.introZh,
      locationsEn: content.locationsEn.join("\n"),
      locationsZh: content.locationsZh.join("\n"),
      email: content.contact.email || content.contact.mail || "",
      instagram: content.contact.instagram || "",
      apps: content.contact.apps || "/apps",
      portraitUrl: content.portraitUrl || "",
    });
    setIsAboutDirty(false);
  };

  const updateAboutField = (field: keyof typeof aboutForm, value: string) => {
    setAboutForm((prev) => ({ ...prev, [field]: value }));
    setIsAboutDirty(true);
  };

  const resetDrafts = (
    nextVideos: VideoItem[],
    nextCollections: CollectionItem[],
    nextPhotos: PhotoItem[],
    nextAiEntries: AiEntryItem[]
  ) => {
    setVideoDrafts(
      Object.fromEntries(
        nextVideos.map((item) => [
          item.id,
          { title: item.title, sortOrder: item.sortOrder, isActive: item.isActive },
        ])
      )
    );

    setCollectionDrafts(
      Object.fromEntries(nextCollections.map((item) => [item.id, toCollectionDraft(item)]))
    );

    setPhotoDrafts(
      Object.fromEntries(
        nextPhotos.map((item) => [item.id, toPhotoDraft(item)])
      )
    );

    setAiDrafts(
      Object.fromEntries(
        nextAiEntries.map((item) => [
          item.id,
          {
            titleEn: item.titleEn,
            titleZh: item.titleZh,
            descriptionEn: item.descriptionEn,
            descriptionZh: item.descriptionZh,
            url: item.url,
            isActive: item.isActive,
            sortOrder: item.sortOrder,
          },
        ])
      )
    );
  };

  const loadDashboardData = async () => {
    const [videoItems, collectionItems, photoItems, aboutContent, aiEntryItems, inquiryItems] = await Promise.all([
      fetchAllVideos(),
      fetchCollections(i18n.language),
      fetchPhotos({ page: 1, pageSize: 100, lang: i18n.language }),
      fetchAbout(i18n.language),
      fetchAiEntries(i18n.language, true),
      fetchBusinessInquiries(),
    ]);

    setVideos(videoItems);
    setCollections(collectionItems);
    setPhotos(photoItems);
    setAbout(aboutContent);
    setAiEntries(aiEntryItems);
    setInquiries(inquiryItems);
    resetAboutForm(aboutContent);
    resetDrafts(videoItems, collectionItems, photoItems, aiEntryItems);

    const nextSelectedId =
      selectedInquiryId && inquiryItems.some((item) => item.id === selectedInquiryId)
        ? selectedInquiryId
        : (inquiryItems.find((item) => item.readStatus === "unread")?.id ?? inquiryItems[0]?.id ?? null);
    setSelectedInquiryId(nextSelectedId);
    setSelectedInquiry(inquiryItems.find((item) => item.id === nextSelectedId) ?? null);
  };

  const loadInquiryDetail = async (inquiryId: number) => {
    setIsInquiryDetailLoading(true);
    try {
      const detail = await fetchBusinessInquiry(inquiryId);
      setSelectedInquiry((prev) => (prev && prev.id !== inquiryId ? prev : detail));
      setInquiries((prev) => prev.map((item) => (item.id === detail.id ? detail : item)));
      setPendingReadInquiryId((prev) => (prev === inquiryId ? null : prev));
    } catch (error) {
      setPendingReadInquiryId((prev) => (prev === inquiryId ? null : prev));
      throw error;
    } finally {
      setIsInquiryDetailLoading(false);
    }
  };

  const loadAnalytics = async (range: AnalyticsRange) => {
    setIsAnalyticsLoading(true);
    try {
      const [pageviewStats, clickStats, topPhotoStats] = await Promise.all([
        fetchPageviews(range),
        fetchButtonClicks(range),
        fetchTopPhotos(10),
      ]);
      setPageviews(pageviewStats);
      setButtonClicks(clickStats);
      setTopPhotos(topPhotoStats);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setIsInitializing(false);
      return;
    }

    let active = true;
    void loadDashboardData()
      .then(() => {
        if (active) {
          setIsInitializing(false);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        toast.error(extractApiMessage(error));
        setIsAuthenticated(false);
        setIsInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [i18n.language, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== "analytics") {
      return;
    }

    void loadAnalytics(analyticsRange).catch((error) => {
      toast.error(extractApiMessage(error));
    });
  }, [activeTab, analyticsRange, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== "business" || !selectedInquiryId) {
      return;
    }

    void loadInquiryDetail(selectedInquiryId).catch((error) => {
      toast.error(extractApiMessage(error));
    });
  }, [activeTab, isAuthenticated, selectedInquiryId]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await loginAdmin(authForm.username.trim(), authForm.password);
      setIsAuthenticated(true);
      setActiveTab("business");
      setAuthForm((prev) => ({ ...prev, password: "" }));
      toast.success("登录成功");
      void trackEvent({
        eventType: "button_click",
        targetType: "admin-auth",
        targetId: "admin-login",
      });
    } catch (error) {
      toast.error(extractApiMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch {
      // Ignore logout failures and clear local session.
    }
    setIsAuthenticated(false);
    toast.success("已退出登录");
  };

  const handleSaveAbout = async () => {
    setIsAboutSaving(true);
    try {
      const updated = await updateAbout({
        intro_en: aboutForm.introEn,
        intro_zh: aboutForm.introZh,
        locations_en: parseMultiline(aboutForm.locationsEn),
        locations_zh: parseMultiline(aboutForm.locationsZh),
        contact: {
          email: aboutForm.email,
          instagram: aboutForm.instagram,
          apps: aboutForm.apps || "/apps",
        },
        portrait_url: aboutForm.portraitUrl || null,
      });
      setAbout(updated);
      resetAboutForm(updated);
      toast.success("About 内容已保存");
    } catch (error) {
      toast.error(extractApiMessage(error));
    } finally {
      setIsAboutSaving(false);
    }
  };

  const handleSelectInquiry = (inquiryId: number) => {
    const inquiry = inquiries.find((item) => item.id === inquiryId) ?? null;
    setSelectedInquiryId(inquiryId);
    setSelectedInquiry(inquiry);
    setPendingInquiryStatus(null);
    setPendingReadInquiryId(inquiry?.readStatus === "unread" ? inquiryId : null);
  };

  const handleUpdateInquiryStatus = async (status: BusinessInquiryStatus) => {
    if (!selectedInquiryId || !currentInquiry) {
      return;
    }

    const previousInquiry = currentInquiry;
    const previousInquiries = inquiries;

    setIsInquiryStatusSaving(true);
    setPendingInquiryStatus(status);
    setSelectedInquiry((prev) => (prev && prev.id === selectedInquiryId ? { ...prev, status } : prev));
    setInquiries((prev) => prev.map((item) => (item.id === selectedInquiryId ? { ...item, status } : item)));
    try {
      const updated = await updateBusinessInquiryStatus(selectedInquiryId, status);
      setSelectedInquiry((prev) => (prev && prev.id !== updated.id ? prev : updated));
      setInquiries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("内部信状态已更新");
    } catch (error) {
      setSelectedInquiry((prev) => (prev && prev.id === previousInquiry.id ? previousInquiry : prev));
      setInquiries(previousInquiries);
      toast.error(extractApiMessage(error));
    } finally {
      setIsInquiryStatusSaving(false);
      setPendingInquiryStatus(null);
    }
  };

  const handleCreateAiEntry = async () => {
    try {
      const created = await createAiEntry({
        title_en: newAiEntry.titleEn,
        title_zh: newAiEntry.titleZh,
        description_en: newAiEntry.descriptionEn,
        description_zh: newAiEntry.descriptionZh,
        url: newAiEntry.url,
        is_active: newAiEntry.isActive,
        sort_order: newAiEntry.sortOrder,
      });
      const next = [...aiEntries, created].sort((a, b) => a.sortOrder - b.sortOrder);
      setAiEntries(next);
      setAiDrafts((prev) => ({
        ...prev,
        [created.id]: {
          titleEn: created.titleEn,
          titleZh: created.titleZh,
          descriptionEn: created.descriptionEn,
          descriptionZh: created.descriptionZh,
          url: created.url,
          isActive: created.isActive,
          sortOrder: created.sortOrder,
        },
      }));
      setNewAiEntry({
        titleEn: "",
        titleZh: "",
        descriptionEn: "",
        descriptionZh: "",
        url: "",
        isActive: true,
        sortOrder: 100,
      });
      toast.success("AI 入口已创建");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleSaveAiEntry = async (entryId: number) => {
    try {
      const draft = aiDrafts[entryId];
      const updated = await updateAiEntry(entryId, {
        title_en: draft.titleEn,
        title_zh: draft.titleZh,
        description_en: draft.descriptionEn,
        description_zh: draft.descriptionZh,
        url: draft.url,
        is_active: draft.isActive,
        sort_order: draft.sortOrder,
      });
      const next = aiEntries.map((item) => (item.id === entryId ? updated : item)).sort((a, b) => a.sortOrder - b.sortOrder);
      setAiEntries(next);
      toast.success("AI 入口已更新");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleDeleteAiEntry = async (entryId: number) => {
    try {
      await deleteAiEntry(entryId);
      setAiEntries((prev) => prev.filter((item) => item.id !== entryId));
      setAiDrafts((prev) => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
      toast.success("AI 入口已删除");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleCreateVideo = async () => {
    if (!newVideoFile) {
      toast.error("请先选择视频文件");
      return;
    }

    const formData = new FormData();
    formData.append("file", newVideoFile);
    formData.append("title", newVideo.title);
    formData.append("sort_order", String(newVideo.sortOrder));
    formData.append("is_active", String(newVideo.isActive));

    try {
      const created = await createVideo(formData);
      const next = [...videos, created].sort((a, b) => a.sortOrder - b.sortOrder);
      setVideos(next);
      setVideoDrafts((prev) => ({
        ...prev,
        [created.id]: { title: created.title, sortOrder: created.sortOrder, isActive: created.isActive },
      }));
      setNewVideo({ title: "", sortOrder: 100, isActive: true });
      setNewVideoFile(null);
      toast.success("视频已上传");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleSaveVideo = async (videoId: number) => {
    try {
      const draft = videoDrafts[videoId];
      const updated = await updateVideo(videoId, {
        title: draft.title,
        sort_order: draft.sortOrder,
        is_active: draft.isActive,
      });
      setVideos((prev) => prev.map((item) => (item.id === videoId ? updated : item)).sort((a, b) => a.sortOrder - b.sortOrder));
      toast.success("视频已保存");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleToggleVideoStatus = async (videoId: number, isActive: boolean) => {
    try {
      const updated = await toggleVideoStatus(videoId, isActive);
      setVideos((prev) => prev.map((item) => (item.id === videoId ? updated : item)));
      setVideoDrafts((prev) => ({
        ...prev,
        [videoId]: {
          ...(prev[videoId] || { title: updated.title, sortOrder: updated.sortOrder }),
          isActive: updated.isActive,
          title: prev[videoId]?.title ?? updated.title,
          sortOrder: prev[videoId]?.sortOrder ?? updated.sortOrder,
        },
      }));
      toast.success(updated.isActive ? "视频已启用" : "视频已停用");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    try {
      await deleteVideo(videoId);
      setVideos((prev) => prev.filter((item) => item.id !== videoId));
      setVideoDrafts((prev) => {
        const next = { ...prev };
        delete next[videoId];
        return next;
      });
      toast.success("视频已删除");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleCreateCollection = async () => {
    try {
      const created = await createCollection(
        {
          location_en: newCollection.locationEn,
          location_zh: newCollection.locationZh,
          description_en: newCollection.descriptionEn,
          description_zh: newCollection.descriptionZh,
          category: newCollection.category,
          sort_order: newCollection.sortOrder,
        },
        i18n.language
      );
      const next = [...collections, created].sort((a, b) => a.sortOrder - b.sortOrder);
      setCollections(next);
      setCollectionDrafts((prev) => ({
        ...prev,
        [created.id]: toCollectionDraft(created),
      }));
      setNewCollection({
        locationEn: "",
        locationZh: "",
        descriptionEn: "",
        descriptionZh: "",
        category: "",
        sortOrder: 100,
      });
      setUploadCollectionId((prev) => prev || created.id);
      toast.success("合集已创建");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleSaveCollection = async (collectionId: number) => {
    try {
      const draft = collectionDrafts[collectionId];
      const updated = await updateCollection(
        collectionId,
        {
          location_en: draft.locationEn,
          location_zh: draft.locationZh,
          description_en: draft.descriptionEn,
          description_zh: draft.descriptionZh,
          category: draft.category,
          sort_order: draft.sortOrder,
        },
        i18n.language
      );
      setCollections((prev) => prev.map((item) => (item.id === collectionId ? updated : item)).sort((a, b) => a.sortOrder - b.sortOrder));
      setCollectionDrafts((prev) => ({
        ...prev,
        [collectionId]: toCollectionDraft(updated),
      }));
      toast.success("合集已保存");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleDeleteCollection = async (collectionId: number) => {
    try {
      await deleteCollection(collectionId);
      setCollections((prev) => prev.filter((item) => item.id !== collectionId));
      setCollectionDrafts((prev) => {
        const next = { ...prev };
        delete next[collectionId];
        return next;
      });
      setPhotos((prev) => prev.filter((item) => item.collectionId !== collectionId));
      setPhotoDrafts((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([_, draft]) => draft.collectionId !== collectionId)
        )
      );
      setSelectedPhotos((prev) => {
        const next = new Set(prev);
        photos
          .filter((item) => item.collectionId === collectionId)
          .forEach((item) => next.delete(item.id));
        return next;
      });
      setUploadCollectionId((prev) => (prev === collectionId ? 0 : prev));
      toast.success("合集已删除");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleUploadFilesChange = (files: File[]) => {
    setUploadFiles(files);
    setUploadFailures([]);
    setUploadDrafts(
      files.map((file, index) => {
        const baseName = getFileBaseName(file.name);
        return {
          titleEn: baseName,
          titleZh: baseName,
          descriptionEn: "",
          descriptionZh: "",
          detailsEn: "",
          detailsZh: "",
          sortOrder: uploadSortStart + index * uploadSortStep,
        };
      })
    );
  };

  const handleCreatePhotos = async () => {
    if (!uploadCollectionId || uploadFiles.length === 0) {
      if (!uploadCollectionId) {
        toast.error("请先选择合集");
        return;
      }
      uploadInputRef.current?.click();
      return;
    }

    try {
      setIsBatchUploading(true);
      const formData = new FormData();
      uploadFiles.forEach((file) => formData.append("files", file));
      formData.append("collection_id", String(uploadCollectionId));
      formData.append("location", uploadLocation);
      formData.append("category", uploadCategory);
      formData.append("copyright_name", uploadCopyrightName || "Johnie Photography");
      formData.append("copyright_year", String(uploadCopyrightYear || new Date().getFullYear()));
      formData.append("sort_order_start", String(uploadSortStart || 100));
      formData.append("sort_order_step", String(uploadSortStep || 10));
      formData.append("items", JSON.stringify(uploadDrafts));
      const result = await batchCreatePhotos(formData, i18n.language);
      const created = result.created;

      const next = [...created, ...photos].sort((a, b) => a.sortOrder - b.sortOrder);
      setPhotos(next);
      setPhotoDrafts((prev) => ({
        ...prev,
        ...Object.fromEntries(created.map((item) => [item.id, toPhotoDraft(item)])),
      }));

      if (result.failed.length > 0) {
        const failedIndexes = new Set(result.failed.map((item) => item.index));
        setUploadFiles(uploadFiles.filter((_, index) => failedIndexes.has(index)));
        setUploadDrafts(uploadDrafts.filter((_, index) => failedIndexes.has(index)));
        setUploadFailures(result.failed.map((item) => ({ fileName: item.fileName, error: item.error })));
        toast.warning(`成功 ${created.length} 张，失败 ${result.failed.length} 张`);
      } else {
        setUploadFiles([]);
        setUploadDrafts([]);
        setUploadFailures([]);
        toast.success(`已上传 ${created.length} 张图片`);
      }
    } catch (error) {
      toast.error(extractApiMessage(error));
    } finally {
      setIsBatchUploading(false);
    }
  };

  const handleSavePhoto = async (photoId: number) => {
    try {
      const draft = photoDrafts[photoId];
      const updated = await updatePhoto(photoId, {
        collection_id: draft.collectionId,
        title_en: draft.titleEn,
        title_zh: draft.titleZh,
        description_en: draft.descriptionEn,
        description_zh: draft.descriptionZh,
        location: draft.location,
        category: draft.category,
      }, i18n.language);
      setPhotos((prev) => prev.map((item) => (item.id === photoId ? updated : item)));
      toast.success("图片已保存");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      await deletePhoto(photoId);
      setPhotos((prev) => prev.filter((item) => item.id !== photoId));
      setSelectedPhotos((prev) => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
      toast.success("图片已删除");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedPhotos.size === 0) {
      toast.error("请先选择图片");
      return;
    }

    try {
      await batchDeletePhotos(Array.from(selectedPhotos));
      setPhotos((prev) => prev.filter((item) => !selectedPhotos.has(item.id)));
      setSelectedPhotos(new Set());
      toast.success("批量删除完成");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedPhotos.size === 0) {
      toast.error("请先选择图片");
      return;
    }

    if (
      !batchEdit.location &&
      !batchEdit.category &&
      !batchEdit.collectionId &&
      !batchEdit.copyrightName &&
      !batchEdit.copyrightYear
    ) {
      toast.error("请至少填写一个批量更新字段");
      return;
    }

    try {
      await batchUpdatePhotos({
        ids: Array.from(selectedPhotos),
        collection_id: batchEdit.collectionId || undefined,
        location: batchEdit.location || undefined,
        category: batchEdit.category || undefined,
        copyright_name: batchEdit.copyrightName || undefined,
        copyright_year: batchEdit.copyrightYear ? Number(batchEdit.copyrightYear) : undefined,
      });
      const refreshed = await fetchPhotos({ page: 1, pageSize: 100, lang: i18n.language });
      setPhotos(refreshed);
      setPhotoDrafts((prev) => ({
        ...prev,
        ...Object.fromEntries(refreshed.map((item) => [item.id, toPhotoDraft(item)])),
      }));
      setSelectedPhotos(new Set());
      setBatchEdit({ collectionId: 0, location: "", category: "", copyrightName: "", copyrightYear: "" });
      toast.success("批量更新完成");
    } catch (error) {
      toast.error(extractApiMessage(error));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation variant="light" className="bg-background/95 backdrop-blur-sm" />
        <div className="pt-32 pb-24 px-8 md:px-16 max-w-[640px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="border border-border p-8 md:p-12"
          >
            <h1 className="text-4xl md:text-6xl mb-6">Admin Login</h1>
            <p className="text-muted-foreground mb-10">
              使用后端管理员账号登录后，会优先进入后台消息中心，在这里阅读 About 页提交的内部信，并继续管理视频、图集、About 内容、AI 入口和访问统计。
            </p>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm mb-3 text-muted-foreground">Username</label>
                <input
                  value={authForm.username}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full px-4 py-3 border border-border focus:border-foreground outline-none transition-colors bg-background"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm mb-3 text-muted-foreground">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full px-4 py-3 border border-border focus:border-foreground outline-none transition-colors bg-background"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-8 py-4 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 transition-colors text-sm tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <LogIn size={16} />
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation variant="light" className="bg-background/95 backdrop-blur-sm" />

      <div className="pt-32 pb-24 px-8 md:px-16 max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-start justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl md:text-6xl mb-4">Admin Dashboard</h1>
              <p className="text-muted-foreground max-w-2xl">
                登录后会优先聚焦消息中心。访客在 About 页提交的内部信会直接进入后台消息中心，方便你集中阅读和处理。
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 px-5 py-3 border border-border hover:border-foreground transition-colors text-sm tracking-wider uppercase flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

          <div className="mb-10 border border-border p-6 md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm tracking-wider uppercase text-muted-foreground mb-3">内部信 / 消息中心</p>
                <h2 className="text-2xl md:text-3xl">管理员入口已聚焦到这里阅读用户来信</h2>
                <p className="text-sm text-muted-foreground mt-3">
                  所有访客从 About 页提交的内部信都会进入消息中心。点击顶部“消息中心”即可阅读来信、查看未读数量，并继续跟进处理状态。
                </p>
              </div>
              <button
                onClick={() => setActiveTab("business")}
                className={`inline-flex items-center justify-center gap-3 self-start border px-5 py-3 text-sm tracking-wider uppercase transition-colors ${
                  activeTab === "business"
                    ? "border-foreground bg-foreground text-background"
                    : hasUnreadInquiries
                      ? "border-foreground bg-muted/40 text-foreground hover:bg-muted/70"
                      : "border-border hover:border-foreground"
                }`}
              >
                <Mail size={16} />
                <span>查看消息中心</span>
                <span
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] leading-none ${
                    activeTab === "business"
                      ? "bg-background text-foreground"
                      : hasUnreadInquiries
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground"
                  }`}
                >
                  {hasUnreadInquiries ? `${inquiryStats.unread} 未读` : `${inquiryStats.total} 封`}
                </span>
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-12 border-b border-border overflow-x-auto">
            <button
              onClick={() => setActiveTab("about")}
              className={`pb-4 px-4 text-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "about" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="inline-block mr-2" size={16} />
              About
            </button>
            <button
              onClick={() => setActiveTab("business")}
              className={`pb-4 px-4 text-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "business"
                  ? "border-b-2 border-foreground text-foreground"
                  : hasUnreadInquiries
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${
                  activeTab === "business"
                    ? "border-foreground bg-foreground text-background"
                    : hasUnreadInquiries
                      ? "border-foreground bg-muted/50"
                      : "border-transparent"
                }`}
              >
                <Mail size={16} />
                <span>消息中心</span>
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                    activeTab === "business"
                      ? "bg-background text-foreground"
                      : hasUnreadInquiries
                        ? "bg-foreground text-background"
                        : "bg-muted text-foreground"
                  }`}
                >
                  {hasUnreadInquiries ? inquiryStats.unread : inquiryStats.total}
                </span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`pb-4 px-4 text-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "ai" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="inline-block mr-2" size={16} />
              AI Entries
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`pb-4 px-4 text-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "videos" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="inline-block mr-2" size={16} />
              Videos
            </button>
            <button
              onClick={() => setActiveTab("gallery")}
              className={`pb-4 px-4 text-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "gallery" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Image className="inline-block mr-2" size={16} />
              Gallery
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`pb-4 px-4 text-sm tracking-wider uppercase whitespace-nowrap transition-colors ${
                activeTab === "analytics" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="inline-block mr-2" size={16} />
              Analytics
            </button>
          </div>

          {isInitializing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="border border-border p-6 space-y-4">
                  <div className="h-6 w-1/3 animate-pulse bg-muted" />
                  <div className="h-4 w-full animate-pulse bg-muted" />
                  <div className="h-4 w-2/3 animate-pulse bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeTab === "about" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
                  <div className="border border-border p-6 md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm tracking-wider uppercase text-muted-foreground mb-3">About Editor</p>
                        <h2 className="text-2xl md:text-3xl">编辑 About 页面内容</h2>
                        <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                          这里的表单会直接保存到 `/api/about`。刷新后台后会重新从后端加载当前内容，不依赖本地临时状态。
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isAboutSaving
                          ? "正在保存 About 内容..."
                          : isAboutDirty
                            ? "你有未保存的 About 修改"
                            : about.updatedAt
                              ? `最近同步：${new Date(about.updatedAt).toLocaleString()}`
                              : "当前为可编辑空表单，保存后将写入后台"}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="border border-border p-6 space-y-4">
                      <h2 className="text-2xl">English Intro</h2>
                      <label className="block text-sm text-muted-foreground">English Intro</label>
                      <textarea
                        rows={8}
                        value={aboutForm.introEn}
                        onChange={(event) => updateAboutField("introEn", event.target.value)}
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none resize-none bg-background"
                        placeholder="Write your English introduction here..."
                      />
                      <label className="block text-sm text-muted-foreground">English Locations</label>
                      <textarea
                        rows={6}
                        value={aboutForm.locationsEn}
                        onChange={(event) => updateAboutField("locationsEn", event.target.value)}
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none resize-none bg-background"
                        placeholder="One location per line"
                      />
                    </div>
                    <div className="border border-border p-6 space-y-4">
                      <h2 className="text-2xl">中文介绍</h2>
                      <label className="block text-sm text-muted-foreground">中文介绍</label>
                      <textarea
                        rows={8}
                        value={aboutForm.introZh}
                        onChange={(event) => updateAboutField("introZh", event.target.value)}
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none resize-none bg-background"
                        placeholder="在这里填写中文个人介绍..."
                      />
                      <label className="block text-sm text-muted-foreground">中文地点列表</label>
                      <textarea
                        rows={6}
                        value={aboutForm.locationsZh}
                        onChange={(event) => updateAboutField("locationsZh", event.target.value)}
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none resize-none bg-background"
                        placeholder="每行一个地点"
                      />
                    </div>
                  </div>

                  <div className="border border-border p-6 space-y-4">
                    <div>
                      <h3 className="text-xl">Contact & Portrait</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        联系方式为空时也会保留可编辑状态，你可以稍后补充并单独保存。
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        value={aboutForm.email}
                        onChange={(event) => updateAboutField("email", event.target.value)}
                        placeholder="Email / mailto"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={aboutForm.instagram}
                        onChange={(event) => updateAboutField("instagram", event.target.value)}
                        placeholder="Instagram URL"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={aboutForm.apps}
                        onChange={(event) => updateAboutField("apps", event.target.value)}
                        placeholder="Apps Link"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={aboutForm.portraitUrl}
                        onChange={(event) => updateAboutField("portraitUrl", event.target.value)}
                        placeholder="Portrait URL"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleSaveAbout}
                        disabled={isAboutSaving}
                        className="px-8 py-3 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60 transition-colors text-sm tracking-wider uppercase flex items-center gap-2"
                      >
                        <Save size={16} />
                        {isAboutSaving ? "Saving About..." : "Save About"}
                      </button>
                      <button
                        onClick={() => resetAboutForm(about)}
                        disabled={isAboutSaving}
                        className="px-8 py-3 border border-border hover:border-foreground disabled:opacity-60 transition-colors text-sm tracking-wider uppercase"
                      >
                        Reset Form
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "business" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
                  <div className="border border-border p-6 md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm tracking-wider uppercase text-muted-foreground mb-3">消息中心说明</p>
                        <h2 className="text-2xl md:text-3xl">这里是后台内部信收件箱</h2>
                        <p className="text-sm text-muted-foreground mt-3 max-w-3xl">
                          左侧列表会优先展示未读来信，并补充姓名、邮箱、公司、来源页面、提交时间和处理状态。右侧按“来信人信息、留言正文、处理动作、系统记录”的顺序展开，点击详情后会自动标记已读。
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {hasUnreadInquiries ? `当前有 ${inquiryStats.unread} 条未读来信` : "当前没有未读来信"}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="border border-border p-6">
                      <p className="text-sm tracking-wider uppercase text-muted-foreground mb-3">首次使用</p>
                      <h3 className="text-xl">先看左侧，再看右侧</h3>
                      <p className="text-sm text-muted-foreground mt-3">
                        点击左侧任意一封内部信，右侧会立即显示完整详情，并在打开后自动标记为已读。
                      </p>
                    </div>
                    <div className="border border-border p-6">
                      <p className="text-sm tracking-wider uppercase text-muted-foreground mb-3">阅读流程</p>
                      <h3 className="text-xl">按来源、时间和正文快速判断</h3>
                      <p className="text-sm text-muted-foreground mt-3">
                        详情区会展示姓名、邮箱、公司、来源页面、提交时间和正文，方便你快速判断是否需要跟进。
                      </p>
                    </div>
                    <div className="border border-border p-6">
                      <p className="text-sm tracking-wider uppercase text-muted-foreground mb-3">处理方式</p>
                      <h3 className="text-xl">直接更新内部信状态</h3>
                      <p className="text-sm text-muted-foreground mt-3">
                        阅读完成后，可将状态切换为待跟进、处理中或已处理，消息中心会持续保留对应进度。
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="border border-border p-6">
                      <p className="text-sm text-muted-foreground mb-2">收件总数</p>
                      <p className="text-4xl">{inquiryStats.total}</p>
                    </div>
                    <div className="border border-border p-6">
                      <p className="text-sm text-muted-foreground mb-2">未读内部信</p>
                      <p className="text-4xl">{inquiryStats.unread}</p>
                    </div>
                    <div className="border border-border p-6">
                      <p className="text-sm text-muted-foreground mb-2">待处理</p>
                      <p className="text-4xl">{inquiryStats.unresolved}</p>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-[420px_1fr] gap-8">
                    <div className="border border-border p-4 md:p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-2xl">消息中心</h2>
                          <p className="text-sm text-muted-foreground mt-2">
                            未读来信会优先排在前面。选中任意一封后，右侧会按阅读顺序展开完整内容并同步状态。
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {inquiries.length} 封来信{hasUnreadInquiries ? ` · ${inquiryStats.unread} 封未读` : ""}
                        </span>
                      </div>

                      {inquiries.length === 0 ? (
                        <div className="border border-dashed border-border p-6 md:p-8">
                          <p className="text-sm tracking-wider uppercase text-muted-foreground">空状态</p>
                          <h3 className="mt-3 text-xl">消息中心暂时还没有收到内部信</h3>
                          <p className="mt-3 text-sm text-muted-foreground leading-6">
                            当前还没有访客来信。用户在前台 `About` 页的“内部信 / 消息中心”表单提交消息后，会自动出现在这里，并同步显示未读数量。
                          </p>
                          <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                            <div className="border border-border px-4 py-3">
                              1. 前往 `About` 页确认“内部信 / 消息中心”入口是否可见
                            </div>
                            <div className="border border-border px-4 py-3">
                              2. 提交一条测试内部信，确认左侧列表会出现新来信
                            </div>
                            <div className="border border-border px-4 py-3">
                              3. 点开详情后检查已读状态和处理状态是否能正常更新
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                          {sortedInquiries.map((inquiry) => {
                            const isSelected = selectedInquiryId === inquiry.id;
                            const visualReadStatus: InquiryVisualReadStatus =
                              pendingReadInquiryId === inquiry.id ? "reading" : inquiry.readStatus;

                            return (
                              <button
                                key={inquiry.id}
                                onClick={() => handleSelectInquiry(inquiry.id)}
                                className={`w-full text-left border p-4 transition-colors ${
                                  isSelected
                                    ? "border-foreground bg-muted/30"
                                    : visualReadStatus === "unread"
                                      ? "border-foreground/40 bg-foreground/[0.03] hover:border-foreground"
                                      : "border-border hover:border-foreground/30"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                                          visualReadStatus === "unread" ? "bg-foreground" : "bg-border"
                                        }`}
                                      />
                                      <p className={`truncate ${visualReadStatus === "unread" ? "font-semibold" : "font-medium"}`}>
                                        {inquiry.name}
                                      </p>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground truncate">{inquiry.email}</p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                      <span className="rounded-full border border-border px-2 py-1">
                                        公司：{inquiry.company || "未填写"}
                                      </span>
                                      <span className="rounded-full border border-border px-2 py-1">
                                        来源：{inquiry.sourcePage || "/about"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2 text-right">
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] tracking-wider ${getInquiryStatusBadgeClassName(inquiry.status)}`}
                                    >
                                      {getInquiryStatusLabel(inquiry.status)}
                                    </span>
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] tracking-wider ${getReadStatusBadgeClassName(visualReadStatus)}`}
                                    >
                                      {getVisualReadStatusLabel(visualReadStatus)}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-4 line-clamp-2">{inquiry.message}</p>
                                <div className="flex items-center justify-between gap-3 mt-4 text-xs text-muted-foreground">
                                  <span>提交于 {formatDateTime(inquiry.createdAt)}</span>
                                  <span>{isSelected ? "正在阅读" : "点击查看详情"}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="border border-border p-6 md:p-8 space-y-6">
                      {currentInquiry ? (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-sm tracking-wider uppercase text-muted-foreground mb-3">
                                内部信 #{currentInquiry.id}
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-2xl md:text-3xl">{currentInquiry.name}</h2>
                                <span
                                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs tracking-wider ${getInquiryStatusBadgeClassName(currentInquiry.status)}`}
                                >
                                  {getInquiryStatusLabel(currentInquiry.status)}
                                </span>
                                <span
                                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs tracking-wider ${getReadStatusBadgeClassName(
                                    pendingReadInquiryId === currentInquiry.id ? "reading" : currentInquiry.readStatus
                                  )}`}
                                >
                                  {getVisualReadStatusLabel(
                                    pendingReadInquiryId === currentInquiry.id ? "reading" : currentInquiry.readStatus
                                  )}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-3">
                                {currentInquiry.company ? `${currentInquiry.company} · ` : ""}
                                {currentInquiry.email}
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {isInquiryDetailLoading ? "正在同步详情..." : `提交时间：${formatDateTime(currentInquiry.createdAt)}`}
                            </div>
                          </div>

                          <div className="border border-dashed border-border p-4 text-sm text-muted-foreground">
                            阅读顺序建议：先确认来信人和来源页面，再阅读留言正文，最后更新处理状态。点击左侧消息后，系统会自动把该留言标记为已读。
                          </div>

                          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                            <div className="border border-border p-4 space-y-2">
                              <p className="text-sm tracking-wider uppercase text-muted-foreground">姓名</p>
                              <p>{currentInquiry.name}</p>
                            </div>
                            <div className="border border-border p-4 space-y-2">
                              <p className="text-sm tracking-wider uppercase text-muted-foreground">邮箱</p>
                              <a href={`mailto:${currentInquiry.email}`} className="break-all underline underline-offset-4">
                                {currentInquiry.email}
                              </a>
                            </div>
                            <div className="border border-border p-4 space-y-2">
                              <p className="text-sm tracking-wider uppercase text-muted-foreground">公司</p>
                              <p>{currentInquiry.company || "未填写公司"}</p>
                            </div>
                            <div className="border border-border p-4 space-y-2">
                              <p className="text-sm tracking-wider uppercase text-muted-foreground">来源页面</p>
                              <p>{currentInquiry.sourcePage || "/about"}</p>
                            </div>
                            <div className="border border-border p-4 space-y-2">
                              <p className="text-sm tracking-wider uppercase text-muted-foreground">提交时间</p>
                              <p>{formatDateTime(currentInquiry.createdAt)}</p>
                            </div>
                            <div className="border border-border p-4 space-y-2">
                              <p className="text-sm tracking-wider uppercase text-muted-foreground">阅读状态</p>
                              <p>
                                {getVisualReadStatusLabel(
                                  pendingReadInquiryId === currentInquiry.id ? "reading" : currentInquiry.readStatus
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {currentInquiry.readAt
                                  ? `已读时间：${formatDateTime(currentInquiry.readAt)}`
                                  : pendingReadInquiryId === currentInquiry.id
                                    ? "正在同步已读状态..."
                                    : "打开这封内部信的详情后会自动标记为已读"}
                              </p>
                            </div>
                          </div>

                          <div className="border border-border p-6">
                            <p className="text-sm tracking-wider uppercase text-muted-foreground mb-4">留言内容</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{currentInquiry.message}</p>
                          </div>

                          <div className="border border-border p-6 space-y-4">
                            <div>
                              <h3 className="text-xl">处理状态</h3>
                              <p className="text-sm text-muted-foreground mt-2">
                                阅读完正文后，可在这里把内部信标记为待跟进、处理中或已处理，状态会同步更新到列表和详情头部。
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {BUSINESS_STATUS_OPTIONS.map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => handleUpdateInquiryStatus(option.value)}
                                  disabled={isInquiryStatusSaving || currentInquiry.status === option.value}
                                  className={`px-5 py-3 border transition-colors text-sm tracking-wider uppercase ${
                                    currentInquiry.status === option.value
                                      ? "bg-foreground text-background border-foreground"
                                      : "border-border hover:border-foreground"
                                  } disabled:opacity-60`}
                                >
                                  {isInquiryStatusSaving && pendingInquiryStatus === option.value ? "保存中..." : option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="border border-border p-6 space-y-4">
                            <div>
                              <h3 className="text-xl">系统记录</h3>
                              <p className="text-sm text-muted-foreground mt-2">
                                这里保留通知投递结果与后台同步时间，便于排查消息流转是否正常。
                              </p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="border border-border p-4 space-y-2">
                                <p className="text-sm tracking-wider uppercase text-muted-foreground">内部通知模式</p>
                                <p>{getNotificationStatusLabel(currentInquiry.ownerNotificationStatus)}</p>
                                {currentInquiry.ownerNotificationError && (
                                  <p className="text-sm text-muted-foreground">{currentInquiry.ownerNotificationError}</p>
                                )}
                              </div>
                              <div className="border border-border p-4 space-y-2">
                                <p className="text-sm tracking-wider uppercase text-muted-foreground">访客通知模式</p>
                                <p>{getNotificationStatusLabel(currentInquiry.visitorReceiptStatus)}</p>
                                {currentInquiry.visitorReceiptError && (
                                  <p className="text-sm text-muted-foreground">{currentInquiry.visitorReceiptError}</p>
                                )}
                              </div>
                              <div className="border border-border p-4 space-y-2">
                                <p className="text-sm tracking-wider uppercase text-muted-foreground">最近同步</p>
                                <p>{formatDateTime(currentInquiry.updatedAt)}</p>
                              </div>
                              <div className="border border-border p-4 space-y-2">
                                <p className="text-sm tracking-wider uppercase text-muted-foreground">处理提示</p>
                                <p className="text-sm text-muted-foreground">
                                  如需继续跟进，可先将状态切到“处理中”，完成沟通后再改为“已处理”。
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="border border-dashed border-border p-6 md:p-8">
                          <p className="text-sm tracking-wider uppercase text-muted-foreground">阅读帮助</p>
                          <h3 className="mt-3 text-xl">从左侧选择一封内部信开始阅读</h3>
                          <p className="mt-3 text-sm text-muted-foreground leading-6">
                            点击左侧列表中的任意来信后，右侧会显示完整详情。你可以在这里查看来源页面、正文和已读状态，并直接更新处理进度。
                          </p>
                          <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                            <div className="border border-border px-4 py-3">
                              1. 左侧选中一封内部信
                            </div>
                            <div className="border border-border px-4 py-3">
                              2. 右侧阅读详情并确认是否已自动标记为已读
                            </div>
                            <div className="border border-border px-4 py-3">
                              3. 根据进度切换为待跟进、处理中或已处理
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "ai" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
                  <div className="border border-border p-6 space-y-6">
                    <div>
                      <h3 className="text-xl mb-2">AI Entries</h3>
                      <p className="text-sm text-muted-foreground">Apps 页面与 About 入口都共享这份后端数据。</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 border-b border-border pb-6">
                      <input
                        value={newAiEntry.titleEn}
                        onChange={(event) => setNewAiEntry((prev) => ({ ...prev, titleEn: event.target.value }))}
                        placeholder="New title (EN)"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={newAiEntry.titleZh}
                        onChange={(event) => setNewAiEntry((prev) => ({ ...prev, titleZh: event.target.value }))}
                        placeholder="新标题（中文）"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={newAiEntry.descriptionEn}
                        onChange={(event) => setNewAiEntry((prev) => ({ ...prev, descriptionEn: event.target.value }))}
                        placeholder="Description (EN)"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={newAiEntry.descriptionZh}
                        onChange={(event) => setNewAiEntry((prev) => ({ ...prev, descriptionZh: event.target.value }))}
                        placeholder="描述（中文）"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={newAiEntry.url}
                        onChange={(event) => setNewAiEntry((prev) => ({ ...prev, url: event.target.value }))}
                        placeholder="https://..."
                        className="md:col-span-2 w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        type="number"
                        value={newAiEntry.sortOrder}
                        onChange={(event) => setNewAiEntry((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 100 }))}
                        placeholder="Sort order"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <label className="flex items-center gap-3 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={newAiEntry.isActive}
                          onChange={(event) => setNewAiEntry((prev) => ({ ...prev, isActive: event.target.checked }))}
                        />
                        Active
                      </label>
                    </div>
                    <button onClick={handleCreateAiEntry} className="px-8 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm tracking-wider uppercase flex items-center gap-2">
                      <Plus size={16} />
                      Create AI Entry
                    </button>

                    <div className="space-y-4">
                      {aiEntries.map((entry) => (
                        <div key={entry.id} className="border border-border p-4 md:p-6 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <input
                              value={aiDrafts[entry.id]?.titleEn || ""}
                              onChange={(event) => setAiDrafts((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id], titleEn: event.target.value } }))}
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              value={aiDrafts[entry.id]?.titleZh || ""}
                              onChange={(event) => setAiDrafts((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id], titleZh: event.target.value } }))}
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              value={aiDrafts[entry.id]?.descriptionEn || ""}
                              onChange={(event) => setAiDrafts((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id], descriptionEn: event.target.value } }))}
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              value={aiDrafts[entry.id]?.descriptionZh || ""}
                              onChange={(event) => setAiDrafts((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id], descriptionZh: event.target.value } }))}
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              value={aiDrafts[entry.id]?.url || ""}
                              onChange={(event) => setAiDrafts((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id], url: event.target.value } }))}
                              className="md:col-span-2 w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              type="number"
                              value={aiDrafts[entry.id]?.sortOrder || 100}
                              onChange={(event) => setAiDrafts((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id], sortOrder: Number(event.target.value) || 100 } }))}
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <label className="flex items-center gap-3 text-sm text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={aiDrafts[entry.id]?.isActive || false}
                                onChange={(event) => setAiDrafts((prev) => ({ ...prev, [entry.id]: { ...prev[entry.id], isActive: event.target.checked } }))}
                              />
                              Active
                            </label>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => handleSaveAiEntry(entry.id)} className="px-6 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm tracking-wider uppercase">
                              Save
                            </button>
                            <button onClick={() => handleDeleteAiEntry(entry.id)} className="px-6 py-3 border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors text-sm tracking-wider uppercase">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "videos" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
                  <div className="border border-border p-6 md:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm tracking-wider uppercase text-muted-foreground mb-3">Video Rules</p>
                        <h2 className="text-2xl md:text-3xl">首页视频轮播说明</h2>
                        <p className="text-sm text-muted-foreground mt-3 max-w-3xl">
                          首页会按排序权重从小到大，自动轮播前 3 条已启用视频；如果仅有 1 条已启用视频，则保持单视频展示。后台这里仍会显示全部视频，方便统一管理排序与启用状态。
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                          MOV、M4V 等文件会按 MP4 兼容播放链路分发；如果源文件编码本身不被浏览器支持，建议优先转为 H.264 MP4 后再上传。
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        当前共 {videos.length} 条视频记录
                      </div>
                    </div>
                  </div>

                  <div className="border border-border p-6 space-y-4">
                    <h2 className="text-2xl">Upload New Video</h2>
                    <p className="text-sm text-muted-foreground">
                      当前支持上传 MP4、M4V、MOV、WebM 等主流视频格式，具体以后台校验结果为准。
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        value={newVideo.title}
                        onChange={(event) => setNewVideo((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Video title"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        type="number"
                        value={newVideo.sortOrder}
                        onChange={(event) => setNewVideo((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 100 }))}
                        placeholder="Sort order"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        type="file"
                        accept={VIDEO_UPLOAD_ACCEPT}
                        onChange={(event) => setNewVideoFile(event.target.files?.[0] || null)}
                      />
                      <label className="flex items-center gap-3 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={newVideo.isActive}
                          onChange={(event) => setNewVideo((prev) => ({ ...prev, isActive: event.target.checked }))}
                        />
                        Active
                      </label>
                    </div>
                    <button onClick={handleCreateVideo} className="px-8 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm tracking-wider uppercase flex items-center gap-2">
                      <Upload size={16} />
                      Upload Video
                    </button>
                  </div>

                  <div className="space-y-4">
                    {videos.map((video) => (
                      <div key={video.id} className="border border-border p-6">
                        <div className="grid md:grid-cols-[1fr_140px_140px_auto] gap-4 items-center">
                          <input
                            value={videoDrafts[video.id]?.title || ""}
                            onChange={(event) => setVideoDrafts((prev) => ({ ...prev, [video.id]: { ...prev[video.id], title: event.target.value } }))}
                            className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                          />
                          <input
                            type="number"
                            value={videoDrafts[video.id]?.sortOrder || 100}
                            onChange={(event) => setVideoDrafts((prev) => ({ ...prev, [video.id]: { ...prev[video.id], sortOrder: Number(event.target.value) || 100 } }))}
                            className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                          />
                          <button
                            onClick={() => handleToggleVideoStatus(video.id, !(videoDrafts[video.id]?.isActive ?? video.isActive))}
                            className="px-4 py-3 border border-border hover:border-foreground transition-colors text-sm uppercase"
                          >
                            {(videoDrafts[video.id]?.isActive ?? video.isActive) ? "Active" : "Inactive"}
                          </button>
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveVideo(video.id)} className="p-3 bg-foreground text-background hover:bg-foreground/90 transition-colors">
                              <Save size={16} />
                            </button>
                            <button onClick={() => handleDeleteVideo(video.id)} className="p-3 border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">{video.url}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "gallery" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
                  <div className="border border-border p-6 space-y-6">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <h2 className="text-2xl">Collections</h2>
                        <p className="text-sm text-muted-foreground mt-2">合集的新增、编辑、删除已直接连接后端持久化接口。</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{collections.length} collections</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 border-b border-border pb-6">
                      <input
                        value={newCollection.locationEn}
                        onChange={(event) => setNewCollection((prev) => ({ ...prev, locationEn: event.target.value }))}
                        placeholder="Location EN"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={newCollection.locationZh}
                        onChange={(event) => setNewCollection((prev) => ({ ...prev, locationZh: event.target.value }))}
                        placeholder="地点（中文）"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={newCollection.descriptionEn}
                        onChange={(event) => setNewCollection((prev) => ({ ...prev, descriptionEn: event.target.value }))}
                        placeholder="Description EN"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={newCollection.descriptionZh}
                        onChange={(event) => setNewCollection((prev) => ({ ...prev, descriptionZh: event.target.value }))}
                        placeholder="描述（中文）"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={newCollection.category}
                        onChange={(event) => setNewCollection((prev) => ({ ...prev, category: event.target.value }))}
                        placeholder="Category"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        type="number"
                        value={newCollection.sortOrder}
                        onChange={(event) => setNewCollection((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 100 }))}
                        placeholder="Sort order"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                    </div>

                    <button onClick={handleCreateCollection} className="px-8 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm tracking-wider uppercase flex items-center gap-2">
                      <Plus size={16} />
                      Create Collection
                    </button>

                    <div className="space-y-4">
                      {collections.map((collection) => (
                        <div key={collection.id} className="border border-border p-4 md:p-6 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm tracking-wider uppercase text-muted-foreground">
                                {collectionPhotoCounts.get(collection.id) ?? collection.photoCount} Photos
                              </p>
                              <p className="text-lg">
                                {collection.locationZh || collection.locationEn}
                              </p>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => handleSaveCollection(collection.id)} className="px-6 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm tracking-wider uppercase">
                                Save
                              </button>
                              <button onClick={() => handleDeleteCollection(collection.id)} className="px-6 py-3 border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors text-sm tracking-wider uppercase">
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <input
                              value={collectionDrafts[collection.id]?.locationEn || ""}
                              onChange={(event) => setCollectionDrafts((prev) => ({ ...prev, [collection.id]: { ...prev[collection.id], locationEn: event.target.value } }))}
                              placeholder="Location EN"
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              value={collectionDrafts[collection.id]?.locationZh || ""}
                              onChange={(event) => setCollectionDrafts((prev) => ({ ...prev, [collection.id]: { ...prev[collection.id], locationZh: event.target.value } }))}
                              placeholder="地点（中文）"
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              value={collectionDrafts[collection.id]?.descriptionEn || ""}
                              onChange={(event) => setCollectionDrafts((prev) => ({ ...prev, [collection.id]: { ...prev[collection.id], descriptionEn: event.target.value } }))}
                              placeholder="Description EN"
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              value={collectionDrafts[collection.id]?.descriptionZh || ""}
                              onChange={(event) => setCollectionDrafts((prev) => ({ ...prev, [collection.id]: { ...prev[collection.id], descriptionZh: event.target.value } }))}
                              placeholder="描述（中文）"
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              value={collectionDrafts[collection.id]?.category || ""}
                              onChange={(event) => setCollectionDrafts((prev) => ({ ...prev, [collection.id]: { ...prev[collection.id], category: event.target.value } }))}
                              placeholder="Category"
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                            <input
                              type="number"
                              value={collectionDrafts[collection.id]?.sortOrder || 100}
                              onChange={(event) => setCollectionDrafts((prev) => ({ ...prev, [collection.id]: { ...prev[collection.id], sortOrder: Number(event.target.value) || 100 } }))}
                              placeholder="Sort order"
                              className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-border p-6 space-y-4">
                    <h2 className="text-2xl">Batch Upload</h2>
                    <p className="text-sm text-muted-foreground">
                      一次选择多张图片后，可以统一填写合集、地点、分类、版权和排序规则；下方文件队列还可以逐张补充标题、描述和详情。
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      <select
                        value={uploadCollectionId}
                        onChange={(event) => setUploadCollectionId(Number(event.target.value))}
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      >
                        <option value={0}>Select Collection</option>
                        {collectionOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={uploadCategory}
                        onChange={(event) => setUploadCategory(event.target.value)}
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      >
                        {CATEGORY_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        value={uploadLocation}
                        onChange={(event) => setUploadLocation(event.target.value)}
                        placeholder="Location override"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        value={uploadCopyrightName}
                        onChange={(event) => setUploadCopyrightName(event.target.value)}
                        placeholder="Copyright name"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <input
                        type="number"
                        value={uploadCopyrightYear}
                        onChange={(event) => setUploadCopyrightYear(Number(event.target.value) || new Date().getFullYear())}
                        placeholder="Copyright year"
                        className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="number"
                          value={uploadSortStart}
                          onChange={(event) => setUploadSortStart(Number(event.target.value) || 100)}
                          placeholder="Sort start"
                          className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                        />
                        <input
                          type="number"
                          value={uploadSortStep}
                          onChange={(event) => setUploadSortStep(Number(event.target.value) || 10)}
                          placeholder="Sort step"
                          className="w-full px-4 py-3 border border-border focus:border-foreground outline-none bg-background"
                        />
                      </div>
                    </div>
                    <input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      multiple
                      onChange={(event) => handleUploadFilesChange(Array.from(event.target.files || []))}
                    />
                    {uploadFiles.length > 0 && (
                      <div className="space-y-3 border border-border p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-sm text-muted-foreground">
                            待上传 {uploadFiles.length} 张。失败项目会保留在队列中，方便你修正后重试。
                          </p>
                          <button
                            onClick={() => {
                              setUploadFiles([]);
                              setUploadDrafts([]);
                              setUploadFailures([]);
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Clear Queue
                          </button>
                        </div>
                        {uploadFiles.map((file, index) => (
                          <div key={`${file.name}-${file.lastModified}-${index}`} className="border border-border p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{file.name}</p>
                                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                              <button
                                onClick={() => {
                                  setUploadFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
                                  setUploadDrafts((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
                                }}
                                className="text-sm text-destructive hover:opacity-80 transition-opacity"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                              <input
                                value={uploadDrafts[index]?.titleEn || ""}
                                onChange={(event) =>
                                  setUploadDrafts((prev) =>
                                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, titleEn: event.target.value } : item))
                                  )
                                }
                                placeholder="Title EN"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                              <input
                                value={uploadDrafts[index]?.titleZh || ""}
                                onChange={(event) =>
                                  setUploadDrafts((prev) =>
                                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, titleZh: event.target.value } : item))
                                  )
                                }
                                placeholder="标题（中文）"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                              <input
                                value={uploadDrafts[index]?.descriptionEn || ""}
                                onChange={(event) =>
                                  setUploadDrafts((prev) =>
                                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, descriptionEn: event.target.value } : item))
                                  )
                                }
                                placeholder="Description EN"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                              <input
                                value={uploadDrafts[index]?.descriptionZh || ""}
                                onChange={(event) =>
                                  setUploadDrafts((prev) =>
                                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, descriptionZh: event.target.value } : item))
                                  )
                                }
                                placeholder="描述（中文）"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                              <input
                                value={uploadDrafts[index]?.detailsEn || ""}
                                onChange={(event) =>
                                  setUploadDrafts((prev) =>
                                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, detailsEn: event.target.value } : item))
                                  )
                                }
                                placeholder="Details EN"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                              <input
                                value={uploadDrafts[index]?.detailsZh || ""}
                                onChange={(event) =>
                                  setUploadDrafts((prev) =>
                                    prev.map((item, itemIndex) => (itemIndex === index ? { ...item, detailsZh: event.target.value } : item))
                                  )
                                }
                                placeholder="详情（中文）"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                            </div>
                            <input
                              type="number"
                              value={uploadDrafts[index]?.sortOrder || uploadSortStart + index * uploadSortStep}
                              onChange={(event) =>
                                setUploadDrafts((prev) =>
                                  prev.map((item, itemIndex) => (itemIndex === index ? { ...item, sortOrder: Number(event.target.value) || 100 } : item))
                                )
                              }
                              placeholder="Sort order"
                              className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadFailures.length > 0 && (
                      <div className="border border-destructive/40 bg-destructive/5 p-4 space-y-2">
                        <p className="text-sm font-medium text-destructive">以下文件上传失败</p>
                        {uploadFailures.map((item, index) => (
                          <p key={`${item.fileName}-${index}`} className="text-sm text-muted-foreground">
                            {item.fileName}: {item.error}
                          </p>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={handleCreatePhotos}
                      disabled={isBatchUploading}
                      className="px-8 py-3 bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm tracking-wider uppercase flex items-center gap-2 disabled:opacity-60"
                    >
                      <Upload size={16} />
                      {isBatchUploading ? "Uploading..." : `Upload ${uploadFiles.length > 0 ? `(${uploadFiles.length})` : ""}`}
                    </button>
                  </div>

                  <div className="border border-border p-4 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() =>
                        setSelectedPhotos(
                          selectedPhotos.size === photos.length ? new Set() : new Set(photos.map((item) => item.id))
                        )
                      }
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selectedPhotos.size === photos.length ? "Deselect All" : "Select All"}
                    </button>
                    <select
                      value={batchEdit.collectionId}
                      onChange={(event) => setBatchEdit((prev) => ({ ...prev, collectionId: Number(event.target.value) }))}
                      className="px-4 py-2 border border-border focus:border-foreground outline-none bg-background"
                    >
                      <option value={0}>Batch collection</option>
                      {collectionOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={batchEdit.location}
                      onChange={(event) => setBatchEdit((prev) => ({ ...prev, location: event.target.value }))}
                      placeholder="Batch location"
                      className="px-4 py-2 border border-border focus:border-foreground outline-none bg-background"
                    />
                    <select
                      value={batchEdit.category}
                      onChange={(event) => setBatchEdit((prev) => ({ ...prev, category: event.target.value }))}
                      className="px-4 py-2 border border-border focus:border-foreground outline-none bg-background"
                    >
                      <option value="">Batch category</option>
                      {CATEGORY_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <input
                      value={batchEdit.copyrightName}
                      onChange={(event) => setBatchEdit((prev) => ({ ...prev, copyrightName: event.target.value }))}
                      placeholder="Batch copyright name"
                      className="px-4 py-2 border border-border focus:border-foreground outline-none bg-background"
                    />
                    <input
                      value={batchEdit.copyrightYear}
                      onChange={(event) => setBatchEdit((prev) => ({ ...prev, copyrightYear: event.target.value }))}
                      placeholder="Batch copyright year"
                      className="px-4 py-2 border border-border focus:border-foreground outline-none bg-background"
                    />
                    <button onClick={handleBatchUpdate} className="px-5 py-2 border border-border hover:border-foreground transition-colors text-sm uppercase">
                      Apply Batch Edit
                    </button>
                    <button onClick={handleBatchDelete} className="px-5 py-2 border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors text-sm uppercase">
                      Delete Selected
                    </button>
                    <span className="ml-auto text-sm text-muted-foreground">{photos.length} photos total</span>
                  </div>

                  <div className="space-y-4">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className={`border p-6 transition-colors ${
                          selectedPhotos.has(photo.id) ? "border-foreground bg-muted/30" : "border-border hover:border-foreground/30"
                        }`}
                      >
                        <div className="grid md:grid-cols-[auto_120px_1fr_auto] gap-6 items-start">
                          <div className="pt-2">
                            <input
                              type="checkbox"
                              checked={selectedPhotos.has(photo.id)}
                              onChange={() =>
                                setSelectedPhotos((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(photo.id)) {
                                    next.delete(photo.id);
                                  } else {
                                    next.add(photo.id);
                                  }
                                  return next;
                                })
                              }
                            />
                          </div>
                          <div
                            className="overflow-hidden bg-muted"
                            style={{ aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : "3 / 4" }}
                          >
                            <img
                              src={photo.thumbUrl || photo.imageUrl}
                              alt={photo.title || photo.description}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="grid md:grid-cols-2 gap-3">
                              <input
                                value={photoDrafts[photo.id]?.titleEn || ""}
                                onChange={(event) => setPhotoDrafts((prev) => ({ ...prev, [photo.id]: { ...prev[photo.id], titleEn: event.target.value } }))}
                                placeholder="Title EN"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                              <input
                                value={photoDrafts[photo.id]?.titleZh || ""}
                                onChange={(event) => setPhotoDrafts((prev) => ({ ...prev, [photo.id]: { ...prev[photo.id], titleZh: event.target.value } }))}
                                placeholder="标题（中文）"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                            </div>
                            <div className="grid md:grid-cols-2 gap-3">
                              <input
                                value={photoDrafts[photo.id]?.descriptionEn || ""}
                                onChange={(event) => setPhotoDrafts((prev) => ({ ...prev, [photo.id]: { ...prev[photo.id], descriptionEn: event.target.value } }))}
                                placeholder="Description EN"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                              <input
                                value={photoDrafts[photo.id]?.descriptionZh || ""}
                                onChange={(event) => setPhotoDrafts((prev) => ({ ...prev, [photo.id]: { ...prev[photo.id], descriptionZh: event.target.value } }))}
                                placeholder="描述（中文）"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                            </div>
                            <div className="grid md:grid-cols-3 gap-3">
                              <select
                                value={photoDrafts[photo.id]?.collectionId || photo.collectionId}
                                onChange={(event) => setPhotoDrafts((prev) => ({ ...prev, [photo.id]: { ...prev[photo.id], collectionId: Number(event.target.value) } }))}
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              >
                                {collectionOptions.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={photoDrafts[photo.id]?.location || ""}
                                onChange={(event) => setPhotoDrafts((prev) => ({ ...prev, [photo.id]: { ...prev[photo.id], location: event.target.value } }))}
                                placeholder="Location"
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              />
                              <select
                                value={photoDrafts[photo.id]?.category || "Landscape"}
                                onChange={(event) => setPhotoDrafts((prev) => ({ ...prev, [photo.id]: { ...prev[photo.id], category: event.target.value } }))}
                                className="w-full px-3 py-2 border border-border focus:border-foreground outline-none bg-background"
                              >
                                {CATEGORY_OPTIONS.map((item) => (
                                  <option key={item} value={item}>
                                    {item}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleSavePhoto(photo.id)} className="p-3 bg-foreground text-background hover:bg-foreground/90 transition-colors">
                              <Save size={16} />
                            </button>
                            <button onClick={() => handleDeletePhoto(photo.id)} className="p-3 border border-destructive text-destructive hover:bg-destructive hover:text-white transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "analytics" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-8">
                  <div className="flex gap-3">
                    {(["7d", "30d", "90d"] as AnalyticsRange[]).map((range) => (
                      <button
                        key={range}
                        onClick={() => setAnalyticsRange(range)}
                        className={`px-5 py-3 border transition-colors text-sm tracking-wider uppercase ${
                          analyticsRange === range ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground"
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="border border-border p-6">
                      <p className="text-sm text-muted-foreground mb-2">Page Views</p>
                      <p className="text-4xl">{pageviews?.total ?? 0}</p>
                    </div>
                    <div className="border border-border p-6">
                      <p className="text-sm text-muted-foreground mb-2">Button Clicks</p>
                      <p className="text-4xl">{buttonClicks?.total ?? 0}</p>
                    </div>
                    <div className="border border-border p-6">
                      <p className="text-sm text-muted-foreground mb-2">Tracked Photos</p>
                      <p className="text-4xl">{topPhotos.length}</p>
                    </div>
                  </div>

                  {isAnalyticsLoading ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="border border-border p-6 space-y-4">
                          <div className="h-5 w-1/2 animate-pulse bg-muted" />
                          <div className="h-4 w-full animate-pulse bg-muted" />
                          <div className="h-4 w-2/3 animate-pulse bg-muted" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="border border-border p-6">
                        <h3 className="text-xl mb-4">Top Pages</h3>
                        <div className="space-y-3">
                          {pageviews?.items.map((item) => (
                            <div key={item.page} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{item.page}</span>
                              <span>{item.views}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border border-border p-6">
                        <h3 className="text-xl mb-4">Top Buttons</h3>
                        <div className="space-y-3">
                          {buttonClicks?.items.map((item) => (
                            <div key={item.targetId} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{item.targetId}</span>
                              <span>{item.clicks}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2 border border-border p-6">
                        <h3 className="text-xl mb-4">Top Photos</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          {topPhotos.map((item) => (
                            <div key={item.photoId} className="border border-border p-4 flex items-center gap-4">
                              <div className="w-16 h-20 bg-muted overflow-hidden flex items-center justify-center">
                                {item.thumbUrl && <img src={item.thumbUrl} alt={item.titleEn || item.titleZh} className="w-full h-full object-contain" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{item.titleZh || item.titleEn || `Photo #${item.photoId}`}</p>
                                <p className="text-sm text-muted-foreground">Views: {item.views}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
