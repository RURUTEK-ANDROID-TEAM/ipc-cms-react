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
import { useOutletContext, useNavigate, useParams } from "react-router";
import Hls from "hls.js";
import axios from "axios";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { jwtDecode } from "jwt-decode";
import type { DecodedToken } from "@/lib/utils";
import { SessionTimeoutDialog } from "@/components/auth/dialogs/session-timout-dialog";

type OutletHeaderSetter = {
  setHeader?: (ctx: {
    title?: string;
    actions?: ReactNode | null;
    breadcrumb?: { title: string; path: string }[];
  }) => void;
};

export type Recording = {
  id: number;
  recording_id: string;
  camera_id: number;
  uid: string;
  start: string;
  end: string;
  url: string;
  title?: string;
};

interface Device {
  uid: string;
  name: string;
}

const API_URL = "http://172.16.0.157:5000/api";
const RECORD_API_URL = `${API_URL}/recording/record`;
const CAMERA_API_URL = `${API_URL}/cameras`;

const Playback = () => {
  const outlet = useOutletContext<OutletHeaderSetter>();
  const navigate = useNavigate();
  const { uid: urlUid } = useParams<{ uid?: string }>(); // Extract UID from URL
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(urlUid || null);
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
  const [showSessionTimeout, setShowSessionTimeout] = useState(false);

  // --- SYNC URL UID WITH STATE ---
  useEffect(() => {
    if (urlUid && urlUid !== selectedUid) {
      setSelectedUid(urlUid);
    }
  }, [urlUid]);

  // --- HEADER ---
  useEffect(() => {
    outlet?.setHeader?.({
      title: "Playback",
      breadcrumb: [
        { title: "Dashboard", path: "/dashboard" },
        { title: "Playback", path: "/dashboard/playback" },
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

        hls.on(Hls.Events.MANIFEST_PARSED, () => setVideoLoading(false));

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (retryCount < 3) {
                  setTimeout(
                    () => {
                      hls.startLoad();
                      setRetryCount((p) => p + 1);
                    },
                    1000 * (retryCount + 1)
                  );
                } else {
                  setError("Network error: unable to load video after retries");
                  setVideoLoading(false);
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError(`Playback error: ${data.details}`);
                setVideoLoading(false);
                cleanupHls();
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else {
        setError("HLS not supported in this browser");
      }
    },
    [cleanupHls, retryCount]
  );

  // --- FETCH CAMERAS ---
  const fetchCameras = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        setShowSessionTimeout(true);
        return;
      }

      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        localStorage.removeItem("accessToken");
        setShowSessionTimeout(true);
        return;
      }

      const res = await axios.get(CAMERA_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDevices(res.data);
    } catch (err) {
      console.error("Failed to fetch cameras:", err);
      setDevices([]);
    }
  }, [navigate]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

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
          params: { uid: selectedUid, startdate: dateStr },
          signal: controller.signal,
        });

        const rawData = response.data.data || response.data;

        const mapped: Recording[] = rawData
          .filter((r: any) => r.start && r.end && r.url)
          .map((r: any, i: number) => ({
            id: r.id || i + 1, // Use numeric ID from API
            recording_id: r.recording_id || `recording-${i}`,
            start: r.start,
            end: r.end,
            url: r.url.startsWith("http") ? r.url : `${API_URL}${r.url}`,
            title: r.title || `Recording ${i + 1}`,
          }));

        console.log(`Mapped: ${mapped}`);
        //
        setRecordings(mapped);
        if (mapped.length === 0) setError(`No recordings for ${dateStr}`);
      } catch (err: any) {
        if (!axios.isCancel(err))
          setError(`Failed to fetch recordings: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
    return () => controller.abort();
  }, [selectedUid, date]);

  // --- SELECT RECORDING ---
  const handleTimelineSelect = useCallback(
    (recording: Recording, seekSeconds: number) => {
      const video = videoRef.current;
      if (!video) return;

      setActiveRecording(recording);

      if (selectedUrl !== recording.url) {
        setSelectedUrl(recording.url);
        initHls(recording.url);

        const handleLoaded = () => {
          video.currentTime = seekSeconds;
          video.play().catch(() => setError("Failed to start playback"));
          video.removeEventListener("loadeddata", handleLoaded);
        };
        video.addEventListener("loadeddata", handleLoaded);
      } else {
        video.currentTime = seekSeconds;
        video.play().catch(() => setError("Failed to start playback"));
      }
    },
    [selectedUrl, initHls]
  );

  // --- PLAY/PAUSE ---
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => setError("Playback failed"));
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

  // --- AUTO PLAY NEXT ---
  const handleVideoEnded = useCallback(() => {
    if (!activeRecording || recordings.length === 0) return;

    const currentIndex = recordings.findIndex(
      (r) => r.id === activeRecording.id
    );
    if (currentIndex >= 0 && currentIndex < recordings.length - 1) {
      handleTimelineSelect(recordings[currentIndex + 1], 0);
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
    const onError = () => setError("Video playback error");
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
  }, [handleVideoEnded]);

  useEffect(() => cleanupHls(), [cleanupHls]);

  // --- DATE SELECT ---
  const handleDateSelect = useCallback(
    (d: Date | undefined) => {
      const newDate = d || new Date();
      setDate(newDate);
      setOpen(false);

      cleanupHls();
      if (videoRef.current) videoRef.current.src = "";
      setSelectedUrl(null);
      setActiveRecording(null);
      setIsPlaying(false);
    },
    [cleanupHls]
  );

  // --- DEVICE SELECT ---
  const handleDeviceSelect = useCallback(
    (uid: string) => {
      setSelectedUid(uid);
      setDeviceOpen(false);
      navigate(`/dashboard/playback?uid=${uid}`);

      cleanupHls();
      if (videoRef.current) videoRef.current.src = "";

      setRecordings([]);
      setSelectedUrl(null);
      setActiveRecording(null);
      setError(null);
      setIsPlaying(false);
    },
    [cleanupHls, navigate]
  );

  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 7);
  const maxDate = new Date();

  // Get selected device name for display
  const selectedDevice = devices.find((d) => d.uid === selectedUid);

  return (
    <div className="ml-4 mr-4 space-y-4">
      <AspectRatio ratio={16 / 9} className="rounded-lg bg-black relative">
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
              <p>Select a camera and date to view recordings</p>
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

      {/* Camera Picker & Date */}
      <div className="flex flex-wrap gap-4">
        {/* Device Picker */}
        <div className="flex flex-col gap-3">
          <Label>Camera</Label>
          <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-48 justify-between"
                disabled={loading || devices.length === 0}
              >
                {selectedDevice
                  ? selectedDevice.uid
                  : selectedUid
                    ? `UID: ${selectedUid.substring(0, 8)}...`
                    : devices.length === 0
                      ? "No cameras available"
                      : "Select camera"}
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
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-medium">{d.uid}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Date Picker */}
        <div className="flex flex-col gap-3">
          <Label>Date</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-48 justify-between font-normal"
                disabled={loading || !selectedUid}
              >
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={{ before: minDate, after: maxDate }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Current Recording */}
        {activeRecording && (
          <div className="flex flex-col gap-3 flex-1">
            <Label>Current Recording</Label>
            <div className="text-sm py-2 px-3 bg-muted rounded-md">
              <div className="font-medium">{activeRecording.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(activeRecording.start).toLocaleTimeString()} -{" "}
                {new Date(activeRecording.end).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>

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
      {loading && (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading recordings...</span>
        </div>
      )}
      {showSessionTimeout && (
        <SessionTimeoutDialog
          open={showSessionTimeout}
          onClose={() => setShowSessionTimeout(false)}
        />
      )}
    </div>
  );
};

export default Playback;
