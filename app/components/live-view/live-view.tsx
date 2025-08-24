import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

const LiveView = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Live Camera Feeds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 1 }).map((_, i) => (
                        <div
                            key={i}
                            className="aspect-video bg-muted flex items-center justify-center rounded-md"
                        >
                            <p className="text-muted-foreground">Camera {i + 1}</p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center gap-2">
                    <Button size="icon" variant="outline">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default LiveView