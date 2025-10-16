import { useCallback, useEffect, useRef } from "react";
import { DataSet } from "vis-data";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import "./timeline.css"; // Your custom styles for the timeline

// --- TYPE DEFINITIONS ---
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
  recordings: Recording[];
  selectedDate?: Date;
  onSelectRecording?: (rec: Recording, seekSeconds: number) => void;
  activeRecording: Recording | null;
  currentTime: number; // Replaces the need for videoRef
}

// --- COMPONENT ---
export function PlaybackTimeline({
  recordings,
  selectedDate,
  onSelectRecording,
  activeRecording,
  currentTime,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);

  const getTimelineBounds = useCallback(() => {
    const date = selectedDate || new Date();
    const min = new Date(date);
    min.setHours(0, 0, 0, 0);
    const max = new Date(date);
    max.setHours(23, 59, 59, 999);
    return { min: min.getTime(), max: max.getTime() };
  }, [selectedDate]);

  const handleTimelineClick = useCallback(
    (time: Date) => {
      if (!time) return;
      const clickedTime = time.getTime();
      const rec = recordings.find(
        (r) =>
          clickedTime >= new Date(r.start).getTime() &&
          clickedTime <= new Date(r.end).getTime()
      );
      if (rec && onSelectRecording) {
        const seekSeconds =
          (clickedTime - new Date(rec.start).getTime()) / 1000;
        onSelectRecording(rec, seekSeconds);
      }
    },
    [recordings, onSelectRecording]
  );

  useEffect(() => {
    if (!timelineRef.current) return;

    // Destroy previous timeline if exists
    if (timelineInstance.current) {
      timelineInstance.current.destroy();
      timelineInstance.current = null;
    }

    const items = new DataSet(
      recordings.map((rec) => ({
        id: rec.id,
        start: new Date(rec.start),
        end: new Date(rec.end),
        content: rec.title || `Rec #${rec.id}`,
        type: "range" as const,
        className: "recorded-segment",
        title: `${rec.title}\n${new Date(rec.start).toLocaleTimeString()} - ${new Date(
          rec.end
        ).toLocaleTimeString()}`,
      }))
    );

    const bounds = getTimelineBounds();

    const timeline = new Timeline(timelineRef.current, items, {
      stack: false,
      selectable: true,
      min: bounds.min,
      max: bounds.max,
      start: bounds.min,
      end: bounds.max,
      height: "100px",
      zoomMin: 1000 * 60,
      zoomMax: 1000 * 60 * 60 * 24,
      showCurrentTime: false,
      orientation: "top",
    });

    timeline.addCustomTime(bounds.min, "playback-cursor");

    timeline.on("click", (props) => {
      if (props.time) handleTimelineClick(new Date(props.time));
    });

    timelineInstance.current = timeline;

    return () => {
      timeline.destroy();
      timelineInstance.current = null;
    };
  }, [recordings, selectedDate, getTimelineBounds, handleTimelineClick]);

  // Update custom time (cursor)
  useEffect(() => {
    const timeline = timelineInstance.current;
    if (!timeline || !activeRecording) return;

    const start = new Date(activeRecording.start).getTime();
    const cursorTime = new Date(start + currentTime * 1000);

    // Guard: Only update if timeline exists
    try {
      timeline.setCustomTime(cursorTime, "playback-cursor");
      timeline.moveTo(cursorTime);
    } catch (e) {
      // Ignore errors if outside visible range
    }
  }, [currentTime, activeRecording]);

  return (
    <div className="w-full min-h-[130px] rounded-lg shadow-md p-2 bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200">
      <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        {recordings.length > 0
          ? `${recordings.length} recording(s) found for this day.`
          : "No recordings available for the selected day."}
      </div>
      <div ref={timelineRef} className="h-[100px] w-full" />
    </div>
  );
}
