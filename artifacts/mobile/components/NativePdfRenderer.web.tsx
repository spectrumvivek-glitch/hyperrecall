import React from "react";

export interface NativePdfRendererProps {
  uri: string;
  onLoadProgress?: (percent: number) => void;
  onLoadComplete?: (numPages: number) => void;
  onPageChanged?: (page: number, total: number) => void;
  onError?: (err: unknown) => void;
}

/**
 * Web stub. The real react-native-pdf renderer is native-only; on web we
 * render PDFs via a plain <iframe> in pdf-viewer.tsx, so this component is
 * never actually used. Keeping a stub here lets Metro's web bundle resolve
 * the import without trying to pull react-native-pdf into the bundle.
 */
export function NativePdfRenderer(_props: NativePdfRendererProps) {
  return null;
}

export default NativePdfRenderer;
