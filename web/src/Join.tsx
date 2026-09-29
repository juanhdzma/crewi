import { Camera, RefreshCw, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { openCamera, snapshot } from "./camera";
import { type PartyInfo, whoIsInside } from "./party";
import { AvatarStack } from "./party-ui";
import { Button } from "./ui";

type Props = {
  info: PartyInfo;
  error: string | null;
  onJoin: (name: string, avatar: string, photo: Blob | null) => void;
};

export function Join({ info, error, onJoin }: Props) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(info.avatars[0]);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const photoUrl = usePreviewUrl(photo);

  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  async function startCamera() {
    setCameraError(null);
    try {
      setStream(await openCamera());
    } catch (e) {
      setCameraError((e as Error).message);
    }
  }

  async function capture() {
    if (!video.current) return;
    try {
      setPhoto(await snapshot(video.current));
    } catch (e) {
      setCameraError((e as Error).message);
    }
    setStream(null);
  }

  function pickEmoji(a: string) {
    setAvatar(a);
    setPhoto(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    onJoin(name, avatar, photo);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <form onSubmit={submit} className="flex flex-col gap-6 rounded-3xl bg-panel p-6 sm:p-8">
        <div className="flex items-center gap-3">
          {info.players.length > 0 && <AvatarStack players={info.players} />}
          <p className="text-sm text-mute">{whoIsInside(info.players.map((p) => p.name))}</p>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">Únete a la party</h1>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-mute">Tu nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            required
            autoFocus
            className="rounded-xl border-2 border-line bg-call px-4 py-3 font-medium outline-none focus:border-accent"
          />
        </label>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-semibold text-mute">Tu foto</legend>
          <div className="flex items-center gap-5">
            <span className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel-2 text-6xl ring-4 ring-accent ring-offset-4 ring-offset-panel">
              {stream ? (
                <video ref={video} autoPlay playsInline muted className="size-full scale-x-[-1] object-cover" />
              ) : photoUrl ? (
                <img src={photoUrl} alt="Tu foto" className="size-full object-cover" />
              ) : (
                <span aria-hidden>{avatar}</span>
              )}
            </span>
            <div className="flex flex-col items-start gap-2">
              {stream ? (
                <>
                  <Button type="button" onClick={capture}>
                    <Camera className="size-5" aria-hidden />
                    Tomar foto
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStream(null)}>
                    Cancelar
                  </Button>
                </>
              ) : photo ? (
                <>
                  <Button type="button" variant="secondary" onClick={startCamera}>
                    <RefreshCw className="size-5" aria-hidden />
                    Otra foto
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                    <X className="size-4" aria-hidden />
                    Quitar foto
                  </Button>
                </>
              ) : (
                <Button type="button" variant="secondary" onClick={startCamera}>
                  <Camera className="size-5" aria-hidden />
                  Usar mi cámara
                </Button>
              )}
            </div>
          </div>
          {cameraError && <p className="text-sm font-semibold text-danger">{cameraError}</p>}
          <p className="text-xs text-mute">La foto vive en memoria y se borra cuando sales de la party. Si prefieres, elige un emoji.</p>
          <div className="grid grid-cols-8 gap-1.5">
            {info.avatars.map((a) => (
              <button
                key={a}
                type="button"
                aria-label={`Avatar ${a}`}
                aria-pressed={!photo && a === avatar}
                onClick={() => pickEmoji(a)}
                className={`flex aspect-square items-center justify-center rounded-lg text-xl transition-colors ${!photo && a === avatar ? "bg-accent" : "bg-panel-2 hover:bg-call"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>

        <Button size="lg" className="w-full">
          Entrar
        </Button>
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      </form>
    </main>
  );
}

function usePreviewUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return setUrl(null);
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
