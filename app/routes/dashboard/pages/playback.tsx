import { PlaybackTimeline } from "@/components/playback/timeline";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDownIcon,
  PlayIcon,
  PauseIcon,
  SkipBackIcon,
  SkipForwardIcon,
  FastForwardIcon,
  RewindIcon,
  Loader2,
  Play,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useOutletContext, useParams, useNavigate } from "react-router";
import Hls from "hls.js";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

type OutletHeaderSetter = {
  setHeader?: (ctx: {
    title?: string;
    actions?: ReactNode | null;
    breadcrumb?: { title: string; path: string }[];
  }) => void;
};
type Recording = {
  id: number;
  start: string;
  end: string;
  url: string;
  title?: string;
};

const API_URL = "http://172.16.0.157:5000/api";
const RECORD_API_URL = `${API_URL}/recording/record`;

const Playback = () => {
  const outlet = useOutletContext<OutletHeaderSetter>();
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [devices, setDevices] = useState<{ uid: string; name: string }[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRecording, setActiveRecording] = useState<Recording | null>(
    null
  );
  const [retryCount, setRetryCount] = useState(0);

  // --- HEADER ---
  useEffect(() => {
    outlet?.setHeader?.({
      title: "Playback",
      actions: null,
      breadcrumb: [
        { title: "Dashboard", path: "/dashboard" },
        { title: "Playback", path: "dashboard/playback" },
      ],
    });
  }, []);

  // --- HLS CLEANUP ---
  const cleanupHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // --- INIT HLS ---
  const initHls = useCallback(
    (url: string) => {
      const video = videoRef.current;
      if (!video) return;

      cleanupHls();
      setVideoLoading(true);
      setError(null);

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () =>
          console.log("HLS manifest parsed")
        );

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
          // if (data.fatal) setError(`Video playback error: ${data.details}`);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error("Network error encountered");
                if (retryCount < 3) {
                  setTimeout(
                    () => {
                      console.log("Attempting to recover from network error");
                      hls.startLoad();
                      setRetryCount((prev) => prev + 1);
                    },
                    1000 * (retryCount + 1)
                  );
                } else {
                  setError(
                    "Network error: Unable to load video after multiple attempts"
                  );
                  setVideoLoading(false);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("Media error encountered, trying to recover");
                hls.recoverMediaError();
                break;
              default:
                setError(`Video playback error: ${data.details}`);
                setVideoLoading(false);
                cleanupHls();
                break;
            }
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
            video.addEventListener(
              "loadeddata",
              () => {
                setVideoLoading(false);
              },
              { once: true }
            );
          } else {
            setError("HLS video playback is not supported in this browser");
            setVideoLoading(false);
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else {
        setError("HLS not supported");
      }
    },
    [cleanupHls, retryCount]
  );

  // --- FETCH RECORDINGS ---
  useEffect(() => {
    if (!selectedUid || !date) return;
    const controller = new AbortController();

    const fetchRecordings = async () => {
      setLoading(true);
      setError(null);

      try {
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

        const response = await axios.get(RECORD_API_URL, {
          params: {
            uid: selectedUid,
            startdate: dateStr,
          },
          signal: controller.signal,
        });

        const data = response.data;
        const mapped: Recording[] = data
          .filter((r: any) => {
            if (!r.start || !r.end || !r.url) return false;
            const startDate = new Date(r.start);
            const endDate = new Date(r.end);
            return (
              !isNaN(startDate.getTime()) &&
              !isNaN(endDate.getTime()) &&
              startDate < endDate
            );
          })
          .map((r: any, i: number) => ({
            id: r.id || `recording-${i}`,
            start: r.start,
            end: r.end,
            url: r.url,
            title: r.title || `Recording ${i + 1}`,
          }));

        setRecordings(mapped);
        if (mapped.length === 0) setError(`No recordings for ${dateStr}`);
      } catch (err: any) {
        if (!axios.isCancel(err)) {
          setError(`Failed to fetch recordings: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
    return () => controller.abort();
  }, [selectedUid, date]);

  // --- SELECT RECORDING FROM TIMELINE ---
  const handleTimelineSelect = useCallback(
    (recording: Recording, seekSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      setActiveRecording(recording);

      if (selectedUrl !== recording.url) {
        setSelectedUrl(recording.url);
        initHls(recording.url);

        // Wait for video to load before seeking
        const handleLoadedData = () => {
          video.currentTime = seekSeconds;
          video.play().catch((err) => {
            console.error("Playback error:", err);
            setError("Failed to start video playback");
          });
          video.removeEventListener("loadeddata", handleLoadedData);
        };

        video.addEventListener("loadeddata", handleLoadedData);
      } else {
        video.currentTime = seekSeconds;
        video.play().catch((err) => {
          console.error("Playback error:", err);
          setError("Failed to start video playback");
        });
      }
    },
    [selectedUrl, initHls]
  );

  // --- PLAY/PAUSE ---
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch((err) => {
        console.error("Play error:", err);
        setError("Failed to play video");
      });
    } else {
      video.pause();
    }
  }, []);

  // --- SEEK ---
  const handleSeek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const newTime = Math.max(
      0,
      Math.min(video.currentTime + seconds, video.duration)
    );
    video.currentTime = newTime;
  }, []);

  // --- HANDLE VIDEO END - AUTO PLAY NEXT RECORDING ---
  const handleVideoEnded = useCallback(() => {
    if (!activeRecording || recordings.length === 0) return;

    const currentIndex = recordings.findIndex(
      (r) => r.id === activeRecording.id
    );
    if (currentIndex >= 0 && currentIndex < recordings.length - 1) {
      const nextRecording = recordings[currentIndex + 1];
      handleTimelineSelect(nextRecording, 0);
    }
  }, [activeRecording, recordings, handleTimelineSelect]);

  // --- VIDEO EVENTS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      handleVideoEnded();
    };
    const onError = (e: Event) => {
      console.error("Video element error:", e);
      setError("Video playback error occurred");
      setVideoLoading(false);
    };
    const onWaiting = () => setVideoLoading(true);
    const onCanPlay = () => setVideoLoading(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  // --- CLEANUP HLS ON UNMOUNT ---
  useEffect(() => cleanupHls(), [cleanupHls]);

  // --- DATE SELECT ---
  const handleDateSelect = useCallback(
    (d: Date | undefined) => {
      const newDate = d || new Date();
      setDate(newDate);
      setOpen(false);

      // Reset video state
      if (videoRef.current) {
        cleanupHls();
        videoRef.current.src = "";
        setSelectedUrl(null);
        setActiveRecording(null);
        setIsPlaying(false);
      }
    },
    [cleanupHls]
  );

  // --- DEVICE SELECT ---
  const handleDeviceSelect = useCallback(
    (uid: string) => {
      setSelectedUid(uid);
      setDeviceOpen(false);
      navigate(`/dashboard/playback/${uid}`);

      // Reset state for new device
      setRecordings([]);
      setSelectedUrl(null);
      setActiveRecording(null);
      setError(null);
      setIsPlaying(false);

      if (videoRef.current) {
        cleanupHls();
        videoRef.current.src = "";
      }
    },
    [cleanupHls, navigate]
  );

  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 7);
  const maxDate = new Date();

  return (
    <div className="ml-4 mr-4 space-y-4">
      <AspectRatio ratio={16 / 9} className="rounded-lg bg-black">
        <video
          ref={videoRef}
          className="w-full h-full rounded-lg"
          controls
          preload="metadata"
          playsInline
          muted
        />
        {videoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        {!selectedUrl && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            <div className="text-center">
              <Play className="h-16 w-16 mx-auto mb-2 opacity-50" />
              <p>Select a date and click on the timeline to start playback</p>
            </div>
          </div>
        )}
      </AspectRatio>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 p-2 bg-muted rounded-lg">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSeek(-30)}
          disabled={!selectedUrl}
        >
          <SkipBackIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSeek(-10)}
          disabled={!selectedUrl}
        >
          <RewindIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={togglePlayPause}
          disabled={!selectedUrl}
        >
          {isPlaying ? (
            <PauseIcon className="h-5 w-5" />
          ) : (
            <PlayIcon className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSeek(10)}
          disabled={!selectedUrl}
        >
          <FastForwardIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSeek(30)}
          disabled={!selectedUrl}
        >
          <SkipForwardIcon className="h-5 w-5" />
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Date + Device + Current Recording */}
      <div className="flex flex-wrap gap-4">
        {/* Device Picker */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="device-picker" className="px-1">
            Camera
          </Label>
          <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="device-picker"
                className="w-48 justify-between font-normal"
                disabled={loading || devices.length === 0}
              >
                {selectedUid
                  ? devices.find((d) => d.uid === selectedUid)?.name ||
                    `UID: ${selectedUid.substring(0, 8)}...`
                  : devices.length === 0
                    ? "No cameras available"
                    : "Select camera"}{" "}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex flex-col max-h-60 overflow-y-auto">
                {devices.map((d) => (
                  <Button
                    key={d.uid}
                    variant={selectedUid === d.uid ? "default" : "ghost"}
                    onClick={() => handleDeviceSelect(d.uid)}
                    className="justify-start"
                  >
                    {d.name}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Date Picker */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="date-picker" className="px-1">
            Date
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date-picker"
                className="w-48 justify-between font-normal"
                disabled={loading || !selectedUid}
              >
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                today={new Date()}
                onSelect={handleDateSelect}
                disabled={{ before: minDate, after: maxDate }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Current Recording Info */}
        {activeRecording && (
          <div className="flex flex-col gap-3 flex-1">
            <Label className="px-1">Current Recording</Label>
            <div className="text-sm py-2 px-3 bg-muted rounded-md">
              <div className="font-medium">{activeRecording.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(activeRecording.start).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {new Date(activeRecording.end).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading recordings...</span>
        </div>
      )}

      {/* Timeline */}
      {!loading && (
        <PlaybackTimeline
          videoRef={videoRef}
          recordings={recordings}
          selectedDate={date}
          onSelectRecording={handleTimelineSelect}
          activeRecording={activeRecording}
        />
      )}
    </div>
  );
};

export default Playback;
