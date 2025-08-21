import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Image, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FileUploadProps {
  onFileContent: (content: string, filename: string, type: 'pdf' | 'image' | 'csv' | 'excel') => void;
  onClearFile: () => void;
  uploadedFile: { name: string; type: 'pdf' | 'image' | 'csv' | 'excel' } | null;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileContent,
  onClearFile,
  uploadedFile,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Extract text using Supabase edge function
  // Process BMP data for code interpreter
  const processBMPData = async (content: string, fileType: 'csv' | 'excel'): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('process-bmp-data', {
      body: { content, fileType }
    });

    if (error) {
      console.error('BMP processing error:', error);
      throw new Error(error.message || 'Failed to process BMP data');
    }

    return data.processedData;
  };

  const extractTextFromFileAPI = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: formData,
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Failed to extract text from file');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data.text || '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Determine file type
    const isPDF = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
    const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                   file.type === 'application/vnd.ms-excel' ||
                   file.name.toLowerCase().endsWith('.xlsx') ||
                   file.name.toLowerCase().endsWith('.xls');

    if (!isPDF && !isImage && !isCSV && !isExcel) {
      toast.error('Please select a PDF, image, CSV, or Excel file');
      return;
    }

    setIsProcessing(true);

    try {
      const fileType: 'pdf' | 'image' | 'csv' | 'excel' = isPDF ? 'pdf' : isImage ? 'image' : isCSV ? 'csv' : 'excel';
      
      // Handle CSV/Excel files differently
      if (isCSV || isExcel) {
        toast.info('Processing BMP data file...');
        const text = await file.text();
        const processedData = await processBMPData(text, isCSV ? 'csv' : 'excel');
        toast.success('BMP data processed successfully!');
        onFileContent(processedData, file.name, fileType);
      } else {
        toast.info('Processing file...');
        const extractedText = await extractTextFromFileAPI(file);
        toast.success('Text extracted successfully!');

        if (!extractedText || extractedText.length < 10) {
          toast.warning('Very little text was found in the file. Please ensure the file contains readable text.');
        }

        onFileContent(extractedText, file.name, fileType);
      }

    } catch (error) {
      console.error('File processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract text from file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearFile = () => {
    onClearFile();
    toast.info('File cleared');
  };

  const getFileIcon = () => {
    if (!uploadedFile) return <Paperclip className="h-4 w-4" />;
    if (uploadedFile.type === 'pdf') return <FileText className="h-4 w-4" />;
    if (uploadedFile.type === 'image') return <Image className="h-4 w-4" />;
    return <BarChart3 className="h-4 w-4" />; // For CSV/Excel
  };

  const getFileTypeLabel = () => {
    if (!uploadedFile) return '';
    if (uploadedFile.type === 'pdf') return 'PDF';
    if (uploadedFile.type === 'image') return 'Image';
    if (uploadedFile.type === 'csv') return 'CSV Data';
    return 'Excel Data';
  };

  const truncateFileName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    const truncated = nameWithoutExt.substring(0, maxLength - (extension?.length || 0) - 4) + '...';
    return `${truncated}.${extension}`;
  };

  if (isProcessing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="text-sm text-blue-700 dark:text-blue-300">
          Processing file...
        </span>
      </div>
    );
  }

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-green-700 dark:text-green-300 truncate block" title={uploadedFile.name}>
              {truncateFileName(uploadedFile.name)}
            </span>
            <span className="text-xs text-green-600 dark:text-green-400">
              {getFileTypeLabel()} • Text extracted
            </span>
          </div>
        </div>
        <Button
          onClick={handleClearFile}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={handleFileSelect}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        disabled={disabled}
        title="Upload PDF, image, or BMP data (CSV/Excel)"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*,.csv,.xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
      />
    </>
  );
};

export default FileUpload;