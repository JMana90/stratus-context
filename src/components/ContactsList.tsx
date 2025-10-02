import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Mail, Phone, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { integrationDataService } from "@/services/integrationDataService";
import { useIntegrationStatus } from "@/hooks/useIntegrationStatus";

interface ContactsListProps {
  projectId?: string;
  organizationId?: string;
}

export default function ContactsList({ projectId, organizationId }: ContactsListProps) {
  const integrationStatus = useIntegrationStatus(projectId || '', organizationId || '');
  
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['integration-contacts', projectId],
    queryFn: () => projectId ? integrationDataService.getWidgetData(projectId, 'contacts') : Promise.resolve([]),
    enabled: !!projectId && integrationStatus.crm
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Project Contacts</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if CRM integration is connected
  if (!integrationStatus.crm) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Project Contacts</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Salesforce integration required</p>
            <p className="text-xs mt-1">Connect Salesforce in project settings to view contacts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contactsArray = Array.isArray(contacts) ? contacts : [];

  if (contactsArray.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Project Contacts</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No contacts available</p>
            <p className="text-xs mt-1">Connect a CRM integration to see project contacts</p>
            <Button variant="outline" size="sm" className="mt-3">
              <Plus className="h-3 w-3 mr-1" />
              Add Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Project Contacts</CardTitle>
        <div className="flex items-center gap-2">
          {contactsArray.length > 0 && contactsArray[0].source && (
            <Badge variant="secondary" className="text-xs">
              {contactsArray[0].source}
            </Badge>
          )}
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contactsArray.slice(0, 5).map((contact: any) => (
            <div key={contact.id} className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${contact.name}`} />
                <AvatarFallback className="text-xs">
                  {contact.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {contact.name}
                  </p>
                  {contact.is_project_member && (
                    <Badge variant="outline" className="text-xs">
                      Team
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {contact.role && (
                    <p className="text-xs text-muted-foreground">{contact.role}</p>
                  )}
                  {contact.company && (
                    <p className="text-xs text-muted-foreground">@ {contact.company}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {contact.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                  >
                    <Mail className="h-3 w-3" />
                  </Button>
                )}
                {contact.phone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(`tel:${contact.phone}`, '_blank')}
                  >
                    <Phone className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {contactsArray.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm" className="text-xs">
                View all {contactsArray.length} contacts
              </Button>
            </div>
          )}
          
          <div className="border-t pt-3">
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-3 w-3 mr-1" />
              Add Contact
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}