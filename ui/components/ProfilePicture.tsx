"use client";

import React, { useEffect, useRef, useState } from "react";
import { HiArrowUpTray } from "react-icons/hi2";
import Cropper, { type Area } from "react-easy-crop";
import { API_URL } from "../data/global";
import { getAuthHeaders } from "@/lib/apiAuth";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import NextImageWrapper from "./NextImageWrapper";

type ProfilePictureProps = {
  userId: string;
  apiBase?: string;
  Initials?: string;
  canEdit?: boolean | undefined | "";
  sizePx?: number;
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const OUTPUT_SIZE_PX = 512;
const TARGET_MAX_OUTPUT_BYTES = 200 * 1024; // 200KB

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

async function buildCroppedCanvas(
  image: HTMLImageElement,
  cropPixels: Area,
  outSize: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image canvas");

  canvas.width = outSize;
  canvas.height = outSize;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outSize,
    outSize
  );

  return canvas;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to read selected image"));
    img.src = src;
  });
}

async function cropAndCompressToFile(
  imageSrc: string,
  cropPixels: Area,
  fileNameBase: string
): Promise<File> {
  const image = await loadImageElement(imageSrc);
  const safeBase = fileNameBase.replace(/\.[^/.]+$/, "") || "profile-picture";

  let smallestBlob: Blob | null = null;
  let smallestMime = "image/jpeg";

  const sizeCandidates = [OUTPUT_SIZE_PX, 448, 384];
  const qualityCandidates = [0.86, 0.76, 0.66, 0.56, 0.46];

  for (const size of sizeCandidates) {
    const canvas = await buildCroppedCanvas(image, cropPixels, size);

    // Try WebP first (smaller in most cases)
    for (const q of qualityCandidates) {
      const webpBlob = await encodeCanvas(canvas, "image/webp", q);
      if (!webpBlob) continue;

      if (!smallestBlob || webpBlob.size < smallestBlob.size) {
        smallestBlob = webpBlob;
        smallestMime = "image/webp";
      }

      if (webpBlob.size <= TARGET_MAX_OUTPUT_BYTES) {
        return new File([webpBlob], `${safeBase}.webp`, {
          type: "image/webp",
        });
      }
    }

    // JPEG fallback
    for (const q of qualityCandidates) {
      const jpegBlob = await encodeCanvas(canvas, "image/jpeg", q);
      if (!jpegBlob) continue;

      if (!smallestBlob || jpegBlob.size < smallestBlob.size) {
        smallestBlob = jpegBlob;
        smallestMime = "image/jpeg";
      }

      if (jpegBlob.size <= TARGET_MAX_OUTPUT_BYTES) {
        return new File([jpegBlob], `${safeBase}.jpg`, {
          type: "image/jpeg",
        });
      }
    }
  }

  if (!smallestBlob) throw new Error("Could not generate optimized image");

  const ext = smallestMime === "image/webp" ? "webp" : "jpg";
  return new File([smallestBlob], `${safeBase}.${ext}`, { type: smallestMime });
}

