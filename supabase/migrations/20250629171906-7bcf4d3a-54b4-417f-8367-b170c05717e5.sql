
-- Create the audio-uploads bucket for temporary audio storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-uploads', 'audio-uploads', true);

-- Create RLS policy to allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'audio-uploads' 
  AND auth.role() = 'authenticated'
);

-- Create RLS policy to allow authenticated users to read their own audio files
CREATE POLICY "Authenticated users can read audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'audio-uploads' 
  AND auth.role() = 'authenticated'
);

-- Create RLS policy to allow authenticated users to delete their own audio files
CREATE POLICY "Authenticated users can delete audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'audio-uploads' 
  AND auth.role() = 'authenticated'
);
