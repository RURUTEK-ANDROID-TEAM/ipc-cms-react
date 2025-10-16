import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import Hls from "hls.js";

// --- PROPS AND REF TYPES ---
export type PlayerActions = {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
};

type Props = {
  url: string;
  muted?: boolean;
  autoPlay?: boolean;
  isLive?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onWaiting?: () => void;
  onCanPlay?: () => void;
  onError?: (error: string) => void;
};

// --- COMPONENT ---
export const HlsPlayer = forwardRef<PlayerActions, Props>(
  (
    {
      url,
      muted = false,
      autoPlay = true,
      isLive = false,
      onPlay,
      onPause,
      onEnded,
      onWaiting,
      onCanPlay,
      onError,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);

    // Expose control methods to the parent component via the ref
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (time: number) => {
        if (!videoRef.current) return;
        const duration = videoRef.current.duration || 0;
        videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      getDuration: () => videoRef.current?.duration || 0,
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlers: { [key: string]: () => void } = {
        play: () => onPlay?.(),
        pause: () => onPause?.(),
        ended: () => onEnded?.(),
        waiting: () => onWaiting?.(),
        canplay: () => onCanPlay?.(),
      };

      // Attach event listeners that call the parent's callbacks
      for (const event in handlers) {
        video.addEventListener(event, handlers[event]);
      }

      // Note: HLS.js errors are handled separately below

      return () => {
        for (const event in handlers) {
          video.removeEventListener(event, handlers[event]);
        }
      };
    }, [onPlay, onPause, onEnded, onWaiting, onCanPlay]);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Cleanup previous instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const cleanUrl = isLive ? `${url}?_t=${Date.now()}` : url.split("?")[0];

      if (Hls.isSupported()) {
        const hls = new Hls({
          lowLatencyMode: isLive,
          liveSyncDurationCount: 3,
        });

        hls.loadSource(cleanUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => onError?.("Autoplay failed."));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error("HLS Error:", data);
          if (data.fatal) {
            onError?.("A fatal playback error occurred.");
            hls.destroy();
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = cleanUrl;
        if (autoPlay) video.play().catch(() => onError?.("Autoplay failed."));
      } else {
        onError?.("HLS is not supported in this browser.");
      }

      return () => {
        hlsRef.current?.destroy();
      };
    }, [url, autoPlay, isLive, onError]);

    return (
      <video
        ref={videoRef}
        muted={muted}
        controls
        playsInline
        style={{ width: "100%", height: "100%", backgroundColor: "#000" }}
      />
    );
  }
);

// import Hls from "hls.js";
// import { useEffect, useRef, type FC } from "react";

// type Props = {
//   url: string;
//   muted?: boolean;
//   autoPlay?: boolean;
//   isLive?: boolean;
// };

// export const HlsPlayer: FC<Props> = ({
//   url,
//   muted = false,
//   autoPlay = true,
//   isLive = false,
// }) => {
//   const videoRef = useRef<HTMLVideoElement | null>(null);

//   useEffect(() => {
//     const video = videoRef.current;

//     if (!video) return;
//     if (video.canPlayType("application/vnd.apple.mpegurl")) {
//       video.src = url;
//       if (autoPlay) video.play().catch(console.warn);
//       return;
//     }

//     // const hls = new Hls();
//     const hls = new Hls({
//       enableWorker: true,
//       lowLatencyMode: false,
//       backBufferLength: 90,
//       maxBufferLength: 30,
//       maxMaxBufferLength: 60,

//       // 👇 CRITICAL: Treat as live/event stream
//       liveDurationInfinity: true, // Don't assume fixed duration
//       liveSyncDurationCount: 3, // Keep 3 segments behind live edge
//       maxLiveSyncPlaybackRate: 1.2, // Allow slight speed-up to catch up

//       // 👇 Prevent caching of manifest
//       xhrSetup: (xhr, url) => {
//         // Add cache-busting param to .m3u8 requests
//         if (url.endsWith(".m3u8")) {
//           xhr.setRequestHeader("Cache-Control", "no-cache");
//           xhr.setRequestHeader("Pragma", "no-cache");
//         }
//       },
//     });

//     hls.loadSource(url);
//     hls.attachMedia(video);
//     hls.on(Hls.Events.MANIFEST_PARSED, () => {
//       if (autoPlay) video.play().catch(console.warn);
//     });

//     return () => {
//       hls.destroy();
//     };
//   }, [url, autoPlay]);

//   return (
//     <video ref={videoRef} muted={muted} controls style={{ width: "100%" }} />
//   );
// };
