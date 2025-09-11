'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UploadedFile } from '@/types/transaction';

interface FileUploaderProps {
  onFileUpload: (file: UploadedFile) => void;
  acceptedTypes?: string;
}

export function FileUploader({ onFileUpload, acceptedTypes = '.csv,.pdf,.xlsx,.xls' }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const uploadedFile: UploadedFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        content: e.target?.result || ''
      };
      
      setUploadedFile(uploadedFile);
      onFileUpload(uploadedFile);
    };

    if (file.name.endsWith('.pdf') || file.name.match(/\.(xlsx|xls)$/i)) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }, [onFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const removeFile = useCallback(() => {
    setUploadedFile(null);
  }, []);

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Carica estratto conto</h3>
              <p className="text-muted-foreground">
                Trascina qui il tuo file CSV, PDF o Excel oppure clicca per selezionarlo
              </p>
              <p className="text-sm text-muted-foreground">
                Formati supportati: CSV, PDF, Excel (.xlsx/.xls) (max 10MB)
              </p>
            </div>
            <Button className="mt-4" onClick={() => document.getElementById('file-input')?.click()}>
              Seleziona File
            </Button>
            <input
              id="file-input"
              type="file"
              accept={acceptedTypes}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}