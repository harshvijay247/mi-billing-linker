import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, Archive, CheckCircle } from 'lucide-react';

interface FileDropZoneProps {
  accept: string;
  label: string;
  description: string;
  icon: 'excel' | 'zip';
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export const FileDropZone = ({
  accept,
  label,
  description,
  icon,
  onFileSelect,
  selectedFile,
}: FileDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const Icon = icon === 'excel' ? FileSpreadsheet : Archive;

  return (
    <label
      className={`drop-zone flex flex-col items-center justify-center min-h-[200px] ${
        isDragging ? 'drop-zone-active' : ''
      } ${selectedFile ? 'border-accent/60 bg-accent/5' : ''}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
      />
      
      {selectedFile ? (
        <div className="flex flex-col items-center gap-3 animate-scale-in">
          <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-accent" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium">{selectedFile.name}</p>
            <p className="text-muted-foreground text-sm mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-foreground font-medium">{label}</p>
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm">
            <Upload className="w-4 h-4" />
            <span>Drop file or click to browse</span>
          </div>
        </div>
      )}
    </label>
  );
};
