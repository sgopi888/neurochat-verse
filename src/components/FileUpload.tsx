import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FileUploadProps {
  onFileContent: (content: string, filename: string, type: 'pdf' | 'image') => void;
  onClearFile: () => void;
  uploadedFile: { name: string; type: 'pdf' | 'image' } | null;
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

  // Extract text from PDF using PDF.js
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.');
    }
  };

  // Extract text from images using Canvas API
  const extractTextFromImage = async (file: File): Promise<string> => {
    // For now, return a placeholder since OCR requires additional libraries
    // You could integrate with Tesseract.js or similar for actual OCR
    return `[Image uploaded: ${file.name}]\n\nNote: Image text extraction is not yet implemented. Please describe the content of this image or convert it to text manually.`;
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

    if (!isPDF && !isImage) {
      toast.error('Please select a PDF file or image (PNG, JPG, JPEG, GIF, BMP, WEBP)');
      return;
    }

    setIsProcessing(true);

    try {
      const fileType: 'pdf' | 'image' = isPDF ? 'pdf' : 'image';
      toast.info(`Processing ${fileType.toUpperCase()}...`);
      
      let extractedText: string;
      
      if (isPDF) {
        extractedText = await extractTextFromPDF(file);
        toast.success('PDF text extracted successfully!');
      } else {
        extractedText = await extractTextFromImage(file);
        toast.success('Image processed successfully!');
      }

      if (!extractedText || extractedText.length < 10) {
        toast.warning('Very little text was found in the file. Please ensure the file contains readable text.');
      }

      onFileContent(extractedText, file.name, fileType);

    } catch (error) {
      console.error('File processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process file');
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
    return uploadedFile.type === 'pdf' ? 
      <FileText className="h-4 w-4" /> : 
      <Image className="h-4 w-4" />;
  };

  const getFileTypeLabel = () => {
    if (!uploadedFile) return '';
    return uploadedFile.type === 'pdf' ? 'PDF' : 'Image';
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
        title="Upload PDF or Image"
      >
        <Paperclip className="h-4 w-4" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </>
  );
};

export default FileUpload;