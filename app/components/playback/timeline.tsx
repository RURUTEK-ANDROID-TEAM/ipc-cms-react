import { useRef, useEffect, type RefObject } from "react";
import { DataSet } from "vis-data";
import { Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

interface TimelineProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  recordings: { id: number; start: Date; end: Date }[];
}

export function PlaybackTimeline({ videoRef, recordings }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);

  useEffect(() => {
    if (!timelineRef.current) return;

    const items = new DataSet(
      recordings.map((rec) => ({
        id: rec.id,
        start: rec.start,
        end: rec.end,
        content: "Recording",
      }))
    );

    const options = {
      stack: false,
      selectable: true,
      zoomable: true,
      horizontalScroll: true,
      moveable: true,
      min: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12h before
      max: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h after
      zoomMin: 1000 * 60, // 1 minute
      zoomMax: 1000 * 60 * 60 * 24, // 1 day
    };

    timelineInstance.current = new Timeline(
      timelineRef.current,
      items,
      options
    );

    timelineInstance.current.on("select", (props) => {
      if (props.items.length === 0) return;

      const itemId = props.items[0];
      const item = items.get(itemId);

      // Properly type guard: ensure item exists and has a 'start' property
      if (item && "start" in item && item.start && videoRef.current) {
        const startTimeMs = new Date(item.start as Date).getTime();
        const startSec = (startTimeMs / 1000) % videoRef.current.duration;
        videoRef.current.currentTime = startSec;
        videoRef.current.play();
      }
    });

    return () => {
      timelineInstance.current?.destroy();
    };
  }, [recordings]);

  return <div className="h-[100px]" ref={timelineRef} />;
}
