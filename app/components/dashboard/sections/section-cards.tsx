import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { DecodedToken } from "@/lib/utils";
import axios from "axios";
import { Cctv } from "components/animate-ui/icons/cctv";
import { AnimateIcon } from "components/animate-ui/icons/icon";
import { jwtDecode } from "jwt-decode";
import { Video, VideoOffIcon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";

interface SectionCardsProps {
  refreshKey?: number;
}

interface CameraData {
  totalCameraCount: number | null;
  onlineCamerasCount: number | null;
  offlineCamerasCount: number | null;
}

const API_URL = "http://172.16.0.157:5000/api";

export function SectionCards({ refreshKey }: SectionCardsProps) {
  const [cameraData, setCameraData] = useState<CameraData>({
    totalCameraCount: null,
    onlineCamerasCount: null,
    offlineCamerasCount: null,
  });

  const navigate = useNavigate();

  const fetchCameras = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");

      if (token) {
        const decoded = jwtDecode<DecodedToken>(token);
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          localStorage.removeItem("accessToken");
          navigate("/");
          return;
        }
      }

      const res = await axios.get(`${API_URL}/cameras`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      });

      const data = res.data;

      setCameraData((prev) => ({ ...prev, totalCameraCount: data.length }));
    } catch (error) {
      console.error("Failed to fetch cameras:", error);
      setCameraData((prev) => ({ ...prev, totalCameraCount: 0 }));
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [refreshKey, fetchCameras]);

  useEffect(() => {
    const ws = new WebSocket("ws://172.16.0.157:5001/camdata");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "camera_status") {
        setCameraData((prev) => {
          const onlineCount = msg.total;
          const offlineCount =
            prev.totalCameraCount !== null
              ? Math.max(0, prev.totalCameraCount - onlineCount)
              : null;
          return {
            ...prev,
            onlineCamerasCount: onlineCount,
            offlineCamerasCount: offlineCount,
          };
        });
      }
    };

    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.log("WebSocket connection closed");

    return () => ws.close();
  }, []);

  useEffect(() => {
    if (
      cameraData.totalCameraCount === null ||
      cameraData.onlineCamerasCount === null
    )
      return;

    if (cameraData.totalCameraCount === 0) {
      setCameraData((prev) => ({
        ...prev,
        onlineCamerasCount: 0,
        offlineCamerasCount: 0,
      }));
    }
  }, [cameraData.totalCameraCount, cameraData.onlineCamerasCount]);

  const renderCard = (
    title: string,
    count: number | null,
    Icon: React.ComponentType<{ className: string }>,
    iconColor: string
  ) => (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center justify-between space-y-0">
          <CardTitle className="text-lg font-medium text-gray-700 dark:text-gray-200">
            {title}
          </CardTitle>

          <AnimateIcon animate={true} loop={true}>
            <Cctv className={`h-8 w-8 ${iconColor}`} />
          </AnimateIcon>
        </div>
        <CardTitle className="mt-2 text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
          {count !== null ? <span>{count}</span> : <Spinner />}
        </CardTitle>
      </CardHeader>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/0 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
      {renderCard(
        "Total Cameras",
        cameraData.totalCameraCount,
        Video,
        "text-blue-500"
      )}
      {renderCard(
        "Cameras Connected",
        cameraData.onlineCamerasCount,
        Video,
        "text-green-500"
      )}
      {renderCard(
        "Cameras Disconnected",
        cameraData.offlineCamerasCount,
        VideoOffIcon,
        "text-red-500"
      )}
    </div>
  );
}
