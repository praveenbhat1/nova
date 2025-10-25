import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface FileUploadProps {
  onUploadComplete: () => void;
}

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      toast.success('File uploaded successfully!');
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-12 rounded-2xl"
    >
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-300
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          {uploading ? (
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          ) : (
            <div className="relative">
              <Upload className="h-16 w-16 text-primary" />
              <FileSpreadsheet className="h-8 w-8 text-accent absolute -bottom-2 -right-2" />
            </div>
          )}
          
          <div>
            <h3 className="text-xl font-bold mb-2">
              {uploading ? 'Uploading...' : isDragActive ? 'Drop your CSV here' : 'Upload Dataset'}
            </h3>
            <p className="text-muted-foreground">
              {uploading 
                ? 'Processing your data...' 
                : 'Drag and drop a CSV file, or click to browse'}
            </p>
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="px-3 py-1 rounded-full bg-background/50">CSV only</span>
            <span className="px-3 py-1 rounded-full bg-background/50">Max 50MB</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
