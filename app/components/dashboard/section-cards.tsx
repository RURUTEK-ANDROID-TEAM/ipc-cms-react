
import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Video, VideoOffIcon } from "lucide-react"

export function SectionCards() {
    return (
        <div className="*:data-[slot=card]:from-primary/0 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            <Card className="@container/card">
                <CardHeader>
                    <div className="flex items-center justify-between space-y-0">
                        <CardTitle>Total Cameras</CardTitle>
                        <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        12</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between space-y-0">
                        <CardTitle>Camera's Online</CardTitle>
                        <Video className="h-6 w-6 text-green-500" />
                    </div>
                    <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        12</CardTitle>
                </CardHeader>
            </Card>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between space-y-0">
                        <CardTitle>Camera's Offline</CardTitle>
                        <VideoOffIcon className="h-6 w-6 text-red-500" />
                    </div>
                    <CardTitle className="mt-2 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                        12</CardTitle>
                </CardHeader>
            </Card>
        </div>
    )
}
