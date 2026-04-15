import { useCallback, useState } from "react";

import { NoteImage } from "@/lib/storage";
import { uploadNoteImages, isFirebaseUrl } from "@/lib/storage-firebase";

export interface ImageUploadState {
  isUploading: boolean;
  /** Per-image upload progress 0–100 */
  progress: Record<string, number>;
  /** Overall average progress across all images being uploaded */
  overallProgress: number;
  error: string | null;
}

export interface UseImageUploadReturn extends ImageUploadState {
  /**
   * Uploads all local images to Firebase Storage and returns a new NoteImage[]
   * with the local URIs replaced by Firebase download URLs.
   *
   * Images that are already Firebase URLs are passed through unchanged —
   * safe to call on re-save without re-uploading.
   */
  uploadImages: (
    userId: string,
    noteId: string,
    images: NoteImage[]
  ) => Promise<NoteImage[]>;
  resetUpload: () => void;
}

export function useImageUpload(): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const overallProgress = (() => {
    const values = Object.values(progress);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  })();

  const uploadImages = useCallback(
    async (
      userId: string,
      noteId: string,
      images: NoteImage[]
    ): Promise<NoteImage[]> => {
      if (images.length === 0) return images;

      // Initialise progress for images that need uploading
      const toUpload = images.filter((img) => !isFirebaseUrl(img.uri));
      if (toUpload.length === 0) return images;

      setIsUploading(true);
      setError(null);
      setProgress(
        Object.fromEntries(toUpload.map((img) => [img.id, 0]))
      );

      try {
        const results = await uploadNoteImages(
          userId,
          noteId,
          images.map((img) => ({ id: img.id, uri: img.uri })),
          (imageId, pct) =>
            setProgress((prev) => ({ ...prev, [imageId]: pct }))
        );

        // Map download URLs back onto the original NoteImage objects
        const urlMap = new Map(
          results.map((r) => [r.imageId, r.downloadUrl])
        );
        return images.map((img) => {
          const url = urlMap.get(img.id);
          if (url && url !== img.uri) {
            return { ...img, uri: url, thumbnailUri: url };
          }
          return img;
        });
      } catch (err: any) {
        const msg = err?.message ?? "Image upload failed. Please try again.";
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const resetUpload = useCallback(() => {
    setProgress({});
    setError(null);
  }, []);

  return { isUploading, progress, overallProgress, error, uploadImages, resetUpload };
}
