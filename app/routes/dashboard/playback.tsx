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
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useOutletContext } from "react-router";

type OutletHeaderSetter = {
  setHeader?: (ctx: { title?: string; actions?: ReactNode | null }) => void;
};

const Playback = () => {
  const outlet = useOutletContext<OutletHeaderSetter>();

  const recordings = [
    {
      id: 1,
      start: new Date("2025-08-29T08:00:00"),
      end: new Date("2025-08-29T09:30:00"),
    },
    {
      id: 2,
      start: new Date("2025-08-29T12:00:00"),
      end: new Date("2025-08-29T13:15:00"),
    },
  ];

  const videoRef = useRef<HTMLVideoElement>(null);

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    return () => {
      outlet?.setHeader?.({ title: "Playback", actions: null });
    };
  }, []);

  return (
    <div className="ml-4 mr-4">
      <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg">
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=100&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="h-full w-full rounded-lg object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </AspectRatio>
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
                className="w-32 justify-between font-normal"
              >
                {date ? date.toLocaleDateString() : "Select date"}
                <ChevronDownIcon />
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
                onSelect={(date) => {
                  setDate(date);
                  setOpen(false);
                }}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <PlaybackTimeline
        videoRef={videoRef}
        recordings={recordings}
        selectedDate={date}
      />
    </div>
  );
};

export default Playback;
