import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, VideoOffIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

export function SectionCards() {
  const [totalCameraCount, setTotalCameraCount] = useState<number | null>(null);
  const [onlineCamerasCount, setOnlineCamerasCount] = useState<number | null>(
    null
  );
  const [offlineCamerasCount, setOfflineCamerasCount] = useState<number | null>(
    null
  );

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        const res = await fetch("http://172.16.0.157:5000/api/cameras", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch cameras");
        }

        const data = await res.json();

        setTotalCameraCount(data.length);
        console.log(data);
      } catch (error) {
        console.error(error);
        setTotalCameraCount(0);
      }
    };

    fetchCameras();

    const ws = new WebSocket("ws://172.16.0.157:5001/camdata");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "camera_status") {
        setOnlineCamerasCount(msg.total); // total online
        if (totalCameraCount !== null && totalCameraCount != 0) {
          setOfflineCamerasCount(totalCameraCount - msg.total); // offline = total - online
        }

        if (totalCameraCount === 0) {
          setOnlineCamerasCount(0);
          setOfflineCamerasCount(0);
        }
      }
    };

    return () => ws.close();
  }, [totalCameraCount]);

  return (
    <div className="*:data-[slot=card]:from-primary/0 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      <Card className="@container/card">
        <CardHeader>
          <div className="flex items-center justify-between space-y-0">
            <CardTitle>Total Cameras</CardTitle>
            <Video className="h-6 w-6 text-blue-500" />
          </div>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalCameraCount !== null ? (
              <span>{totalCameraCount}</span>
            ) : (
              <Skeleton className="h-9 w-9" />
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between space-y-0">
            <CardTitle>Camera's Online</CardTitle>
            <Video className="h-6 w-6 text-green-500" />
          </div>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {onlineCamerasCount !== null ? (
              <span>{onlineCamerasCount}</span>
            ) : (
              <Skeleton className="h-9 w-9" />
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between space-y-0">
            <CardTitle>Camera's Offline</CardTitle>
            <VideoOffIcon className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {offlineCamerasCount !== null ? (
              <span>{offlineCamerasCount}</span>
            ) : (
              <Skeleton className="h-9 w-9" />
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
