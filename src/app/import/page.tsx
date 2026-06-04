"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { useApp } from "@/hooks/use-app";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

type FieldMapping = {
  source: string; // "__skip__" | "__custom__" | column_header
  customValue?: string;
  customAccountId?: string; // For account field: pick from existing list
};

type MappingState = {
  accountName: FieldMapping;
  amount: FieldMapping;
  type: FieldMapping;
  description: FieldMapping;
  tags: FieldMapping;
  date: FieldMapping;
};

const defaultMapping: MappingState = {
  accountName: { source: "__skip__" },
  amount: { source: "__skip__" },
  type: { source: "__skip__" },
  description: { source: "__skip__" },
  tags: { source: "__skip__" },
  date: { source: "__skip__" },
};

const fieldDefinitions = [
  { key: "accountName", label: "Account Name", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "type", label: "Type (Gave/Got)", required: false },
  { key: "date", label: "Date & Time", required: false },
  { key: "description", label: "Description", required: false },
  { key: "tags", label: "Tags (Comma separated)", required: false },
];

export default function ImportPage() {
  const { batchAddTransactions, accounts } = useApp();
  const { toast } = useToast();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<MappingState>({ ...defaultMapping });
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

        // Auto-guess mapping
        const newMapping = { ...defaultMapping };
        extractedHeaders.forEach((h) => {
          const lower = h.toLowerCase();
          if (lower.includes("name") || lower.includes("customer") || lower.includes("account"))
            newMapping.accountName = { source: h };
          if (lower.includes("amount") || lower.includes("rs") || lower.includes("price"))
            newMapping.amount = { source: h };
          if (lower.includes("type") || lower.includes("gave") || lower.includes("got"))
            newMapping.type = { source: h };
          if (lower.includes("desc") || lower.includes("note"))
            newMapping.description = { source: h };
          if (lower.includes("tag") || lower.includes("category"))
            newMapping.tags = { source: h };
          if (lower.includes("date") || lower.includes("time"))
            newMapping.date = { source: h };
        });
        setMapping(newMapping);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const updateFieldMapping = (
    fieldKey: string,
    updates: Partial<FieldMapping>
  ) => {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey as keyof MappingState], ...updates },
    }));
  };

  const handleImport = async () => {
    const cm = mapping.accountName;
    const am = mapping.amount;

    if (cm.source === "__skip__") {
      toast({ title: "Missing Mapping", description: "Account Name mapping is required.", variant: "destructive" });
      return;
    }
    if (cm.source === "__custom__" && !cm.customAccountId) {
      toast({ title: "Missing Account", description: "Please select a custom account.", variant: "destructive" });
      return;
    }
    if (am.source === "__skip__") {
      toast({ title: "Missing Mapping", description: "Amount mapping is required.", variant: "destructive" });
      return;
    }
    if (am.source === "__custom__" && !am.customValue) {
      toast({ title: "Missing Amount", description: "Please enter a custom amount.", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const rowsToImport = data
        .map((row) => {
          // Customer Name
          let customerName = "";
          if (cm.source === "__custom__") {
            if (cm.customAccountId) {
              const cust = accounts.find((c) => c.id === cm.customAccountId);
              customerName = cust?.name || "";
            }
          } else {
            customerName = String(row[cm.source] || "");
          }

          // Amount
          let amount = 0;
          if (am.source === "__custom__") {
            amount = parseFloat(am.customValue || "0");
          } else {
            const raw = row[am.source];
            amount = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.-]+/g, ""));
          }
          if (isNaN(amount)) amount = 0;

          // Type
          let isGot = false;
          const tm = mapping.type;
          if (tm.source === "__custom__") {
            const cv = (tm.customValue || "").toLowerCase();
            isGot = cv.includes("got") || cv.includes("receive") || cv.includes("in");
          } else if (tm.source !== "__skip__" && row[tm.source]) {
            const typeStr = String(row[tm.source]).toLowerCase();
            isGot = typeStr.includes("got") || typeStr.includes("receive") || typeStr.includes("in");
          }

          // Description
          let description = "";
          const dm = mapping.description;
          if (dm.source === "__custom__") {
            description = dm.customValue || "";
          } else if (dm.source !== "__skip__") {
            description = String(row[dm.source] || "");
          }

          // Tags
          let tags: string[] = [];
          const tgm = mapping.tags;
          if (tgm.source === "__custom__") {
            tags = (tgm.customValue || "").split(",").map((t) => t.trim()).filter(Boolean);
          } else if (tgm.source !== "__skip__" && row[tgm.source]) {
            tags = String(row[tgm.source]).split(",").map((t) => t.trim()).filter(Boolean);
          }

          // Date
          let date = new Date().toISOString();
          const dtm = mapping.date;
          if (dtm.source === "__custom__") {
            const p = new Date(dtm.customValue || "");
            if (!isNaN(p.getTime())) date = p.toISOString();
          } else if (dtm.source !== "__skip__" && row[dtm.source]) {
            const p = new Date(row[dtm.source]);
            if (!isNaN(p.getTime())) date = p.toISOString();
          }

          return { customerName, amount, isGot, description, tags, date, isRefund: false };
        })
        .filter((r) => r.customerName.trim() !== "" && r.amount > 0);

      await batchAddTransactions(rowsToImport);

      toast({
        title: "Import Successful",
        description: `Successfully imported ${rowsToImport.length} transactions.`,
      });
      router.push("/");
    } catch (error) {
      console.error(error);
      toast({ title: "Import Failed", description: "There was an error processing the import.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setHeaders([]);
    setData([]);
    setMapping({ ...defaultMapping });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header
        title="Import Data"
        leftNode={
          <Button asChild variant="outline" size="icon">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 md:px-6 max-w-lg">
          <p className="text-sm text-muted-foreground mb-6">
            Upload a CSV or Excel file to import transactions. If an account doesn&apos;t exist, they will be created automatically.
          </p>

          {/* File Upload */}
          <div className="mb-8">
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {!file ? (
              <div
                className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Click to select a CSV or Excel file</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .csv, .xls, .xlsx</p>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{data.length} rows found</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetState}>
                    Change
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Column Mapping */}
          {file && data.length > 0 && (
            <div className="">
              <h3 className="font-semibold text-lg">Map Columns</h3>
              <div className="space-y-2 text-sm">
                {fieldDefinitions.map((field) => {
                  const fm = mapping[field.key as keyof MappingState];
                  return (
                    <div key={field.key} className="p-2 pl-3 bg-muted-foreground/25 rounded-md">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm w-full font-medium">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Select
                          value={fm.source || "__skip__"}
                          onValueChange={(val) =>
                            updateFieldMapping(field.key, {
                              source: val,
                              customValue: undefined,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Map field..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__">-- Skip --</SelectItem>
                            {headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                            {field.key !== "tags" && (
                              <SelectItem value="__custom__">-- Custom --</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>


                      {fm.source === "__custom__" && (
                        <div className="pt-1">
                          {field.key === "accountName" ? (
                            <Select
                              value={fm.customAccountId || ""}
                              onValueChange={(val) =>
                                updateFieldMapping(field.key, {
                                  customAccountId: val,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pick existing account..." />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.key === "type" ? (
                            <Select
                              value={fm.customValue || "GAVE"}
                              onValueChange={(val) => updateFieldMapping(field.key, { customValue: val })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GAVE">Gave</SelectItem>
                                <SelectItem value="GOT">Got</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : field.key === "date" ? (
                            <Input
                              type="datetime-local"
                              value={fm.customValue || ""}
                              onChange={(e) => updateFieldMapping(field.key, { customValue: e.target.value })}
                            />
                          ) : field.key === "amount" ? (
                            <Input
                              type="number"
                              placeholder="Enter custom amount..."
                              value={fm.customValue || ""}
                              onChange={(e) => updateFieldMapping(field.key, { customValue: e.target.value })}
                            />
                          ) : (
                            <Input
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              value={fm.customValue || ""}
                              onChange={(e) => updateFieldMapping(field.key, { customValue: e.target.value })}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 pb-8">
                <Button
                  className="w-full"
                  onClick={handleImport}
                  disabled={isImporting}
                  isLoading={isImporting}
                >
                  Import {data.length} Transactions
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
