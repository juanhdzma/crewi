export const photoSize = 160;

export function squareCrop(width: number, height: number) {
  const size = Math.min(width, height);
  return { sx: (width - size) / 2, sy: (height - size) / 2, size };
}

export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Tu navegador no deja usar la cámara aquí.");
  try {
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 }, audio: false });
  } catch {
    throw new Error("No pudimos abrir la cámara. Revisa el permiso o elige un emoji.");
  }
}

export function snapshot(video: HTMLVideoElement): Promise<Blob> {
  const { sx, sy, size } = squareCrop(video.videoWidth, video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = photoSize;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(photoSize, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, size, size, 0, 0, photoSize, photoSize);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo tomar la foto"))), "image/jpeg", 0.82));
}
