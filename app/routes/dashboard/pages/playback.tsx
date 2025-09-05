// Playback.tsx (updated with proper URL handling)
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

const RECORD_API_URL = "http://<ip-address>/api/v1/onvif/getrecord";
const API_URL = "http://<ip-address>:5000/api";

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
  const [date, setDate] = useState<Date>(new Date("2025-09-02"));
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRecording, setActiveRecording] = useState<Recording | null>(
    null
  );

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

  // --- FETCH DEVICES ---
  useEffect(() => {
    const controller = new AbortController();
    const fetchDevices = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) throw new Error("No access token found");

        const response = await fetch(`${API_URL}/cameras`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to fetch devices");

        const data = await response.json();
        setDevices(data);

        // Set selected UID from URL param or first device
        if (uid && data.some((d: any) => d.uid === uid)) {
          setSelectedUid(uid);
        } else if (data.length > 0) {
          setSelectedUid(data[0].uid);
          navigate(`/playback/${data[0].uid}`, { replace: true });
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch devices");
      }
    };
    fetchDevices();
    return () => controller.abort();
  }, [uid, navigate]);

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

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () =>
          console.log("HLS manifest parsed")
        );
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
          if (data.fatal) setError(`Video playback error: ${data.details}`);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else {
        setError("HLS not supported");
      }
    },
    [cleanupHls]
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

        const response = await fetch(
          `${RECORD_API_URL}?uid=${encodeURIComponent(selectedUid)}&startdate=${dateStr}`,
          {
            signal: controller.signal,
          }
        );
        if (!response.ok) throw new Error(response.statusText);

        const data = await response.json();
        const mapped: Recording[] = data
          .filter(
            (r: any) =>
              r.start &&
              r.end &&
              r.url &&
              !isNaN(new Date(r.start).getTime()) &&
              !isNaN(new Date(r.end).getTime()) &&
              new Date(r.start) < new Date(r.end)
          )
          .map((r: any, i: number) => ({
            id: r.id || `recording-${i}`,
            start: r.start,
            end: r.end,
            url: r.url,
            title: r.title || `Recording ${i + 1}`,
          }));

        setRecordings(mapped);
        if (mapped.length === 0) setError(`No recordings for ${dateStr}`);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError")
          setError(`Failed to fetch recordings: ${err.message}`);
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
          video.play().catch(console.error);
          video.removeEventListener("loadeddata", handleLoadedData);
        };

        video.addEventListener("loadeddata", handleLoadedData);
      } else {
        video.currentTime = seekSeconds;
        video.play().catch(console.error);
      }
    },
    [selectedUrl, initHls]
  );

  // --- PLAY/PAUSE ---
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused
      ? video.play().catch((err) => setError("Failed to play video"))
      : video.pause();
  }, []);

  // --- SEEK ---
  const handleSeek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.currentTime + seconds, video.duration || 0)
    );
  }, []);

  // --- VIDEO EVENTS ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setError("Video playback error");

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, []);

  // --- CLEANUP HLS ON UNMOUNT ---
  useEffect(() => cleanupHls(), [cleanupHls]);

  // --- DATE SELECT ---
  const handleDateSelect = useCallback(
    (d: Date | undefined) => {
      setDate(d || new Date());
      setOpen(false);
      if (videoRef.current) {
        cleanupHls();
        videoRef.current.src = "";
        setSelectedUrl(null);
        setActiveRecording(null);
      }
    },
    [cleanupHls]
  );

  // --- DEVICE SELECT ---
  const handleDeviceSelect = useCallback(
    (uid: string) => {
      setSelectedUid(uid);
      setDeviceOpen(false);
      navigate(`/playback/${uid}`); // Update URL

      // Reset state for new device
      setRecordings([]);
      setSelectedUrl(null);
      setActiveRecording(null);
      setError(null);

      if (videoRef.current) {
        cleanupHls();
        videoRef.current.src = "";
      }
    },
    [cleanupHls, navigate]
  );

  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 2);
  const maxDate = new Date("2025-09-02");

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

      {/* Date + Current Recording */}
      <div className="flex gap-4 mt-4 mb-4">
        <div className="flex flex-col gap-3">
          <Label htmlFor="date-picker" className="px-1">
            Date
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date-picker"
                className="w-40 justify-between font-normal"
                disabled={loading}
              >
                {date.toLocaleDateString()}{" "}
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
                today={new Date("2025-09-02")}
                onSelect={handleDateSelect}
                disabled={{ before: minDate, after: maxDate }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {activeRecording && (
          <div className="flex flex-col gap-3">
            <Label className="px-1">Current Recording</Label>
            <div className="text-sm py-2 px-3 bg-muted rounded-md">
              {activeRecording.title} (
              {new Date(activeRecording.start).toLocaleTimeString()} -{" "}
              {new Date(activeRecording.end).toLocaleTimeString()})
            </div>
          </div>
        )}
      </div>

      {/* Device Picker */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="device-picker" className="px-1">
          Device
        </Label>
        <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="device-picker"
              className="w-40 justify-between font-normal"
              disabled={loading || devices.length === 0}
            >
              {selectedUid
                ? devices.find((d) => d.uid === selectedUid)?.name ||
                  `UID: ${selectedUid.substring(0, 8)}...`
                : "Select device"}{" "}
              <ChevronDownIcon className="h-4 w-4" />
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

      {/* Debug + Errors */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-500 p-2 bg-gray-50 dark:bg-transparent rounded">
          <div>Selected UID: {selectedUid}</div>
          <div>Recordings count: {recordings.length}</div>
          <div>Selected URL: {selectedUrl ? "Set" : "None"}</div>
          <div>Active Recording: {activeRecording?.title || "None"}</div>
        </div>
      )}
      {error && (
        <div className="text-red-600 text-sm mb-4 p-2 rounded">
          Error: {error}
        </div>
      )}
      {loading && (
        <div className="text-gray-600 text-sm mb-4">Loading recordings...</div>
      )}

      <PlaybackTimeline
        videoRef={videoRef}
        recordings={recordings}
        selectedDate={date}
        onSelectRecording={handleTimelineSelect}
        activeRecording={activeRecording}
      />
    </div>
  );
};

export default Playback;
