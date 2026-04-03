
import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { clsx } from 'clsx';

interface FileUploadProps {
  onFileLoad: (content: string) => void;
  isDark: boolean;
}

export function FileUpload({ onFileLoad, isDark }: FileUploadProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
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
  }, [onFileLoad]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        onFileLoad(content);
      };
      reader.readAsText(file);
    }
  }, [onFileLoad]);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={clsx(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
        isDark
          ? "border-slate-600 hover:border-blue-500 hover:bg-slate-700/30"
          : "border-slate-300 hover:border-blue-500 hover:bg-slate-50"
      )}
    >
      <input
        type="file"
        accept=".jsonl,.json,.log"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Upload className={clsx("w-8 h-8 mx-auto mb-2", isDark ? "text-slate-400" : "text-slate-500")} />
        <div className={clsx("text-sm font-medium", isDark ? "text-slate-300" : "text-slate-700")}>
          点击或拖拽上传
        </div>
        <div className={clsx("text-xs mt-1", isDark ? "text-slate-500" : "text-slate-400")}>
          .jsonl, .json, .log
        </div>
      </label>
    </div>
  );
}