async function createPreviewDataUrl(
  imageSrc: string,
  cropPixels: Area,
  previewSize = 120
): Promise<string> {
  const image = await loadImageElement(imageSrc);
  const canvas = await buildCroppedCanvas(image, cropPixels, previewSize);
  return canvas.toDataURL("image/jpeg", 0.9);
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({
  userId,
  apiBase = API_URL,
  Initials,
  canEdit = false,
  sizePx,
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [sourceImageName, setSourceImageName] = useState("profile-picture");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadImage = async () => {
    setErr(null);
    setLoading(true);
    const uid = String(userId ?? "").trim();
    if (!uid) {
      setImgSrc(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${apiBase}/profile_picture/${encodeURIComponent(uid)}`
      );
      if (res.status === 404) {
        setImgSrc(null);
        return;
      }
      if (!res.ok) {
        setImgSrc(null);
        return;
      }
      const data = (await res.json()) as { presigned_url?: string | null };
      const remote = String(data?.presigned_url ?? "").trim();
      if (!remote) {
        setImgSrc(null);
        return;
      }
      const separator = remote.includes("?") ? "&" : "?";
      setImgSrc(`${remote}${separator}bust=${Date.now()}`);
    } catch {
      setImgSrc(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    return () => {
      if (sourceImageUrl) URL.revokeObjectURL(sourceImageUrl);
    };
  }, [sourceImageUrl]);

  const onPickFile = () => {
    if (busy || !canEdit) return;
    setErr(null);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErr(null);
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErr("Please choose an image file (e.g. JPG, PNG).");
      return;
    }
    if (f.size > MAX_SIZE) {
      setErr("Image must be under 5MB.");
      return;
    }
    if (sourceImageUrl) URL.revokeObjectURL(sourceImageUrl);
    const localUrl = URL.createObjectURL(f);
    setSourceImageUrl(localUrl);
    setSourceImageName(f.name || "profile-picture");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropPixels(null);
    setLivePreviewUrl(null);
    setCropModalOpen(true);
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropPixels(null);
    setLivePreviewUrl(null);
    if (sourceImageUrl) {
      URL.revokeObjectURL(sourceImageUrl);
      setSourceImageUrl(null);
    }
  };

  const confirmCropAndUpload = async () => {
    if (!sourceImageUrl || !cropPixels) {
      setErr("Please adjust the crop before uploading.");
      return;
    }

    try {
      const optimizedFile = await cropAndCompressToFile(
        sourceImageUrl,
        cropPixels,
        sourceImageName
      );

      const localPreview = URL.createObjectURL(optimizedFile);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(localPreview);
      setCropModalOpen(false);
      setLivePreviewUrl(null);
      if (sourceImageUrl) {
        URL.revokeObjectURL(sourceImageUrl);
        setSourceImageUrl(null);
      }
      await upload(optimizedFile);
    } catch (e: unknown) {
      setErr(
        e instanceof Error ? e.message : "Failed to process selected image"
      );
    }
  };

  useEffect(() => {
    let active = true;
    if (!sourceImageUrl || !cropPixels || !cropModalOpen) {
      setLivePreviewUrl(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void createPreviewDataUrl(sourceImageUrl, cropPixels, 120)
        .then((url) => {
          if (active) setLivePreviewUrl(url);
        })
        .catch(() => {
          if (active) setLivePreviewUrl(null);
        });
    }, 80);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [sourceImageUrl, cropPixels, cropModalOpen, zoom, crop.x, crop.y]);

  const upload = async (file: File) => {
    setBusy(true);
    setErr(null);
    try {
      const authHeaders = await getAuthHeaders();
      const presignRes = await fetch(
        `${apiBase}/profile_picture/${userId}/presigned_put`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            content_type: file.type,
            file_name: file.name,
          }),
        }
      );
      if (!presignRes.ok) throw new Error(await presignRes.text());
      const presign = await presignRes.json();

      const putRes = await fetch(presign.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed. Please try again.");

      setImgSrc(`${presign.preview_url}&bust=${Date.now()}`);
      setPreview(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const sizeClass = sizePx ? "" : "h-32 w-32 sm:h-40 sm:w-40";
  const avatarSizeStyle = sizePx
    ? { width: sizePx, height: sizePx }
    : undefined;

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
        disabled={busy}
      />

      {/* Fixed-size avatar to prevent layout shift */}
      <div
        style={avatarSizeStyle}
        className={[
          "relative flex shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700",
          "shadow-lg ring-2 ring-white dark:ring-slate-900",
          sizeClass,
        ].join(" ")}
      >
        {loading && !preview && !imgSrc && (
          <div className="absolute inset-0 animate-pulse bg-slate-300 dark:bg-slate-600" />
        )}

        {(preview || imgSrc) && (
          <NextImageWrapper
            src={preview || imgSrc || ""}
            alt={Initials ? `${Initials} profile` : "Profile"}
            fill
            sizes="128px"
            className="h-full w-full object-cover object-center transition-opacity duration-200"
            style={{ opacity: busy ? 0.7 : 1 }}
            onError={() => setImgSrc(null)}
          />
        )}
        {!preview && !imgSrc && (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl font-semibold text-slate-500 sm:text-3xl dark:text-slate-400">
              {Initials?.trim().slice(0, 2).toUpperCase() || "?"}
            </span>
          </div>
        )}

        {/* Upload overlay: show when canEdit, hover or busy */}
        {canEdit && (
          <button
            type="button"
            onClick={onPickFile}
            disabled={busy}
            className="focus:ring-primary-500 absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity duration-200 hover:opacity-100 focus:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-100"
            aria-label="Change profile photo"
          >
            {busy ? (
              <span className="text-sm font-medium text-white">Uploading…</span>
            ) : (
              <>
                <HiArrowUpTray className="h-8 w-8 text-white" />
                <span className="mt-1 text-xs font-medium text-white">
                  Change photo
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {err && (
        <p className="max-w-[16rem] text-center text-xs text-red-600 dark:text-red-400">
          {err}
        </p>
      )}

      <Modal
        isOpen={cropModalOpen}
        onClose={closeCropModal}
        title="Crop profile photo"
        maxWidth="md"
        closeOnOverlayClick={!busy}
        className="p-0"
        footer={
          <div className="flex w-full justify-end gap-2 p-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeCropModal}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              intent="primary"
              onClick={() => {
                void confirmCropAndUpload();
              }}
              disabled={busy || !cropPixels}
            >
              {busy ? "Uploading…" : "Save photo"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_132px]">
            <div className="relative h-72 overflow-hidden rounded-xl bg-black">
              {sourceImageUrl ? (
                <Cropper
                  image={sourceImageUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedAreaPixels) => {
                    setCropPixels(croppedAreaPixels);
                  }}
                />
              ) : null}
            </div>

            <div className="flex flex-col items-center justify-start">
              <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                Live preview
              </p>
              <div className="h-30 w-30 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                {livePreviewUrl ? (
                  <NextImageWrapper
                    src={livePreviewUrl || ""}
                    alt="Cropped preview"
                    fill
                    sizes="120px"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-500 dark:text-slate-400">
                    Move image
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                Drag image to center your face
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Zoom</span>
              <span>{zoom.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="accent-primary-600 w-full"
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Cropped image is optimized with WebP-first compression and JPEG
              fallback, targeting &lt; 200KB.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePicture;
