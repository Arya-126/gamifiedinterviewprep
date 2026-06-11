import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api';

// Client-side proctoring for PROCTORED attempts.
// - Activity signals: tab blur/focus, fullscreen exit, copy/paste → batched
//   to POST /assessments/attempts/:id/events every few seconds.
// - Camera presence: getUserMedia + MediaPipe FaceDetector (no identity
//   recognition — presence only). FACE_NOT_DETECTED after ~3 misses,
//   MULTIPLE_FACES, NO_CAMERA.
// - Low-res snapshots every SNAPSHOT_EVERY_MS, stored server-side for the
//   admin report only.
// Warnings shown to the student are informational, never punitive.

const FLUSH_EVERY_MS = 5_000;
const FACE_CHECK_EVERY_MS = 3_000;
const FACE_MISSES_BEFORE_EVENT = 3;
const SNAPSHOT_EVERY_MS = 60_000;

type EventType =
  | 'TAB_BLUR' | 'TAB_FOCUS' | 'FULLSCREEN_EXIT' | 'COPY' | 'PASTE'
  | 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES' | 'NO_CAMERA';

const WARNINGS: Partial<Record<EventType, string>> = {
  TAB_BLUR: 'Leaving the test tab was recorded.',
  FULLSCREEN_EXIT: 'Exiting fullscreen was recorded.',
  COPY: 'Copying was recorded.',
  PASTE: 'Pasting was recorded.',
  FACE_NOT_DETECTED: 'Your face is not visible to the camera.',
  MULTIPLE_FACES: 'More than one face is visible to the camera.',
  NO_CAMERA: 'Camera unavailable — this was recorded.',
};

export function useProctoring(attemptId: string | null, active: boolean) {
  const [warning, setWarning] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const queue = useRef<{ type: EventType; meta?: any; at: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMisses = useRef(0);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const record = useCallback((type: EventType, meta?: any) => {
    queue.current.push({ type, meta, at: new Date().toISOString() });
    const message = WARNINGS[type];
    if (message) {
      setWarning(message);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      warningTimer.current = setTimeout(() => setWarning(null), 6000);
    }
  }, []);

  // ---- batched flush ----
  useEffect(() => {
    if (!active || !attemptId) return;
    const flush = async () => {
      if (queue.current.length === 0) return;
      const events = queue.current.splice(0, 50);
      try {
        await apiClient.post(`/assessments/attempts/${attemptId}/events`, { events });
      } catch {
        queue.current.unshift(...events); // retry next tick
      }
    };
    const t = setInterval(flush, FLUSH_EVERY_MS);
    return () => {
      clearInterval(t);
      flush();
    };
  }, [active, attemptId]);

  // ---- activity signals ----
  useEffect(() => {
    if (!active) return;
    const onVisibility = () =>
      record(document.hidden ? 'TAB_BLUR' : 'TAB_FOCUS', { via: 'visibilitychange' });
    const onBlur = () => record('TAB_BLUR', { via: 'window.blur' });
    const onFocus = () => record('TAB_FOCUS', { via: 'window.focus' });
    const onFullscreen = () => {
      if (!document.fullscreenElement) record('FULLSCREEN_EXIT');
    };
    const onCopy = () => record('COPY');
    const onPaste = () => record('PASTE');
    const onContextMenu = () => record('COPY', { via: 'contextmenu' });

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [active, record]);

  // ---- camera presence + snapshots ----
  useEffect(() => {
    if (!active || !attemptId) return;
    let faceTimer: ReturnType<typeof setInterval> | null = null;
    let snapTimer: ReturnType<typeof setInterval> | null = null;
    let detector: any = null;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        videoRef.current = video;
        setCameraOn(true);

        stream.getVideoTracks()[0].addEventListener('ended', () => {
          setCameraOn(false);
          record('NO_CAMERA', { via: 'track-ended' });
        });

        // face presence — best effort; degrades to snapshots-only when the
        // model can't load (e.g. offline)
        try {
          const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
          const fileset = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          );
          detector = await FaceDetector.createFromOptions(fileset, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            },
            runningMode: 'VIDEO',
          });
          faceTimer = setInterval(() => {
            if (!videoRef.current || !detector) return;
            try {
              const result = detector.detectForVideo(videoRef.current, performance.now());
              const faces = result?.detections?.length ?? 0;
              if (faces === 0) {
                faceMisses.current++;
                if (faceMisses.current === FACE_MISSES_BEFORE_EVENT) {
                  record('FACE_NOT_DETECTED', { consecutiveChecks: FACE_MISSES_BEFORE_EVENT });
                  faceMisses.current = 0;
                }
              } else {
                faceMisses.current = 0;
                if (faces > 1) record('MULTIPLE_FACES', { faces });
              }
            } catch {
              /* skip frame */
            }
          }, FACE_CHECK_EVERY_MS);
        } catch (e) {
          console.warn('Face detection unavailable, snapshots only:', e);
        }

        // periodic low-res snapshot
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const sendSnapshot = async () => {
          const v = videoRef.current;
          if (!v) return;
          canvas.getContext('2d')?.drawImage(v, 0, 0, 320, 240);
          const image = canvas.toDataURL('image/jpeg', 0.5);
          try {
            await apiClient.post(`/assessments/attempts/${attemptId}/snapshot`, { image });
          } catch {
            /* non-fatal */
          }
        };
        sendSnapshot();
        snapTimer = setInterval(sendSnapshot, SNAPSHOT_EVERY_MS);
      } catch {
        setCameraOn(false);
        record('NO_CAMERA', { via: 'getUserMedia-denied' });
      }
    })();

    return () => {
      cancelled = true;
      if (faceTimer) clearInterval(faceTimer);
      if (snapTimer) clearInterval(snapTimer);
      detector?.close?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      videoRef.current = null;
      setCameraOn(false);
    };
  }, [active, attemptId, record]);

  return { warning, cameraOn };
}

export async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    /* user agent refused — the exit event listeners still apply */
  }
}
