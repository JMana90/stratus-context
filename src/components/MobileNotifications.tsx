
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Bell, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function MobileNotifications() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setPushEnabled(true);
        toast({
          title: "Notifications Enabled",
          description: "You'll receive push notifications for project updates",
        });
        
        // Send a test notification
        new Notification("Stratus Notifications Enabled", {
          body: "You'll now receive project updates on this device",
          icon: "/favicon.ico"
        });
      } else {
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        });
      }
    }
  };

  const toggleNotifications = () => {
    if (permission !== 'granted') {
      requestNotificationPermission();
    } else {
      setPushEnabled(!pushEnabled);
      toast({
        title: pushEnabled ? "Notifications Disabled" : "Notifications Enabled",
        description: pushEnabled 
          ? "You won't receive push notifications" 
          : "You'll receive push notifications for project updates",
      });
    }
  };

  return (
    <Card className="bg-card dark:bg-card shadow-sm border dark:border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground dark:text-foreground flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get instant updates on task changes
              </p>
            </div>
          </div>
          <Switch 
            checked={pushEnabled && permission === 'granted'}
            onCheckedChange={toggleNotifications}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium">Due Date Reminders</p>
              <p className="text-sm text-muted-foreground">
                24h before task deadlines
              </p>
            </div>
          </div>
          <Switch defaultChecked />
        </div>

        <div className="pt-2 text-sm text-muted-foreground">
          Status: {permission === 'granted' ? '✅ Enabled' : permission === 'denied' ? '❌ Blocked' : '⏸️ Not Set'}
        </div>
      </CardContent>
    </Card>
  );
}
