"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useApp } from "@/hooks/use-app";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TransactionType } from "@/lib/types";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ColumnMapping = {
  customerName: string;
  amount: string;
  type: string;
  description: string;
  tags: string;
  date: string;
};

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { batchAddTransactions } = useApp();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (typeof bstr !== "string") return;
      
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const parsedData = XLSX.utils.sheet_to_json(ws, { raw: false }) as any[];
      
      if (parsedData.length > 0) {
        const extractedHeaders = Object.keys(parsedData[0]);
        setHeaders(extractedHeaders);
        setData(parsedData);

        // Auto-guess mapping based on common names
        const autoMap: Partial<ColumnMapping> = {};
        extractedHeaders.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes("name") || lower.includes("customer")) autoMap.customerName = h;
          if (lower.includes("amount") || lower.includes("rs") || lower.includes("price")) autoMap.amount = h;
          if (lower.includes("type") || lower.includes("gave") || lower.includes("got")) autoMap.type = h;
          if (lower.includes("desc") || lower.includes("note")) autoMap.description = h;
          if (lower.includes("tag") || lower.includes("category")) autoMap.tags = h;
          if (lower.includes("date") || lower.includes("time")) autoMap.date = h;
        });
        setMapping(autoMap);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (!mapping.customerName || !mapping.amount) {
      toast({
        title: "Missing Mapping",
        description: "Customer Name and Amount are required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    try {
      const rowsToImport = data.map(row => {
        const rawAmount = row[mapping.amount!];
        let amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]+/g, ""));
        if (isNaN(amount)) amount = 0;

        let type: TransactionType = 'GAVE';
        if (mapping.type && row[mapping.type]) {
          const typeStr = String(row[mapping.type]).toLowerCase();
          if (typeStr.includes('got') || typeStr.includes('receive') || typeStr.includes('in')) {
            type = 'GOT';
          }
        }

        let tags: string[] = [];
        if (mapping.tags && row[mapping.tags]) {
          tags = String(row[mapping.tags]).split(',').map(t => t.trim()).filter(Boolean);
        }

        let date = new Date().toISOString();
        if (mapping.date && row[mapping.date]) {
          const parsedDate = new Date(row[mapping.date]);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString();
          }
        }

        return {
          customerName: String(row[mapping.customerName!]),
          amount,
          type,
          description: mapping.description ? String(row[mapping.description] || "") : "",
          tags,
          date,
          isRefund: false,
        };
      }).filter(r => r.customerName && r.customerName.trim() !== "");

      await batchAddTransactions(rowsToImport);
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${rowsToImport.length} transactions.`
      });
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error(error);
      toast({
        title: "Import Failed",
        description: "There was an error processing the import.",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setHeaders([]);
    setData([]);
    setMapping({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const requiredFields = [
    { key: "customerName", label: "Customer Name *" },
    { key: "amount", label: "Amount *" },
    { key: "type", label: "Type (Gave/Got)" },
    { key: "date", label: "Date & Time" },
    { key: "description", label: "Description" },
    { key: "tags", label: "Tags (Comma separated)" },
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetState();
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import transactions. If a customer doesn't exist, they will be created automatically.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              Select CSV / Excel File
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="text-sm text-muted-foreground">
              File: <span className="font-medium text-foreground">{file.name}</span> ({data.length} rows found)
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Map Columns</h3>
              {requiredFields.map(field => (
                <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                  <Label>{field.label}</Label>
                  <Select 
                    value={mapping[field.key as keyof ColumnMapping] || "none"}
                    onValueChange={(val) => setMapping(prev => ({ ...prev, [field.key]: val === "none" ? undefined : val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Skip --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {file && (
            <Button variant="outline" onClick={resetState} disabled={isImporting}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleImport} 
            disabled={!file || !mapping.customerName || !mapping.amount || isImporting}
            isLoading={isImporting}
          >
            Import Transactions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
