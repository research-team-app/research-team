"use client";

import React, {
  ComponentPropsWithoutRef,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Phone,
  Building2,
  FileText,
  Banknote,
  Link2,
  Pencil,
  UserPlus,
  Plus,
  CircleCheck,
  Globe,
  BookOpen,
  IdCard,
  Briefcase,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { FaTwitter, FaLinkedin, FaResearchgate, FaOrcid } from "react-icons/fa";
import { SiGooglescholar } from "react-icons/si";
import Button from "@/components/ui/Button";
import { useSearchParams, useRouter } from "next/navigation";
import Listbox from "@/components/ui/Listbox";
import { useAuthStore } from "@/store/useAuthStore";
import {
  ACADEMIC_STATUS_CONFIG,
  useProfileStore,
  type ResearcherProfile,
} from "@/store/useProfileStore";
import ProfilePicture from "@/components/ProfilePicture";
import { API_URL } from "@/data/global";
import { RESEARCHER_DEFAULT_VALUES } from "@/store/useProfileStore";
import Badge from "@/components/ui/Badge";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import InputField from "@/components/ui/InputField";
import { AcademicStatusPicker } from "@/components/ui/AcademicStatusPicker";
import Link from "next/link";
import TextArea from "@/components/ui/TextArea";
import AttachmentChip from "@/components/ui/AttachmentChip";
import AttachmentPickerButton from "@/components/ui/AttachmentPickerButton";
import Avatar from "@/components/Avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import Alert from "@/components/ui/Alert";

interface SectionHeaderProps extends ComponentPropsWithoutRef<"div"> {
  title: string;
  icon?: ReactNode;
}

export function SectionHeader({
  icon,
  title,
  id,
  className = "",
  ...rest
}: SectionHeaderProps) {
  return (
    <div
      className={`mb-5 flex items-center gap-3 border-b border-slate-200 pb-3 dark:border-slate-700 ${className}`}
      {...rest}
    >
      {icon && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h2
        id={id}
        className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100"
      >
        {title}
      </h2>
    </div>
  );
}

const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}> = ({ children, className = "", hover = false }) => (
  <div
    className={`rounded-2xl border border-gray-200 bg-white shadow-sm backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/70 ${
      hover
        ? "transition-all duration-300 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:border-slate-500/70 dark:hover:shadow-slate-950/60"
        : ""
    } ${className}`}
  >
    {children}
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 px-4 py-8 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
    <div className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
      <Card className="overflow-hidden">
        <div className="h-32 bg-linear-to-r from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
        <div className="space-y-4 p-6">
          <div className="flex gap-4">
            <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

type OrcidImportData = Partial<ResearcherProfile>;

const ORCID_IMPORTABLE_FIELDS = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "bio", label: "Bio" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "personal_website", label: "Personal Website" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "research_interests", label: "Research Interests" },
];

const formatImportValue = (_key: string, val: unknown): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};

