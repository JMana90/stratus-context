import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { contactsService } from "@/services/contactsService";
import { ContactsImporter } from "./ContactsImporter";
import type { ProjectContact } from "@/types/canonical";
import { Search, Upload, Edit, Trash2, Users } from "lucide-react";

interface ProjectContactsProps {
  projectId: string;
}

export function ProjectContacts({ projectId }: ProjectContactsProps) {
  const [contacts, setContacts] = useState<ProjectContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingContact, setEditingContact] = useState<ProjectContact | null>(null);
  const [showImporter, setShowImporter] = useState(false);
  const { toast } = useToast();

  const loadContacts = async () => {
    try {
      setLoading(true);
      const data = await contactsService.list(projectId, search || undefined);
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast({
        title: "Error loading contacts",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [projectId, search]);

  const handleUpdateContact = async (contact: ProjectContact, field: keyof ProjectContact, value: string) => {
    try {
      await contactsService.update(contact.id, { [field]: value });
      await loadContacts();
      toast({
        title: "Contact updated",
        description: "Contact information has been saved",
      });
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast({
        title: "Update failed",
        description: "Could not update contact",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      await contactsService.remove(contactId);
      await loadContacts();
      toast({
        title: "Contact deleted",
        description: "Contact has been removed",
      });
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete contact",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading contacts...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Project Contacts ({contacts.length})
          </CardTitle>
          <Dialog open={showImporter} onOpenChange={setShowImporter}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Contacts</DialogTitle>
              </DialogHeader>
              <ContactsImporter
                projectId={projectId}
                onImportComplete={() => {
                  loadContacts();
                  setShowImporter(false);
                }}
                onClose={() => setShowImporter(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="text-lg font-medium mb-2">No contacts found</div>
              <div className="text-sm text-muted-foreground mb-4">
                {search ? 'No contacts match your search' : 'Start by importing contacts from a CSV file'}
              </div>
              {!search && (
                <Button 
                  onClick={() => setShowImporter(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import Contacts
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        {editingContact?.id === contact.id ? (
                          <Input
                            defaultValue={contact.name}
                            onBlur={(e) => {
                              handleUpdateContact(contact, 'name', e.target.value);
                              setEditingContact(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateContact(contact, 'name', e.currentTarget.value);
                                setEditingContact(null);
                              }
                              if (e.key === 'Escape') {
                                setEditingContact(null);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="font-medium">{contact.name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {contact.email || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="text-sm">{contact.role || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{contact.phone || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingContact(contact)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteContact(contact.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}