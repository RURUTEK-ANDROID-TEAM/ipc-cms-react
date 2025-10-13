// timeline.tsx
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { DataSet } from "vis-data";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import "./timeline.css";

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

interface TimelineProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  recordings: Recording[];
  selectedDate?: Date;
  onSelectRecording?: (rec: Recording, seekSeconds: number) => void;
  activeRecording: Recording | null;
}

export function PlaybackTimeline({
  videoRef,
  recordings,
  selectedDate,
  onSelectRecording,
  activeRecording,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);

  // Get timeline bounds for the selected day
  const getTimelineBounds = useCallback(() => {
    const baseDate = selectedDate || new Date();

    // Create day bounds in local timezone
    const dayStart = new Date(baseDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(baseDate);
    dayEnd.setHours(23, 59, 59, 999);

    console.log("Timeline bounds:", {
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
    });

    return { min: dayStart, max: dayEnd };
  }, [selectedDate]);

  // Handle timeline click
  const handleTimelineClick = useCallback(
    (time: Date) => {
      if (!time) return;

      const clickedTime = time.getTime();
      const matchingRecording = recordings.find((rec) => {
        const start = new Date(rec.start).getTime();
        const end = new Date(rec.end).getTime();
        return clickedTime >= start && clickedTime <= end;
      });

      if (matchingRecording && onSelectRecording) {
        const recordingStart = new Date(matchingRecording.start).getTime();
        const seekSeconds = (clickedTime - recordingStart) / 1000;
        onSelectRecording(matchingRecording, seekSeconds);
      }
    },
    [recordings, onSelectRecording]
  );

  // Initialize timeline
  useEffect(() => {
    if (!timelineRef.current) return;

    console.log("Initializing timeline with recordings:", recordings);

    // Clean up previous timeline
    if (timelineInstance.current) {
      timelineInstance.current.destroy();
      timelineInstance.current = null;
    }

    // Filter valid recordings
    const validRecordings = recordings.filter((rec) => {
      const start = new Date(rec.start);
      const end = new Date(rec.end);
      const isValid =
        !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;

      if (!isValid) {
        console.warn("Invalid recording filtered out:", rec);
      }

      return isValid;
    });

    console.log("Valid recordings for timeline:", validRecordings.length);

    // Create timeline items
    const items = new DataSet(
      validRecordings.map((rec) => {
        const start = new Date(rec.start);
        const end = new Date(rec.end);

        console.log("Timeline item:", {
          id: rec.id,
          recording_id: rec.recording_id,
          start: start.toISOString(),
          end: end.toISOString(),
          startLocal: start.toLocaleString(),
          endLocal: end.toLocaleString(),
        });

        return {
          id: Number(rec.id),
          start,
          end,
          content: rec.recording_id,
          type: "range" as const,
          className: "recorded-segment",
          title: `${rec.recording_id}\n${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`,
        };
      })
    );

    const bounds = getTimelineBounds();

    const options = {
      stack: false,
      selectable: true,
      zoomable: true,
      horizontalScroll: true,
      moveable: true,
      margin: { item: 5, axis: 3 },
      min: bounds.min,
      max: bounds.max,
      zoomMin: 1000 * 60, // 1 minute
      zoomMax: 1000 * 60 * 60 * 24, // 24 hours
      orientation: "top" as const,
      showCurrentTime: false,
      height: "100px",
      start: bounds.min,
      end: bounds.max,
    };

    console.log("Creating timeline with options:", {
      itemCount: items.length,
      bounds,
    });

    // Create timeline
    timelineInstance.current = new Timeline(
      timelineRef.current,
      items,
      options
    );

    // Add playback cursor
    try {
      timelineInstance.current.addCustomTime(bounds.min, "playback-cursor");
    } catch (e) {
      console.warn("Could not add custom time:", e);
    }

    // Click listener
    timelineInstance.current.on("click", (props) => {
      if (props.time) handleTimelineClick(new Date(props.time));
    });

    return () => {
      if (timelineInstance.current) {
        timelineInstance.current.destroy();
        timelineInstance.current = null;
      }
    };
  }, [recordings, getTimelineBounds, handleTimelineClick]);

  // Update playback cursor based on video time
  useEffect(() => {
    const video = videoRef.current;
    const timeline = timelineInstance.current;
    if (!video || !timeline || !activeRecording) return;

    const updateCursor = () => {
      const recordingStart = new Date(activeRecording.start).getTime();
      const currentTime = recordingStart + video.currentTime * 1000;
      try {
        timeline.setCustomTime(new Date(currentTime), "playback-cursor");
      } catch (e) {
        // Ignore errors when cursor is outside visible range
      }
    };

    video.addEventListener("timeupdate", updateCursor);
    return () => {
      video.removeEventListener("timeupdate", updateCursor);
    };
  }, [videoRef, activeRecording]);

  return (
    <div className="w-full min-h-[130px] rounded-lg shadow-md p-2 bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200">
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        {recordings.length > 0
          ? `${recordings.length} recording(s) found`
          : "No recordings available"}
      </div>
      <div ref={timelineRef} className="h-[100px] w-full" />
    </div>
  );
}