const Profile: React.FC = () => {
  const id = (useSearchParams().get("id") ?? "").trim();

  const router = useRouter();
  const [followLoading, setFollowLoading] = useState(false);
  const [followStats, setFollowStats] = useState<{
    followers: number;
    following: number;
    is_following: boolean;
  } | null>(null);
  const [followDialogType, setFollowDialogType] = useState<
    "followers" | "following" | null
  >(null);
  const [followList, setFollowList] = useState<
    {
      id: string;
      first_name: string;
      last_name: string;
      title?: string;
      institution?: string;
      department?: string;
    }[]
  >([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  const { user, getAccessToken } = useAuthStore();
  const isViewingOwnProfile = !!user?.id && user.id == id;
  const {
    data: profile,
    isLoading,
    isError,
  } = useProfileStore(id, isViewingOwnProfile ? getAccessToken : undefined);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);

  const [cvPresignedUrl, setCvPresignedUrl] = useState<string | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);

  const [orcidImportOpen, setOrcidImportOpen] = useState(false);
  const [orcidId, setOrcidId] = useState("");
  const [orcidLoading, setOrcidLoading] = useState(false);
  const [orcidError, setOrcidError] = useState<string | null>(null);
  const [orcidData, setOrcidData] = useState<OrcidImportData | null>(null);
  const [selectedOrcidFields, setSelectedOrcidFields] = useState<Set<string>>(
    new Set()
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResearcherProfile>({
    defaultValues: RESEARCHER_DEFAULT_VALUES,
  });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({ control, name: "education" });

  const {
    fields: grantFields,
    append: appendGrant,
    remove: removeGrant,
  } = useFieldArray({ control, name: "grants" });

  const {
    fields: interestFields,
    append: appendInterest,
    remove: removeInterest,
  } = useFieldArray({ control, name: "research_interests" as never });

  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({ control, name: "current_projects" });

  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
  } = useFieldArray({ control, name: "experience" });

  const values = watch();
  const isOwner = user?.id == id;
  const canEdit = isOwner && !isPreviewMode;
  const canMessage = !!user?.id && user.id !== id;

  useEffect(() => {
    if (profile) {
      reset(profile);
    }
  }, [profile, reset, isEditing]);

  useEffect(() => {
    if (!id) return;
    const fetchStats = async () => {
      try {
        const [statsRes, checkRes] = await Promise.all([
          axios.get(`${API_URL}/follows/${id}/stats`),
          user?.id && user.id !== id
            ? axios.get(`${API_URL}/follows/${user.id}/check/${id}`)
            : Promise.resolve({ data: { is_following: false } }),
        ]);
        setFollowStats({
          followers: statsRes.data.followers,
          following: statsRes.data.following,
          is_following: checkRes.data.is_following,
        });
      } catch {
        setFollowStats({ followers: 0, following: 0, is_following: false });
      }
    };
    fetchStats();
  }, [id, user?.id]);

  // Fetch CV presigned URL whenever we have a profile with resume_url
  useEffect(() => {
    if (!id) return;
    axios
      .get(`${API_URL}/resume/${id}`)
      .then(({ data }) => setCvPresignedUrl(data.presigned_url ?? null))
      .catch(() => setCvPresignedUrl(null));
  }, [id, profile?.resume_url]);

  const handleCvUpload = async (file: File) => {
    if (!user?.id || user.id !== id) return;
    if (file.type !== "application/pdf") {
      setCvUploadError("Only PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCvUploadError("File must be under 10 MB.");
      return;
    }
    setCvUploading(true);
    setCvUploadError(null);
    try {
      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };

      const { data: presign } = await axios.post(
        `${API_URL}/resume/${user.id}/presigned_put`,
        {},
        { headers }
      );

      await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      }).then((r) => {
        if (!r.ok) throw new Error("Upload failed");
      });

      // Save the S3 key to the user profile
      await axios.put(
        `${API_URL}/users/${user.id}`,
        { resume_url: presign.object_key },
        { headers }
      );

      setCvPresignedUrl(presign.preview_url);
      setValue("resume_url", presign.object_key);
    } catch {
      setCvUploadError("Upload failed. Please try again.");
    } finally {
      setCvUploading(false);
    }
  };

  const handleCvDelete = async () => {
    if (!user?.id || user.id !== id) return;
    try {
      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/resume/${user.id}`, { headers });
      await axios.put(
        `${API_URL}/users/${user.id}`,
        { resume_url: null },
        { headers }
      );
      setCvPresignedUrl(null);
      setValue("resume_url", "");
    } catch {
      setCvUploadError("Failed to remove CV.");
    }
  };

  // update the profile.
  const profileMutation = useMutation({
    mutationFn: async (data: ResearcherProfile) => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Not authenticated. Please sign in again.");
      }

      // Backend expects the path id to match Cognito sub (token.sub).
      const targetId = user?.id ?? data.id;
      const res = await axios.put(`${API_URL}/users/${targetId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
    onError: () => {},
    onSuccess: () => {
      // need to reload the page and scroll to top
      window.location.reload();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const onSubmit = async (data: ResearcherProfile) => {
    // Filter out protected/read-only fields before sending to backend
    // These fields are either identity fields, timestamps, or managed separately
    /* eslint-disable @typescript-eslint/no-unused-vars*/
    const {
      id,
      email,
      cognito_id,
      status,
      username,
      created_at,
      updated_at,
      profile_image_url,
      resume_url,
      publications, // Managed via Google Scholar import
      ...updatableFields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = data as any;

    await profileMutation.mutateAsync(updatableFields as ResearcherProfile);
    reset(data);
    setIsEditing(false);
  };

  const handleFollow = async () => {
    if (!user?.id || followLoading) return;
    setFollowLoading(true);
    try {
      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };
      if (followStats?.is_following) {
        await axios.delete(`${API_URL}/follows/${id}`, { headers });
        setFollowStats((prev) =>
          prev
            ? {
                ...prev,
                followers: Math.max(0, prev.followers - 1),
                is_following: false,
              }
            : prev
        );
      } else {
        await axios.post(`${API_URL}/follows/${id}`, {}, { headers });
        setFollowStats((prev) =>
          prev
            ? { ...prev, followers: prev.followers + 1, is_following: true }
            : prev
        );
      }
    } catch {
      // silently ignore
    } finally {
      setFollowLoading(false);
    }
  };

  const openFollowDialog = async (type: "followers" | "following") => {
    // Only clear list when switching type; preserve it when re-opening same dialog
    if (type !== followDialogType) setFollowList([]);
    setFollowDialogType(type);
    setFollowListLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/follows/${id}/${type}`);
      // Handle response format: { followers: [...] } or { following: [...] }
      const list = data[type] ?? [];
      setFollowList(Array.isArray(list) ? list : []);
    } catch {
      setFollowList([]);
    } finally {
      setFollowListLoading(false);
    }
  };

  const closeOrcidImport = () => {
    setOrcidImportOpen(false);
    setOrcidData(null);
    setOrcidError(null);
    setOrcidId("");
    setSelectedOrcidFields(new Set());
  };

  const handleOrcidFetch = async () => {
    if (!orcidId.trim()) return;
    setOrcidLoading(true);
    setOrcidError(null);
    setOrcidData(null);
    try {
      const token = await getAccessToken();
      const { data } = await axios.post(
        `${API_URL}/users/${user?.id}/import-orcid`,
        { orcid_id: orcidId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = data as OrcidImportData;
      const fields = new Set<string>(
        Object.keys(d).filter(
          (k) => (d as Record<string, unknown>)[k] !== undefined
        )
      );
      setOrcidData(d);
      setSelectedOrcidFields(fields);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Could not fetch ORCID profile.";
      setOrcidError(detail);
    } finally {
      setOrcidLoading(false);
    }
  };

  const applyOrcidImport = (selected: Set<string>) => {
    if (!orcidData) return;
    for (const key of selected) {
      const val = orcidData[key as keyof OrcidImportData];
      if (val !== undefined) {
        setValue(key as keyof ResearcherProfile, val as never);
      }
    }
    closeOrcidImport();
    if (!isEditing) setIsEditing(true);
  };

  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <IdCard className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Invalid profile link
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This profile URL is missing the researcher ID. Check the link and
            try again.
          </p>
          <Button
            className="mt-6"
            intent="primary"
            onClick={() => router.push("/collaborators")}
          >
            Browse researchers
          </Button>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!canMessage) return;
    const content = messageDraft.trim();
    if (!content && !messageFile) return;

    setSendingMessage(true);
    setMessageError(null);
    setMessageSuccess(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Not authenticated");
      }
      const hasFile = messageFile instanceof File;
      const payload = hasFile
        ? (() => {
            const form = new FormData();
            form.append("recipient_id", id);
            form.append("content", content);
            form.append("file", messageFile);
            return form;
          })()
        : { recipient_id: id, content };
      await axios.post(`${API_URL}/messages`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(hasFile ? {} : { "Content-Type": "application/json" }),
        },
      });
      setMessageDraft("");
      setMessageFile(null);
      setMessageSuccess("Message sent.");
      setTimeout(() => setMessageOpen(false), 700);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Could not send message right now.";
      setMessageError(detail);
    } finally {
      setSendingMessage(false);
    }
  };

  if (isLoading && !profile) {
    return <LoadingSkeleton />;
  }

  if (isError && !profile) {
    if (isViewingOwnProfile) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
              <Lock className="h-8 w-8 text-amber-500 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Your profile is private
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Only you can see this page. Other researchers won&apos;t find you
              in search or AI matching while your profile is private.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => router.push("/")}>
                Go home
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
            <FileText className="h-8 w-8 text-red-400 dark:text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Profile not found
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This researcher profile couldn&apos;t be loaded. It may have been
            removed or the link may be incorrect.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              Go back
            </Button>
            <Button
              intent="primary"
              onClick={() => router.push("/collaborators")}
            >
              Browse researchers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-10 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Back + Header row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-9 w-9 shrink-0 p-0!"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="mb-0.5 text-xs font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                Researcher Profile
              </p>
              <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                {values.first_name || values.last_name
                  ? `${values.first_name} ${values.last_name}`.trim()
                  : "Profile"}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isOwner && !isEditing && (
              <>
                {!isPreviewMode && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      startIcon={
                        <FaOrcid className="size-3.5 text-green-600" />
                      }
                      onClick={() => setOrcidImportOpen(true)}
                    >
                      Import ORCID
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      startIcon={<Pencil className="size-4" />}
                    >
                      Edit Profile
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPreviewMode((v) => !v)}
                  startIcon={
                    isPreviewMode ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )
                  }
                >
                  {isPreviewMode ? "Exit Preview" : "Preview"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Preview mode banner */}
        {isPreviewMode && (
          <Alert variant="primary" icon={<Eye className="size-4" />}>
            <strong>Preview mode</strong> — this is exactly what other
            researchers see when they visit your profile.
          </Alert>
        )}

        {/* Private profile notice (owner only, not in preview) */}
        {isOwner && !isPreviewMode && profile?.status === "private" && (
          <Alert variant="warning" icon={<Lock className="size-4" />}>
            <strong>Your profile is private.</strong> Only you can view it — you
            won&apos;t appear in the collaborators directory, search, or AI
            matching.
          </Alert>
        )}

        {/* Hero Card */}
        <Card className="overflow-hidden dark:border-slate-700/50 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/50">
          {/* Banner */}
          <div className="h-32 bg-linear-to-r from-slate-800 via-slate-700 to-slate-800 sm:h-40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

          <div className="px-5 pb-7 sm:px-8 sm:pb-8">
            <div className="-mt-14 flex flex-col gap-1 sm:-mt-16 sm:flex-row sm:gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="overflow-hidden rounded-2xl border-4 border-white shadow-2xl dark:border-slate-800">
                  <ProfilePicture
                    userId={values.id}
                    apiBase={API_URL}
                    Initials={`${values.first_name} ${values.last_name}`}
                    canEdit={canEdit}
                  />
                </div>
                {canEdit && (
                  <div className="mt-2 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const overlayButton =
                          document.querySelector<HTMLButtonElement>(
                            "button[aria-label='Change profile photo']"
                          );
                        overlayButton?.click();
                      }}
                    >
                      Edit photo
                    </Button>
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="min-w-0 flex-1 pt-3 sm:pt-16">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                      {values.first_name} {values.last_name}
                    </h2>
                    {values.title && (
                      <p className="mt-1 flex items-center gap-1.5 text-base text-slate-600 dark:text-slate-300">
                        <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
                        {values.title}
                      </p>
                    )}
                    {values.institution && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                        <Building2 className="h-4 w-4 shrink-0" />
                        {values.institution}
                        {values.department && (
                          <span className="text-slate-400 dark:text-slate-500">
                            · {values.department}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {canMessage && (
                    <div className="flex shrink-0 items-center gap-2 pt-2">
                      <Button
                        intent={
                          followStats?.is_following ? "default" : "primary"
                        }
                        variant={
                          followStats?.is_following ? "outline" : "solid"
                        }
                        size="sm"
                        startIcon={<UserPlus className="h-4 w-4" />}
                        disabled={followLoading}
                        onClick={handleFollow}
                      >
                        {followStats?.is_following ? "Following" : "Follow"}
                      </Button>
                      <Button
                        intent="default"
                        variant="outline"
                        size="sm"
                        startIcon={<Mail className="h-4 w-4" />}
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("open-chat-dock", {
                              detail: {
                                otherUserId: values.id,
                                name: `${values.first_name} ${values.last_name}`.trim(),
                              },
                            })
                          );
                        }}
                      >
                        Message
                      </Button>
                    </div>
                  )}
                </div>

                {/* Followers / Following — clickable */}
                {followStats !== null && (
                  <div className="mt-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openFollowDialog("followers")}
                      className="group rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <strong className="group-hover:text-primary-600 dark:group-hover:text-primary-400 font-bold text-slate-900 dark:text-white">
                        {followStats.followers.toLocaleString()}
                      </strong>
                      <span className="ml-1 text-slate-500 dark:text-slate-400">
                        followers
                      </span>
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                    <button
                      type="button"
                      onClick={() => openFollowDialog("following")}
                      className="group rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <strong className="group-hover:text-primary-600 dark:group-hover:text-primary-400 font-bold text-slate-900 dark:text-white">
                        {followStats.following.toLocaleString()}
                      </strong>
                      <span className="ml-1 text-slate-500 dark:text-slate-400">
                        following
                      </span>
                    </button>
                  </div>
                )}
                {/* CV / Resume — hero section */}
                {(cvPresignedUrl || canEdit) && (
                  <div className="mt-3 flex items-center gap-2">
                    {cvPresignedUrl ? (
                      <>
                        <a
                          href={cvPresignedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <FileText className="h-4 w-4 text-slate-400" />
                          View CV
                        </a>
                        {canEdit && (
                          <>
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                              <Pencil className="h-3.5 w-3.5" />
                              Replace
                              <input
                                type="file"
                                accept="application/pdf"
                                className="sr-only"
                                disabled={cvUploading}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (f) handleCvUpload(f);
                                }}
                              />
                            </label>
                            <Button
                              variant="outline"
                              intent="danger"
                              size="sm"
                              onClick={handleCvDelete}
                              startIcon={<Trash2 className="h-4 w-4" />}
                            >
                              Remove
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                        <FileText className="h-4 w-4" />
                        {cvUploading ? "Uploading…" : "Upload CV / Resume"}
                        <input
                          type="file"
                          accept="application/pdf"
                          className="sr-only"
                          disabled={cvUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) handleCvUpload(f);
                          }}
                        />
                      </label>
                    )}
                    {cvUploadError && (
                      <span className="text-xs text-red-500">
                        {cvUploadError}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Sticky save bar */}
            <div className="sticky top-0 z-20 -mx-1 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/90">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Editing Profile
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (profile) reset(profile);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  intent="primary"
                  size="sm"
                  disabled={profileMutation.isPending}
                  startIcon={<CircleCheck className="size-4" />}
                >
                  {profileMutation.isPending ? "Saving…" : "Save Profile"}
                </Button>
              </div>
            </div>
            <Card className="p-6 sm:p-8">
              {/* Personal Information */}
              <section>
                <SectionHeader
                  icon={<IdCard className="size-5" />}
                  title="Personal Information"
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <InputField
                    label="First Name"
                    required
                    {...register("first_name", {
                      required: "First name is required",
                    })}
                    error={errors.first_name?.message}
                  />

                  <InputField
                    label="Last Name"
                    required
                    {...register("last_name", {
                      required: "Last name is required",
                    })}
                    error={errors.last_name?.message}
                  />
                  <div className="space-y-2 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Email
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{values.email}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Email addresses cannot be changed. Please register with a
                      new email.
                    </p>
                  </div>
                  <InputField
                    label="Title / Position"
                    startIcon={<Briefcase className="size-4" />}
                    {...register("title")}
                    placeholder="e.g., Professor, Research Scientist"
                  />

                  <InputField
                    label="Phone"
                    startIcon={<Phone className="size-4" />}
                    {...register("phone")}
                    placeholder="+1 (123) 456-7890"
                  />

                  <InputField
                    label="Institution"
                    startIcon={<Building2 className="size-4" />}
                    {...register("institution")}
                    placeholder="University or Organization"
                  />

                  <InputField
                    label="Department"
                    {...register("department")}
                    placeholder="e.g., Computer Science"
                  />

                  <div className="space-y-2 sm:col-span-2">
                    <TextArea
                      label="Bio"
                      {...register("bio")}
                      rows={4}
                      placeholder="Tell us about your research background and interests..."
                    />
                  </div>
                </div>
              </section>
            </Card>

            <Card className="p-6 sm:p-8">
              {/* Professional Links */}
              <section>
                <SectionHeader
                  icon={<Link2 className="size-4" />}
                  title="Professional Links"
                />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <InputField
                    label="LinkedIn"
                    startIcon={<FaLinkedin className="size-4 text-blue-600" />}
                    {...register("linkedin_url")}
                    placeholder="https://linkedin.com/in/username"
                  />

                  <InputField
                    label="Google Scholar"
                    startIcon={
                      <SiGooglescholar className="size-4 text-blue-700" />
                    }
                    {...register("google_scholar_url")}
                    placeholder="https://scholar.google.com/..."
                  />

                  <InputField
                    label="ORCID"
                    startIcon={<FaOrcid className="size-4 text-green-600" />}
                    {...register("orcid_id")}
                    placeholder="0000-0000-0000-0000"
                  />

                  <InputField
                    label="ResearchGate"
                    startIcon={
                      <FaResearchgate className="size-4 text-teal-600" />
                    }
                    {...register("research_gate_url")}
                    placeholder="https://researchgate.net/..."
                  />

                  <InputField
                    label="Personal Website"
                    startIcon={<Globe className="size-4 text-slate-400" />}
                    {...register("personal_website")}
                    placeholder="https://yourwebsite.com"
                  />

                  <InputField
                    label="Twitter / X"
                    startIcon={<FaTwitter className="size-4 text-sky-500" />}
                    {...register("twitter_handle")}
                    placeholder="@username"
                  />
                </div>
              </section>
            </Card>

            <Card className="p-6 sm:p-8">
              {/* Academic Availability */}
              <section>
                <SectionHeader
                  icon={<UserPlus className="size-4" />}
                  title="Academic Availability"
                />
                <AcademicStatusPicker
                  options={ACADEMIC_STATUS_CONFIG}
                  isChecked={(key) => !!watch(`academic_status.${key}`)}
                  onToggle={(key, val) =>
                    setValue(`academic_status.${key}`, val)
                  }
                />
              </section>
            </Card>

            <Card className="p-6 sm:p-8">
              {/* Research Interests */}
              <section>
                <SectionHeader
                  icon={<BookOpen className="h-5 w-5" />}
                  title="Research Interests"
                />
                <div className="space-y-3">
                  {interestFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <InputField
                        {...register(`research_interests.${index}`)}
                        placeholder="e.g., Machine Learning, Neuroscience"
                      />
                      <button
                        type="button"
                        onClick={() => removeInterest(index)}
                        aria-label="Remove interest"
                        className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    startIcon={<Plus className="size-4" />}
                    onClick={() => appendInterest("" as never)}
                    intent="primary"
                    variant="outline"
                  >
                    Add Interest
                  </Button>
                </div>
              </section>
            </Card>

            <Card className="p-6 sm:p-8">
              {/* Education */}
              <section>
                <SectionHeader
                  icon={<GraduationCap className="h-6 w-6" />}
                  title="Education"
                />
                <div className="space-y-4">
                  {educationFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/30"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <GraduationCap className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                          Education #{index + 1}
                        </h3>

                        <Button
                          onClick={() => removeEducation(index)}
                          intent="danger"
                          variant="outline"
                          size="sm"
                          startIcon={<Trash2 className="h-4 w-4" />}
                          aria-label="Remove education entry"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                          label="Degree"
                          required
                          {...register(`education.${index}.degree`, {
                            required: "Degree is required",
                          })}
                          placeholder="PhD, MSc, BSc"
                          error={errors.education?.[index]?.degree?.message}
                        />

                        <InputField
                          label="Institution"
                          required
                          {...register(`education.${index}.institution`, {
                            required: "Institution is required",
                          })}
                          placeholder="University name"
                          error={
                            errors.education?.[index]?.institution?.message
                          }
                        />

                        <InputField
                          label="Field of Study"
                          {...register(`education.${index}.field_of_study`)}
                          placeholder="Computer Science"
                        />

                        <InputField
                          label="Start Year"
                          type="number"
                          required
                          {...register(`education.${index}.start_year`, {
                            required: "Start year is required",
                            valueAsNumber: true,
                            min: {
                              value: 1900,
                              message: "Must be 1900 or later",
                            },
                          })}
                          placeholder="2020"
                          error={errors.education?.[index]?.start_year?.message}
                        />

                        <div className="space-y-2">
                          <InputField
                            label="End Year"
                            type="number"
                            {...register(`education.${index}.end_year`, {
                              valueAsNumber: true,
                              min: {
                                value: 1900,
                                message: "Must be 1900 or later",
                              },
                            })}
                            placeholder="Leave blank if ongoing"
                          />
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <input
                              type="checkbox"
                              {...register(`education.${index}.expected`)}
                              className="accent-primary-600 h-4 w-4 rounded border-slate-300"
                            />
                            <span>Expected graduation</span>
                          </label>
                        </div>

                        <div className="sm:col-span-2">
                          <TextArea
                            label="Notes (optional)"
                            {...register(`education.${index}.description`)}
                            rows={2}
                            placeholder="Thesis title, awards, GPA, etc."
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    startIcon={<Plus className="h-4 w-4" />}
                    onClick={() =>
                      appendEducation({
                        degree: "",
                        institution: "",
                        start_year: new Date().getFullYear(),
                      })
                    }
                    intent="primary"
                    variant="outline"
                  >
                    Add Education
                  </Button>
                </div>
              </section>
            </Card>

            <Card className="p-6 sm:p-8">
              {/* Professional Experience */}
              <section>
                <SectionHeader
                  icon={<Briefcase className="h-5 w-5" />}
                  title="Professional Experience"
                />
                <div className="space-y-4">
                  {experienceFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/30"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <Briefcase className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                          Experience #{index + 1}
                        </h3>
                        <Button
                          onClick={() => removeExperience(index)}
                          intent="danger"
                          variant="outline"
                          size="sm"
                          startIcon={<Trash2 className="h-4 w-4" />}
                          aria-label="Remove experience entry"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                          label="Job Title"
                          required
                          {...register(`experience.${index}.title`)}
                          placeholder="e.g., Research Scientist, Software Engineer"
                        />
                        <InputField
                          label="Company / Organization"
                          required
                          {...register(`experience.${index}.company`)}
                          placeholder="Google, NIH, MIT"
                        />
                        <InputField
                          label="Location"
                          {...register(`experience.${index}.location`)}
                          placeholder="City, Country or Remote"
                        />
                        <Controller
                          control={control}
                          name={`experience.${index}.employment_type`}
                          render={({ field }) => (
                            <Listbox
                              label="Employment Type"
                              fullWidth
                              value={field.value ?? ""}
                              onChange={(v) => field.onChange(v)}
                              options={[
                                { value: "Full-time", label: "Full-time" },
                                { value: "Part-time", label: "Part-time" },
                                { value: "Contract", label: "Contract" },
                                { value: "Internship", label: "Internship" },
                                {
                                  value: "Research",
                                  label: "Research Position",
                                },
                                { value: "Fellowship", label: "Fellowship" },
                                { value: "Postdoc", label: "Postdoc" },
                                {
                                  value: "Visiting",
                                  label: "Visiting Researcher",
                                },
                              ]}
                              placeholder="Select type"
                            />
                          )}
                        />
                        <InputField
                          label="Start Year"
                          type="number"
                          {...register(`experience.${index}.start_year`, {
                            valueAsNumber: true,
                          })}
                          placeholder="2020"
                        />
                        <div className="space-y-2">
                          <InputField
                            label="End Year"
                            type="number"
                            {...register(`experience.${index}.end_year`, {
                              valueAsNumber: true,
                            })}
                            placeholder="Leave blank if current"
                          />
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <input
                              type="checkbox"
                              {...register(`experience.${index}.current`)}
                              className="accent-primary-600 h-4 w-4 rounded border-slate-300"
                            />
                            <span>I currently work here</span>
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <TextArea
                            label="Description (optional)"
                            {...register(`experience.${index}.description`)}
                            rows={3}
                            placeholder="Key responsibilities, achievements, technologies used..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    startIcon={<Plus className="h-4 w-4" />}
                    onClick={() =>
                      appendExperience({
                        title: "",
                        company: "",
                        start_year: new Date().getFullYear(),
                        current: false,
                      })
                    }
                    intent="primary"
                    variant="outline"
                  >
                    Add Experience
                  </Button>
                </div>
              </section>
            </Card>

            <Card className="p-6 sm:p-8">
              {/* Grants */}
              <section>
                <SectionHeader
                  icon={<Banknote className="h-6 w-6" />}
                  title="Grants & Funding"
                />
                <div className="space-y-4">
                  {grantFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/30"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <Banknote className="size-4 text-slate-400" />
                          Grant #{index + 1}
                        </h3>
                        <Button
                          onClick={() => removeGrant(index)}
                          intent="danger"
                          variant="outline"
                          size="sm"
                          startIcon={<Trash2 className="h-4 w-4" />}
                          aria-label="Remove grant"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                          label="Title"
                          required
                          {...register(`grants.${index}.title`, {
                            required: "Title is required",
                          })}
                          error={errors.grants?.[index]?.title?.message}
                          placeholder="Title of the project"
                        />

                        <InputField
                          label="Funding Agency"
                          required
                          {...register(`grants.${index}.funding_agency`, {
                            required: "Funding agency is required",
                          })}
                          placeholder="NSF, NIH, ERC"
                          error={
                            errors.grants?.[index]?.funding_agency?.message
                          }
                        />

                        <InputField
                          label="Link"
                          {...register(`grants.${index}.link`)}
                          placeholder="Grant URL"
                        />

                        <InputField
                          label="Amount (USD)"
                          type="number"
                          {...register(`grants.${index}.amount`, {
                            valueAsNumber: true,
                          })}
                          placeholder="100000"
                        />

                        <InputField
                          label="Year"
                          type="number"
                          {...register(`grants.${index}.year`, {
                            valueAsNumber: true,
                          })}
                          placeholder="2024"
                        />

                        <Controller
                          control={control}
                          name={`grants.${index}.status`}
                          render={({ field }) => (
                            <Listbox
                              label="Status"
                              fullWidth
                              value={field.value ?? ""}
                              onChange={(v) => field.onChange(v)}
                              options={[
                                { value: "Active", label: "Active" },
                                { value: "Completed", label: "Completed" },
                                { value: "Pending", label: "Pending" },
                                { value: "Rejected", label: "Rejected" },
                              ]}
                              placeholder="Select status"
                            />
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    onClick={() =>
                      appendGrant({ title: "", funding_agency: "" })
                    }
                    startIcon={<Plus className="size-4" />}
                    intent="primary"
                    variant="outline"
                  >
                    Add Grant
                  </Button>
                </div>
              </section>
            </Card>

            <Card className="p-6 sm:p-8">
              {/* Current Projects */}
              <section>
                <SectionHeader
                  icon={<FileText className="h-6 w-6" />}
                  title="Current Projects"
                />
                <div className="space-y-4">
                  {projectFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/30"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                          <FileText className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                          Project #{index + 1}
                        </h3>
                        <Button
                          onClick={() => removeProject(index)}
                          intent="danger"
                          variant="outline"
                          size="sm"
                          startIcon={<Trash2 className="h-4 w-4" />}
                          aria-label="Remove project"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <InputField
                          label="Title"
                          {...register(`current_projects.${index}.title`)}
                          placeholder="Project title"
                        />

                        <div>
                          <TextArea
                            label="Description"
                            {...register(
                              `current_projects.${index}.description`
                            )}
                            rows={3}
                            placeholder="Describe the project objectives and your role..."
                          />
                        </div>
                        <InputField
                          label="Status"
                          {...register(`current_projects.${index}.status`)}
                          placeholder="Active, Completed, On Hold"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    startIcon={<Plus className="size-4" />}
                    onClick={() =>
                      appendProject({
                        title: "",
                        description: "",
                        status: "",
                      })
                    }
                    intent="primary"
                    variant="outline"
                  >
                    Add Project
                  </Button>
                </div>
              </section>
            </Card>

            <Card className="p-5 sm:p-6">
              {/* Actions */}
              <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (profile) reset(profile);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  intent="primary"
                  disabled={profileMutation.isPending}
                  startIcon={<CircleCheck className="size-5" />}
                >
                  {profileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </Card>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr] lg:items-start lg:gap-0">
            {/* ── Sidebar ── order-2 on mobile so main content comes first */}
            <div className="order-1 lg:sticky lg:top-6 lg:order-1 lg:border-r lg:border-slate-200 lg:pr-5 dark:lg:border-slate-700">
              <Card className="divide-y divide-slate-100 overflow-hidden p-0 dark:divide-slate-800">
                {/* Links */}
                {(values.linkedin_url ||
                  values.google_scholar_url ||
                  values.orcid_id ||
                  values.research_gate_url ||
                  values.personal_website ||
                  values.twitter_handle) && (
                  <div className="p-4">
                    <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                      Links
                    </p>
                    {/* Mobile: horizontal scroll row; Desktop: vertical list */}
                    <div className="flex flex-wrap gap-x-1 gap-y-0.5 lg:block lg:space-y-0.5">
                      {values.linkedin_url && (
                        <Link
                          href={values.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <FaLinkedin className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <span className="text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
                            LinkedIn
                          </span>
                        </Link>
                      )}
                      {values.google_scholar_url && (
                        <Link
                          href={values.google_scholar_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <SiGooglescholar className="h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-blue-400" />
                          <span className="text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
                            Google Scholar
                          </span>
                        </Link>
                      )}
                      {values.orcid_id && (
                        <Link
                          href={`https://orcid.org/${values.orcid_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <FaOrcid className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                          <span className="text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
                            ORCID
                          </span>
                        </Link>
                      )}
                      {values.research_gate_url && (
                        <Link
                          href={values.research_gate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <FaResearchgate className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                          <span className="text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
                            ResearchGate
                          </span>
                        </Link>
                      )}
                      {values.personal_website && (
                        <Link
                          href={values.personal_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                          <span className="text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
                            Website
                          </span>
                        </Link>
                      )}
                      {values.twitter_handle && (
                        <Link
                          href={`https://twitter.com/${values.twitter_handle.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <FaTwitter className="h-3.5 w-3.5 shrink-0 text-sky-500 dark:text-sky-400" />
                          <span className="text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white">
                            Twitter / X
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Research Interests */}
                {values.research_interests &&
                  values.research_interests.length > 0 && (
                    <div className="p-4">
                      <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                        Research Interests
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {values.research_interests.map((interest, i) => (
                          <Badge key={i}>{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Academic Status */}
                {(() => {
                  const activeStatuses = ACADEMIC_STATUS_CONFIG.filter(
                    (s) => values.academic_status?.[s.key]
                  );
                  if (activeStatuses.length === 0) return null;
                  return (
                    <div className="p-4">
                      <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                        Open To
                      </p>
                      <div className="flex flex-wrap gap-x-1 gap-y-0.5 lg:block lg:space-y-0.5">
                        {activeStatuses.map((s) => (
                          <div
                            key={s.key}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5"
                          >
                            <s.icon className="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </div>
            {/* end sidebar */}

            {/* ── Main Content ── */}
            <div className="order-2 min-w-0 space-y-4 lg:order-2 lg:pl-6">
              {/* ── About ── */}
              {(values.bio || canEdit) && (
                <Card className="p-5 sm:p-6">
                  <SectionHeader
                    icon={<IdCard className="h-5 w-5" />}
                    title="About"
                  />
                  {values.bio ? (
                    <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700 sm:text-base dark:text-slate-300">
                      {values.bio}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic dark:text-slate-500">
                      No bio added yet.
                      {canEdit && " Click Edit Profile to add one."}
                    </p>
                  )}
                </Card>
              )}

              {/* ── Education ── */}
              {values.education && values.education.length > 0 && (
                <Card className="p-5 sm:p-6">
                  <SectionHeader
                    icon={<GraduationCap className="h-5 w-5" />}
                    title="Education"
                  />
                  <div className="relative pl-6">
                    <div className="absolute top-1 bottom-1 left-2 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-6">
                      {values.education.map((edu, i) => {
                        const endLabel = edu.end_year
                          ? `${edu.expected ? "Expected " : ""}${edu.end_year}`
                          : edu.start_year
                            ? "Present"
                            : null;
                        return (
                          <div key={i} className="relative">
                            <div className="absolute top-1.5 -left-6 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-400 bg-white dark:border-slate-500 dark:bg-slate-900" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {edu.degree}
                                </h3>
                                {edu.field_of_study && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    in {edu.field_of_study}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                                {edu.institution}
                              </p>
                              {(edu.start_year || endLabel) && (
                                <p className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {edu.start_year}
                                  {endLabel ? ` – ${endLabel}` : ""}
                                </p>
                              )}
                              {edu.description && (
                                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                  {edu.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}

              {/* ── Professional Experience ── */}
              {values.experience && values.experience.length > 0 && (
                <Card className="p-5 sm:p-6">
                  <SectionHeader
                    icon={<Briefcase className="h-5 w-5" />}
                    title="Experience"
                  />
                  <div className="relative pl-6">
                    <div className="absolute top-1 bottom-1 left-2 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-6">
                      {values.experience.map((exp, i) => {
                        const endLabel = exp.current
                          ? "Present"
                          : exp.end_year
                            ? String(exp.end_year)
                            : null;
                        return (
                          <div key={i} className="relative">
                            <div
                              className={`absolute top-1.5 -left-6 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900 ${exp.current ? "border-slate-500 dark:border-slate-400" : "border-slate-400 dark:border-slate-500"}`}
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {exp.title}
                                </h3>
                                {exp.current && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    Current
                                  </span>
                                )}
                                {exp.employment_type && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    {exp.employment_type}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                                {exp.company}
                                {exp.location && (
                                  <span className="font-normal text-slate-400 dark:text-slate-500">
                                    {" "}
                                    · {exp.location}
                                  </span>
                                )}
                              </p>
                              {(exp.start_year || endLabel) && (
                                <p className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  {exp.start_year}
                                  {endLabel ? ` – ${endLabel}` : ""}
                                </p>
                              )}
                              {exp.description && (
                                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                  {exp.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              )}

              {/* ── Grants & Funding ── */}
              {values.grants && values.grants.length > 0 && (
                <Card className="p-5 sm:p-6">
                  <SectionHeader
                    icon={<Banknote className="h-5 w-5" />}
                    title="Grants & Funding"
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {values.grants.map((grant, i) => (
                      <div
                        key={i}
                        className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-800/30"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <h3 className="text-sm leading-snug font-semibold text-slate-900 dark:text-white">
                            {grant.title}
                          </h3>
                          {grant.status && (
                            <Badge
                              color={
                                grant.status === "Active"
                                  ? "success"
                                  : grant.status === "Completed"
                                    ? "primary"
                                    : grant.status === "Pending"
                                      ? "warning"
                                      : "gray"
                              }
                            >
                              {grant.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-400" />
                          <span className="truncate font-medium">
                            {grant.funding_agency}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {grant.year && (
                            <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-400">
                              {grant.year}
                            </span>
                          )}
                          {typeof grant.amount === "number" && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              ${grant.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {grant.link && (
                          <Link
                            href={grant.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:hover:border-primary-700 dark:hover:text-primary-400 mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            View Details
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ── Current Projects ── */}
              {values.current_projects &&
                values.current_projects.filter((p) => p.title?.trim()).length >
                  0 && (
                  <Card className="p-5 sm:p-6">
                    <SectionHeader
                      icon={<FileText className="h-5 w-5" />}
                      title="Current Projects"
                    />
                    <div className="space-y-3">
                      {values.current_projects
                        .filter((p) => p.title?.trim())
                        .map((project, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-slate-300 dark:border-slate-700/60 dark:bg-slate-800/30 dark:hover:border-slate-600"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                {project.title}
                              </h3>
                              {project.status && (
                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    project.status.toLowerCase() === "active"
                                      ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                      : project.status.toLowerCase() ===
                                          "completed"
                                        ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {project.status}
                                </span>
                              )}
                            </div>
                            {project.description && (
                              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {project.description}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </Card>
                )}
            </div>
            {/* end main content */}
          </div>
        )}

        {/* Followers / Following Dialog */}
        <Dialog
          open={followDialogType !== null}
          onOpenChange={(open) => {
            if (!open) setFollowDialogType(null);
          }}
        >
          <DialogContent className="border-slate-200 bg-white sm:max-w-md dark:border-slate-700 dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-900 capitalize dark:text-white">
                {followDialogType}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                {followDialogType === "followers"
                  ? `People following ${values.first_name || "this researcher"}`
                  : `People ${values.first_name || "this researcher"} follows`}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {followListLoading ? (
                <div className="space-y-3 py-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="flex animate-pulse items-center gap-3 px-1 py-2"
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : followList.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <UserPlus className="h-5 w-5 text-slate-400 dark:text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No {followDialogType} yet
                  </p>
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  {followList.map((person) => (
                    <Link
                      key={person.id}
                      href={`/profile?id=${person.id}`}
                      onClick={() => setFollowDialogType(null)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <Avatar
                        userId={person.id}
                        firstName={person.first_name}
                        lastName={person.last_name}
                        size={40}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {person.first_name} {person.last_name}
                        </p>
                        {(person.title || person.institution) && (
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {person.title}
                            {person.title && person.institution ? " · " : ""}
                            {person.institution}
                          </p>
                        )}
                      </div>
                      <ArrowLeft className="h-4 w-4 shrink-0 rotate-180 text-slate-300 dark:text-slate-500" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ORCID Import Dialog */}
        <Dialog
          open={orcidImportOpen}
          onOpenChange={(next) => {
            if (!next) closeOrcidImport();
          }}
        >
          <DialogContent className="border-slate-200 bg-white sm:max-w-lg dark:border-slate-700 dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <FaOrcid className="h-4 w-4 text-green-600" /> Import from ORCID
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                {orcidData
                  ? "Select the fields you want to apply. Existing data will be replaced."
                  : "Enter your ORCID iD to fetch your profile data."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {!orcidData && (
                <>
                  <InputField
                    label="ORCID iD"
                    placeholder="0000-0000-0000-0000"
                    value={orcidId}
                    onChange={(e) => setOrcidId(e.target.value)}
                    disabled={orcidLoading}
                    startIcon={<FaOrcid className="size-4 text-green-600" />}
                  />
                  {orcidError && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {orcidError}
                    </p>
                  )}
                </>
              )}

              {orcidData &&
                (() => {
                  const availableFields = ORCID_IMPORTABLE_FIELDS.filter(
                    (f) =>
                      (orcidData as Record<string, unknown>)[f.key] !==
                      undefined
                  );
                  return availableFields.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No importable fields found.
                    </p>
                  ) : (
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                      {availableFields.map((field) => {
                        const currentVal = (values as Record<string, unknown>)[
                          field.key
                        ];
                        const newVal = (orcidData as Record<string, unknown>)[
                          field.key
                        ];
                        const isSelected = selectedOrcidFields.has(field.key);
                        const isSame =
                          JSON.stringify(currentVal) === JSON.stringify(newVal);
                        const currentStr = formatImportValue(
                          field.key,
                          currentVal
                        );
                        const newStr = formatImportValue(field.key, newVal);
                        return (
                          <label
                            key={field.key}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                              isSelected
                                ? "border-slate-300 bg-slate-50 dark:border-slate-500 dark:bg-slate-800/60"
                                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/30"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const next = new Set(selectedOrcidFields);
                                if (e.target.checked) next.add(field.key);
                                else next.delete(field.key);
                                setSelectedOrcidFields(next);
                              }}
                              className="accent-primary-600 mt-0.5 h-4 w-4 rounded border-slate-300"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                {field.label}
                              </p>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="mb-0.5 text-slate-400 dark:text-slate-500">
                                    Current
                                  </p>
                                  <p className="truncate text-slate-500 dark:text-slate-400">
                                    {currentStr || (
                                      <span className="text-slate-300 italic dark:text-slate-600">
                                        empty
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-0.5 text-slate-400 dark:text-slate-500">
                                    From ORCID
                                  </p>
                                  <p
                                    className={`truncate ${isSame ? "text-slate-400" : "font-semibold text-slate-900 dark:text-white"}`}
                                  >
                                    {newStr}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeOrcidImport}
                disabled={orcidLoading}
              >
                Cancel
              </Button>
              {!orcidData ? (
                <Button
                  intent="primary"
                  onClick={handleOrcidFetch}
                  disabled={orcidLoading || !orcidId.trim()}
                >
                  {orcidLoading ? "Fetching…" : "Fetch Profile"}
                </Button>
              ) : (
                <Button
                  intent="primary"
                  disabled={selectedOrcidFields.size === 0}
                  onClick={() => applyOrcidImport(selectedOrcidFields)}
                >
                  Apply {selectedOrcidFields.size} field
                  {selectedOrcidFields.size !== 1 ? "s" : ""}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={messageOpen}
          onOpenChange={(next) => {
            setMessageOpen(next);
            if (!next) {
              setMessageError(null);
              setMessageSuccess(null);
              setMessageDraft("");
              setMessageFile(null);
            }
          }}
        >
          <DialogContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                Message{" "}
                {values.first_name || values.last_name
                  ? `${values.first_name} ${values.last_name}`.trim()
                  : "researcher"}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                Send a direct message.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <TextArea
                placeholder="Write your message..."
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                rows={4}
              />
              <div className="flex items-center gap-2">
                <AttachmentPickerButton
                  onSelect={(file) => {
                    setMessageError(null);
                    setMessageFile(file);
                  }}
                  onError={(msg) => setMessageError(msg)}
                  disabled={sendingMessage}
                  title="Attach to message"
                />
                {messageFile && (
                  <AttachmentChip
                    fileName={messageFile.name}
                    contentType={messageFile.type}
                    sizeBytes={messageFile.size}
                    onRemove={() => setMessageFile(null)}
                  />
                )}
              </div>
              {messageError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {messageError}
                </p>
              )}
              {messageSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {messageSuccess}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setMessageOpen(false)}
                disabled={sendingMessage}
              >
                Cancel
              </Button>
              <Button
                intent="primary"
                onClick={handleSendMessage}
                disabled={
                  sendingMessage || (!messageDraft.trim() && !messageFile)
                }
              >
                {sendingMessage ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Profile;
