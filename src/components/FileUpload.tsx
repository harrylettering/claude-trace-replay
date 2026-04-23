
import { useCallback } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface FileUploadProps {
  onFileLoad: (content: string) => void;
  isDark?: boolean; // Deprecated: kept for backward compatibility
  disabled?: boolean;
}

export function FileUpload({ onFileLoad, disabled = false }: FileUploadProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onFileLoad(content);
      };
      reader.readAsText(file);
    }
  }, [onFileLoad, disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onFileLoad(content);
      };
      reader.readAsText(file);
    }
  }, [onFileLoad, disabled]);

  return (
    <div
      onDragOver={(e) => !disabled && e.preventDefault()}
      onDrop={handleDrop}
      className={clsx(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
        disabled
          ? "border-border bg-surface/50 cursor-not-allowed opacity-60"
          : "cursor-pointer border-border hover:border-blue-500 hover:bg-surface-hover"
      )}
    >
      <input
        type="file"
        accept=".jsonl,.json,.log"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
        disabled={disabled}
      />
      <label
        htmlFor={disabled ? "" : "file-upload"}
        className={clsx("cursor-pointer", disabled && "cursor-not-allowed")}
      >
        {disabled ? (
          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-muted" />
        ) : (
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted" />
        )}
        <div className="text-sm font-medium text-content-secondary">
          {disabled ? "Processing..." : "Click or drag to upload"}
        </div>
        <div className="text-xs mt-1 text-muted">
          .jsonl, .json, .log
        </div>
      </label>
    </div>
  );
}
