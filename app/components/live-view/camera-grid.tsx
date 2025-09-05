import { Card, CardContent } from "@/components/ui/card";
import { Maximize, Video } from "lucide-react";
import { type FC } from "react";

type CameraGridProps = {
  cameraUIDs: string[];
  recordingState: Record<string, boolean>;
  toggleRecording: (uid: string) => void;
  viewLayout: string;
};

const layoutToCols: Record<string, string> = {
  "1x1": "grid-cols-1",
  "2x2": "grid-cols-2",
  "3x3": "grid-cols-3",
  "4x4": "grid-cols-4",
};

export const CameraGrid: FC<CameraGridProps> = ({
  cameraUIDs,
  recordingState,
  toggleRecording,
  viewLayout,
}) => {
  return (
    <Card className="shadow-none border-0 dark:bg-transparent">
      <CardContent className="space-y-0.5">
        <div
          className={`grid gap-4 ${layoutToCols[viewLayout] || "grid-cols-2"}`}
        >
          {cameraUIDs.map((uid) => {
            const isRecording = recordingState[uid] || false;

            return (
              <div
                key={uid}
                className="group relative aspect-video bg-black dark:bg-[#333] flex items-center justify-center rounded-md overflow-hidden"
              >
                <div id={`streamContainer-${uid}`} className="w-full h-full" />

                {/* Overlay on hover / recording */}
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <div
                    className={`absolute inset-0 transition-opacity ${
                      isRecording
                        ? "bg-black/40 opacity-100"
                        : "bg-black/40 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {/* Record button */}
                    <Video
                      className={`absolute top-2 left-2 w-6 h-6 cursor-pointer ${
                        isRecording
                          ? "text-red-600 drop-shadow-lg"
                          : "text-white"
                      }`}
                      onClick={() => toggleRecording(uid)}
                    />

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 text-white text-xs px-3 py-2 flex flex-col gap-0.5">
                      <div className="font-medium truncate">
                        {uid || "Unknown UID"}
                        {isRecording && (
                          <span className="ml-2 text-red-500 font-bold animate-pulse">
                            ● REC
                          </span>
                        )}
                      </div>

                      {/* Fullscreen button */}
                      <Maximize
                        className="absolute bottom-2 right-2 text-white w-6 h-6 cursor-pointer"
                        onClick={() => {
                          const container = document.getElementById(
                            `streamContainer-${uid}`
                          );
                          if (container) {
                            if (container.requestFullscreen) {
                              container.requestFullscreen();
                            } else if (
                              (container as any).webkitRequestFullscreen
                            ) {
                              (container as any).webkitRequestFullscreen();
                            } else if ((container as any).msRequestFullscreen) {
                              (container as any).msRequestFullscreen();
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Persistent bottom bar (fades on hover) */}
                <div className="absolute bottom-0 left-0 right-0 text-white text-xs px-3 py-2 flex flex-col gap-0.5 opacity-100 transition-opacity group-hover:opacity-0">
                  <div className="font-medium truncate">
                    {isRecording && (
                      <span className="ml-2 text-red-500 font-bold animate-pulse">
                        ● REC
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
