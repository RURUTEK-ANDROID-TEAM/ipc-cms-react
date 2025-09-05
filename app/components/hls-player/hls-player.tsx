import Hls from "hls.js";
import { useEffect, useRef, type FC } from "react";

type Props = {
  url: string;
  muted?: boolean;
  autoPlay?: boolean;
};

export const HlsPlayer: FC<Props> = ({
  url,
  muted = false,
  autoPlay = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      if (autoPlay) video.play().catch(console.warn);
      return;
    }

    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (autoPlay) video.play().catch(console.warn);
    });

    return () => {
      hls.destroy();
    };
  }, [url, autoPlay]);

  return (
    <video ref={videoRef} muted={muted} controls style={{ width: "100%" }} />
  );
};
