import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Link, X, Loader2 } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [mode, setMode] = useState<"upload" | "url">(value ? "url" : "upload");
  const [preview, setPreview] = useState<string>(value || "");
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, isLoading, error, reset } = useUpload();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Chỉ chấp nhận jpg, png, webp, gif";
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `Kích thước tối đa ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFile = useCallback(
    async (file: File) => {
      const err = validateFile(file);
      if (err) {
        toast.error(err);
        return;
      }

      setPreview(URL.createObjectURL(file));
      reset();

      try {
        const result = await upload(file);
        onChange(result.url);
        setPreview(result.url);
        toast.success("Upload thành công!");
      } catch {
        toast.error(error || "Upload thất bại");
        setPreview(value || "");
      }
    },
    [upload, onChange, error, reset, value]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
    setPreview(url);
  };

  const clearImage = () => {
    onChange("");
    setPreview("");
    reset();
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("upload")}
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload ảnh
        </Button>
        <Button
          type="button"
          variant={mode === "url" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("url")}
        >
          <Link className="h-4 w-4 mr-1" />
          Nhập URL
        </Button>
      </div>

      {mode === "upload" ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragActive(false)}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleInputChange}
          />
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Đang upload...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Kéo thả ảnh vào đây hoặc click để chọn
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, WebP, GIF — tối đa {MAX_SIZE_MB}MB
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/image.jpg"
            value={value}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          {value && (
            <Button type="button" variant="ghost" size="icon" onClick={clearImage}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="h-32 w-32 object-cover rounded-lg border"
            onError={() => setPreview("")}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={clearImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
