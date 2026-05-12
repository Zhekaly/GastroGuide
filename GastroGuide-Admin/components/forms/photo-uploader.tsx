"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { uploadApi } from "@/lib/api/endpoints";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PhotoUploaderProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function PhotoUploader({ value, onChange }: PhotoUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    try {
      setUploading(true);
      const uploaded = await uploadApi.image(file);
      onChange([...value, uploaded.url]);
      toast.success("Фото загружено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className="relative group rounded-md border overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Фото ${index + 1}`} className="h-32 w-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <button
          type="button"
          className="h-32 rounded-md border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-accent"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-xs">{uploading ? "Загрузка..." : "Загрузить фото"}</span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = "";
        }}
      />

      <div className="flex gap-2">
        <Input
          placeholder="или вставь URL изображения"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!manualUrl}
          onClick={() => {
            const trimmed = manualUrl.trim();
            if (!trimmed) return;
            onChange([...value, trimmed]);
            setManualUrl("");
          }}
        >
          Добавить
        </Button>
      </div>
    </div>
  );
}
