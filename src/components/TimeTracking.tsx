
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Pause, Square } from "lucide-react";
import { useState, useEffect } from "react";

export function TimeTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [todayTotal, setTodayTotal] = useState(7.5); // Mock data
  const [currentTask, setCurrentTask] = useState("Review wireframes");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTracking) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isTracking]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    setIsTracking(!isTracking);
    if (!isTracking) {
      setCurrentTime(0);
    }
  };

  const handlePause = () => {
    setIsTracking(false);
  };

  return (
    <Card className="bg-card dark:bg-card shadow-sm border dark:border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-foreground mb-2">
            {formatTime(currentTime)}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Current task: {currentTask}
          </p>
          
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={handleStartStop}
              className={isTracking ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isTracking ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              {isTracking ? "Stop" : "Start"}
            </Button>
            
            {isTracking && (
              <Button variant="outline" onClick={handlePause}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Today's Total</span>
            <Badge variant="secondary">{todayTotal}h</Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">This Week</span>
              <span>32.5h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">This Month</span>
              <span>156h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
