// timeline.tsx (updated with fixes)
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { DataSet } from "vis-data";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import "./timeline.css";

interface TimelineProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  recordings: { id: number; start: string; end: string; url: string }[];
  selectedDate?: Date;
  onSelectRecording?: (
    rec: { id: number; start: string; end: string; url: string },
    seekSeconds: number
  ) => void;
  activeRecording: {
    id: number;
    start: string;
    end: string;
    url: string;
  } | null;
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

  const getTimelineBounds = useCallback(() => {
    const baseDate = selectedDate || new Date();
    const dayStart = new Date(baseDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(baseDate);
    dayEnd.setHours(23, 59, 59, 999);

    return { min: dayStart, max: dayEnd };
  }, [selectedDate]);

  const handleTimelineClick = useCallback(
    (time: Date) => {
      console.log("Timeline clicked at:", time);

      const clickedTime = time.getTime();
      const matchingRecording = recordings.find((rec) => {
        const start = new Date(rec.start).getTime();
        const end = new Date(rec.end).getTime();
        const isInRange = clickedTime >= start && clickedTime <= end;

        console.log(
          `Checking recording ${rec.id}: ${start} <= ${clickedTime} <= ${end} = ${isInRange}`
        );
        return isInRange;
      });

      console.log("Matching recording:", matchingRecording);

      if (matchingRecording && onSelectRecording) {
        const recordingStartTime = new Date(matchingRecording.start).getTime();
        const seekSeconds = (clickedTime - recordingStartTime) / 1000;
        console.log("Calling onSelectRecording with seek:", seekSeconds);
        onSelectRecording(matchingRecording, seekSeconds);
      } else {
        console.log("No matching recording found for clicked time");
      }
    },
    [recordings, onSelectRecording]
  );

  useEffect(() => {
    if (!timelineRef.current) {
      console.log("Timeline ref not available");
      return;
    }

    console.log("Timeline effect triggered with recordings:", recordings);

    const validRecordings = recordings.filter((rec) => {
      const start = new Date(rec.start);
      const end = new Date(rec.end);
      const isValidDates = !isNaN(start.getTime()) && !isNaN(end.getTime());
      const isValidRange = start <= end;

      console.log(
        `Recording ${rec.id}: start=${start}, end=${end}, valid=${isValidDates && isValidRange}`
      );
      return isValidDates && isValidRange;
    });

    console.log("Valid recordings:", validRecordings);

    // Create items for the timeline
    const items = new DataSet(
      validRecordings.map((rec) => {
        const startDate = new Date(rec.start);
        const endDate = new Date(rec.end);

        return {
          id: rec.id,
          start: startDate,
          end: endDate,
          content: `Recording ${rec.id}`,
          className: "recorded-segment",
          type: "range" as const,
          title: `${`Recording ${rec.id}`}\n${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`,
        };
      })
    );

    console.log("Timeline items:", items.get());

    const bounds = getTimelineBounds();
    console.log("Timeline bounds:", bounds);

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
      // Force timeline to fit the window
      start: bounds.min,
      end: bounds.max,
    };

    // Destroy existing timeline
    if (timelineInstance.current) {
      console.log("Destroying existing timeline");
      timelineInstance.current.destroy();
    }

    // Create new timeline
    console.log("Creating new timeline");
    timelineInstance.current = new Timeline(
      timelineRef.current,
      items,
      options
    );

    // Add playback cursor
    const markerId = "playback-cursor";
    try {
      timelineInstance.current.addCustomTime(bounds.min, markerId);
    } catch (e) {
      console.log("Could not add custom time marker:", e);
    }

    // Add click event listener
    timelineInstance.current.on("click", (props) => {
      console.log("Timeline click event:", props);
      if (props.time) {
        handleTimelineClick(new Date(props.time));
      }
    });

    // Add ready event listener
    timelineInstance.current.on("ready", () => {
      console.log("Timeline is ready");
    });

    return () => {
      if (timelineInstance.current) {
        console.log("Cleaning up timeline");
        timelineInstance.current.destroy();
        timelineInstance.current = null;
      }
    };
  }, [recordings, selectedDate, getTimelineBounds, handleTimelineClick]);

  // Update playback position cursor based on video currentTime
  useEffect(() => {
    const video = videoRef.current;
    const timeline = timelineInstance.current;

    if (!video || !timeline) return;

    const updatePlaybackCursor = () => {
      if (!activeRecording) return;

      const recordingStart = new Date(activeRecording.start).getTime();
      const currentPlaybackTime = recordingStart + video.currentTime * 1000;

      try {
        timeline.setCustomTime(
          new Date(currentPlaybackTime),
          "playback-cursor"
        );
      } catch (e) {
        // Ignore errors if cursor doesn't exist
      }
    };

    const handleTimeUpdate = () => {
      updatePlaybackCursor();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
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
