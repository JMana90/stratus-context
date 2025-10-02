import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  MessageSquare, 
  Mail, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle
} from "lucide-react";

type Level = "org" | "user";
type Provider = "salesforce" | "slack" | "google" | "outlook";
type Status = "connected" | "needs-auth" | "error";

interface ProviderCardProps {
  provider: Provider;
  level: Level;
  title: string;
  description?: string;
  status: Status;
  onAuthorize?: () => Promise<void> | void;
  onDisconnect?: () => Promise<void> | void;
  onTest?: () => Promise<void> | void;
  isLoading?: boolean;
}

const getProviderIcon = (provider: Provider) => {
  switch (provider) {
    case "salesforce":
      return Building2;
    case "slack":
      return MessageSquare;
    case "google":
      return Mail;
    case "outlook":
      return Calendar;
    default:
      return Building2;
  }
};

const getStatusConfig = (status: Status) => {
  switch (status) {
    case "connected":
      return {
        icon: CheckCircle2,
        variant: "default" as const,
        color: "text-green-600",
        label: "Connected"
      };
    case "needs-auth":
      return {
        icon: AlertCircle,
        variant: "secondary" as const,
        color: "text-orange-500",
        label: "Needs Auth"
      };
    case "error":
      return {
        icon: XCircle,
        variant: "destructive" as const,
        color: "text-red-500",
        label: "Error"
      };
  }
};

export default function ProviderCard({
  provider,
  level,
  title,
  description,
  status,
  onAuthorize,
  onDisconnect,
  onTest,
  isLoading = false
}: ProviderCardProps) {
  const ProviderIcon = getProviderIcon(provider);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ProviderIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <p className="text-xs text-muted-foreground capitalize">
                {level} level
              </p>
            </div>
          </div>
          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex gap-2">
          {status === "needs-auth" && onAuthorize && (
            <Button 
              size="sm" 
              onClick={onAuthorize}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Authorizing..." : "Authorize"}
            </Button>
          )}
          
          {status === "connected" && (
            <>
              {onTest && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onTest}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Testing..." : "Test"}
                </Button>
              )}
              
              {onDisconnect && (
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={onDisconnect}
                  disabled={isLoading}
                >
                  Disconnect
                </Button>
              )}
            </>
          )}
          
          {status === "error" && onAuthorize && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onAuthorize}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Retrying..." : "Retry"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}