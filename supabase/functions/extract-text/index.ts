import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB');
    }

    let extractedText = '';

    if (file.type === 'application/pdf') {
      // For PDFs, use HURIDOCS API
      try {
        const huridocsFormData = new FormData();
        huridocsFormData.append('file', file);

        const huridocsResponse = await fetch('https://huridocs.org/demo/api/layout', {
          method: 'POST',
          body: huridocsFormData,
        });

        if (!huridocsResponse.ok) {
          throw new Error('HURIDOCS API request failed');
        }

        const data = await huridocsResponse.json();
        console.log('HURIDOCS response:', JSON.stringify(data, null, 2));

        if (data.pages && Array.isArray(data.pages)) {
          extractedText = data.pages
            .map((page: any) => {
              if (page.blocks && Array.isArray(page.blocks)) {
                return page.blocks
                  .map((block: any) => block.text || '')
                  .filter(text => text.trim())
                  .join('\n');
              }
              return '';
            })
            .filter(pageText => pageText.trim())
            .join('\n\n');
        }

        if (!extractedText.trim()) {
          throw new Error('No text found in PDF');
        }

      } catch (huridocsError) {
        console.error('HURIDOCS API error:', huridocsError);
        
        // Fallback: Simple text extraction using a different approach
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Simple PDF text extraction (basic approach)
          const pdfText = new TextDecoder().decode(uint8Array);
          const textMatches = pdfText.match(/\((.*?)\)/g);
          
          if (textMatches && textMatches.length > 0) {
            extractedText = textMatches
              .map(match => match.replace(/[()]/g, ''))
              .filter(text => text.trim() && text.length > 2)
              .join(' ');
          }
          
          if (!extractedText.trim()) {
            extractedText = `[PDF file: ${file.name}]\n\nNote: This PDF may contain images or complex formatting that prevents text extraction. Please try converting it to a text document or describe its contents manually.`;
          }
          
        } catch (fallbackError) {
          console.error('Fallback extraction error:', fallbackError);
          extractedText = `[PDF file: ${file.name}]\n\nNote: Unable to extract text from this PDF. It may be password-protected, image-based, or corrupted. Please try a different file or describe its contents manually.`;
        }
      }
      
    } else if (file.type.startsWith('image/')) {
      // For images, provide a placeholder (OCR could be added later)
      extractedText = `[Image uploaded: ${file.name}]\n\nNote: Image text extraction (OCR) is not yet implemented. Please describe the content of this image manually.`;
      
    } else {
      throw new Error('Unsupported file type. Please upload a PDF or image file.');
    }

    console.log(`Extracted text length: ${extractedText.length}`);

    return new Response(
      JSON.stringify({ 
        text: extractedText,
        filename: file.name,
        filesize: file.size,
        filetype: file.type
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Text extraction error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to extract text from file',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});