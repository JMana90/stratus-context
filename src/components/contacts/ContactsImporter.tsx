import React, { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { contactsService } from "@/services/contactsService";
import { Upload, FileText } from "lucide-react";

interface ContactsImporterProps {
  projectId: string;
  onImportComplete: () => void;
  onClose: () => void;
}

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  name: string;
  email: string;
  role: string;
  phone: string;
}

export function ContactsImporter({ projectId, onImportComplete, onClose }: ContactsImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "CSV parsing error",
            description: "There was an issue parsing your CSV file",
            variant: "destructive",
          });
          return;
        }

        const data = results.data as ParsedRow[];
        const cols = results.meta.fields || [];
        
        setCsvData(data.slice(0, 1000)); // Cap at 1000 rows
        setColumns(cols);
        setStep('map');

        // Auto-detect common columns
        const autoMapping: Partial<ColumnMapping> = {};
        cols.forEach(col => {
          const lower = col.toLowerCase();
          if (lower.includes('name') && !lower.includes('email')) {
            autoMapping.name = col;
          } else if (lower.includes('email')) {
            autoMapping.email = col;
          } else if (lower.includes('role') || lower.includes('title')) {
            autoMapping.role = col;
          } else if (lower.includes('phone')) {
            autoMapping.phone = col;
          }
        });
        setMapping(autoMapping);
      },
      error: (error) => {
        toast({
          title: "File parsing failed",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleImport = async () => {
    if (!mapping.name || !mapping.email) {
      toast({
        title: "Required fields missing",
        description: "Please map both Name and Email columns",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const contactsToImport = csvData.map(row => ({
        name: row[mapping.name!] || '',
        email: row[mapping.email!] || 'no-email@example.com',
        role: mapping.role ? row[mapping.role] || '' : '',
        phone: mapping.phone ? row[mapping.phone] || undefined : undefined,
      })).filter(contact => contact.name.trim() && contact.email.trim());

      await contactsService.createMany(projectId, contactsToImport);
      
      toast({
        title: "Import successful",
        description: `Imported ${contactsToImport.length} contacts`,
      });
      
      onImportComplete();
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import failed",
        description: "There was an error importing your contacts",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (step === 'upload') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Contacts from CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <Label htmlFor="csv-file" className="cursor-pointer">
              <div className="text-lg font-medium mb-2">Select CSV file</div>
              <div className="text-sm text-muted-foreground mb-4">
                Upload a CSV file with contact information
              </div>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="sr-only"
              />
              <Button type="button" variant="outline">
                Choose File
              </Button>
            </Label>
          </div>
          {file && (
            <div className="text-sm text-center text-muted-foreground">
              Selected: {file.name}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === 'map') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Map CSV Columns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name (Required)</Label>
              <Select value={mapping.name || ''} onValueChange={(value) => setMapping(prev => ({...prev, name: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email">Email (Required)</Label>
              <Select value={mapping.email || ''} onValueChange={(value) => setMapping(prev => ({...prev, email: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={mapping.role || ''} onValueChange={(value) => setMapping(prev => ({...prev, role: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Select value={mapping.phone || ''} onValueChange={(value) => setMapping(prev => ({...prev, phone: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {columns.map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Preview (first 5 rows)</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.slice(0, 5).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{mapping.name ? row[mapping.name] : '-'}</TableCell>
                      <TableCell>{mapping.email ? row[mapping.email] : '-'}</TableCell>
                      <TableCell>{mapping.role ? row[mapping.role] : '-'}</TableCell>
                      <TableCell>{mapping.phone ? row[mapping.phone] : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!mapping.name || !mapping.email || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${csvData.length} Contacts`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}