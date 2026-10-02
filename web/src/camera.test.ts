import { expect, it, vi } from "vitest";
import { photoSize, snapshot, squareCrop } from "./camera";

it("crops the centered square of a frame", () => {
  expect(squareCrop(640, 480)).toEqual({ sx: 80, sy: 0, size: 480 });
  expect(squareCrop(480, 640)).toEqual({ sx: 0, sy: 80, size: 480 });
  expect(squareCrop(300, 300)).toEqual({ sx: 0, sy: 0, size: 300 });
});

it("mirrors the snapshot like the selfie preview", async () => {
  const calls: string[] = [];
  const ctx = {
    translate: (x: number, y: number) => calls.push(`translate ${x} ${y}`),
    scale: (x: number, y: number) => calls.push(`scale ${x} ${y}`),
    drawImage: () => calls.push("draw"),
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx, toBlob: (cb: (b: Blob) => void) => cb(new Blob()) };
  vi.stubGlobal("document", { createElement: () => canvas });
  await snapshot({ videoWidth: 640, videoHeight: 480 } as HTMLVideoElement);
  vi.unstubAllGlobals();
  expect(calls).toEqual([`translate ${photoSize} 0`, "scale -1 1", "draw"]);
});
