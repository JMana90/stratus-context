import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RefreshCw, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SalesforceObject {
  apiName: string;
  label: string;
}

interface SalesforceRecord {
  Id: string;
  Name: string;
  [key: string]: any;
}

interface ExternalDataPanelProps {
  projectId: string;
  organizationId: string;
}

export function ExternalDataPanel({ projectId, organizationId }: ExternalDataPanelProps) {
  const [objects, setObjects] = useState<SalesforceObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SalesforceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SalesforceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [salesforceConnected, setSalesforceConnected] = useState(false);
  const [savedMapping, setSavedMapping] = useState<any>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    checkSalesforceStatus();
    loadSavedMapping();
  }, [organizationId, projectId]);

  useEffect(() => {
    if (salesforceConnected && !objects.length) {
      loadObjects();
    }
  }, [salesforceConnected]);

  const checkSalesforceStatus = async () => {
    try {
      const response = await fetch(`/supabase/functions/v1/salesforce_proxy/status?organizationId=${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      const data = await response.json();
      setSalesforceConnected(data.status === 'connected');
    } catch (error) {
      console.error('Failed to check Salesforce status:', error);
      setSalesforceConnected(false);
    }
  };

  const loadSavedMapping = async () => {
    try {
      const { data } = await supabase
        .from('project_templates')
        .select('preferences_json')
        .eq('project_id', projectId)
        .eq('is_default', true)
        .single();

      if (data?.preferences_json && typeof data.preferences_json === 'object') {
        const prefs = data.preferences_json as any;
        if (prefs.salesforceProject) {
          setSavedMapping(prefs.salesforceProject);
          setSelectedObject(prefs.salesforceProject.sObject);
          setSelectedRecord({
            Id: prefs.salesforceProject.id,
            Name: prefs.salesforceProject.fields?.Name || 'Unknown',
            ...prefs.salesforceProject.fields
          });
        }
      }
    } catch (error) {
      console.error('Failed to load saved mapping:', error);
    }
  };

  const loadObjects = async () => {
    if (!salesforceConnected) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/supabase/functions/v1/salesforce_proxy/objects?organizationId=${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load objects');
      }

      const data = await response.json();
      setObjects(data);
    } catch (error) {
      console.error('Failed to load objects:', error);
      toast({
        title: "Error",
        description: "Failed to load Salesforce objects",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedObject || !searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please select an object and enter search terms",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/supabase/functions/v1/salesforce_proxy/search?organizationId=${organizationId}&sObject=${selectedObject}&q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      toast({
        title: "Error",
        description: "Failed to search records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecord = async (record: SalesforceRecord) => {
    setLoading(true);
    try {
      // Get full record details
      const response = await fetch(`/supabase/functions/v1/salesforce_proxy/record?organizationId=${organizationId}&sObject=${selectedObject}&id=${record.Id}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch record details');
      }

      const fullRecord = await response.json();
      setSelectedRecord(fullRecord);

      // Save mapping to project preferences
      await saveMapping(selectedObject, fullRecord);
      
      toast({
        title: "Success",
        description: "Salesforce project linked successfully"
      });
    } catch (error) {
      console.error('Failed to select record:', error);
      toast({
        title: "Error",
        description: "Failed to link Salesforce project",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveMapping = async (sObject: string, record: SalesforceRecord) => {
    try {
      // Get existing project template
      const { data: existing } = await supabase
        .from('project_templates')
        .select('id, preferences_json')
        .eq('project_id', projectId)
        .eq('is_default', true)
        .single();

      const salesforceProject = {
        sObject,
        id: record.Id,
        fields: record
      };

      if (existing) {
        // Update existing preferences
        const currentPrefs = existing.preferences_json as any || {};
        const updatedPrefs = {
          ...currentPrefs,
          salesforceProject
        };

        const { error } = await supabase
          .from('project_templates')
          .update({ preferences_json: updatedPrefs })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create default template with Salesforce mapping
        const { data: template } = await supabase
          .from('templates')
          .insert({
            name: 'Default Template',
            body: 'Weekly project update template',
            format: 'markdown',
            organization_id: organizationId
          })
          .select()
          .single();

        if (template) {
          await supabase
            .from('project_templates')
            .insert({
              project_id: projectId,
              template_id: template.id,
              preferences_json: { salesforceProject },
              is_default: true
            });
        }
      }

      setSavedMapping(salesforceProject);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      throw error;
    }
  };

  const refreshRecord = async () => {
    if (!selectedRecord || !selectedObject) return;

    setLoading(true);
    try {
      const response = await fetch(`/supabase/functions/v1/salesforce_proxy/record?organizationId=${organizationId}&sObject=${selectedObject}&id=${selectedRecord.Id}`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh record');
      }

      const refreshedRecord = await response.json();
      setSelectedRecord(refreshedRecord);
      
      // Update saved mapping with fresh data
      await saveMapping(selectedObject, refreshedRecord);
      
      toast({
        title: "Refreshed",
        description: "Salesforce data updated"
      });
    } catch (error) {
      console.error('Failed to refresh record:', error);
      toast({
        title: "Error",
        description: "Failed to refresh Salesforce data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRecordUrl = (record: SalesforceRecord) => {
    // Assume standard Salesforce URL format
    return `https://[instance].salesforce.com/${record.Id}`;
  };

  if (!salesforceConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Salesforce Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Connect Salesforce to link project data
            </p>
            <Button variant="outline" onClick={() => window.open('/integrations', '_blank')}>
              Connect Salesforce
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Salesforce Project
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedRecord ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{selectedRecord.Name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedObject} • {selectedRecord.Id}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshRecord}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(getRecordUrl(selectedRecord), '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedRecord.StageName && (
                <div>
                  <Label className="text-xs text-muted-foreground">Stage</Label>
                  <p>{selectedRecord.StageName}</p>
                </div>
              )}
              {selectedRecord.Status__c && (
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p>{selectedRecord.Status__c}</p>
                </div>
              )}
              {selectedRecord.CloseDate && (
                <div>
                  <Label className="text-xs text-muted-foreground">Close Date</Label>
                  <p>{new Date(selectedRecord.CloseDate).toLocaleDateString()}</p>
                </div>
              )}
              {selectedRecord.Due_Date__c && (
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <p>{new Date(selectedRecord.Due_Date__c).toLocaleDateString()}</p>
                </div>
              )}
              {selectedRecord.Owner?.Name && (
                <div>
                  <Label className="text-xs text-muted-foreground">Owner</Label>
                  <p>{selectedRecord.Owner.Name}</p>
                </div>
              )}
              {selectedRecord.Account?.Name && (
                <div>
                  <Label className="text-xs text-muted-foreground">Account</Label>
                  <p>{selectedRecord.Account.Name}</p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRecord(null);
                setSearchResults([]);
                setSearchQuery("");
              }}
            >
              Change Selection
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Step 1: Choose Object Type</Label>
              <Select value={selectedObject} onValueChange={setSelectedObject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select object type (e.g., Project__c, Opportunity)" />
                </SelectTrigger>
                <SelectContent>
                  {objects.map(obj => (
                    <SelectItem key={obj.apiName} value={obj.apiName}>
                      {obj.label} ({obj.apiName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedObject && (
              <div>
                <Label>Step 2: Search & Select Record</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter search terms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={loading}>
                    Search
                  </Button>
                </div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <Label>Search Results</Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map(record => (
                    <div
                      key={record.Id}
                      className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted"
                      onClick={() => handleSelectRecord(record)}
                    >
                      <div>
                        <p className="font-medium">{record.Name}</p>
                        <p className="text-xs text-muted-foreground">{record.Id}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}