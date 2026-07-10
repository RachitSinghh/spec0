"use client";

import * as React from "react";

import type { ReferenceInput } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * UI/UX reference uploader (T-042, FRONTEND-SPEC A6.6). Repeatable reference
 * links + an image dropzone (3px dashed black border — dashed is fine, still
 * 0px radius). Images: presign → PUT straight to R2 → record the ref. The cap
 * is enforced client-side (re-checked server-side in the presign endpoint).
 */
export function ReferenceUploader({
  projectId,
  value,
  onChange,
  maxReferences = 5,
  maxUploadMb = 10,
}: {
  projectId: string;
  value: ReferenceInput[];
  onChange: (refs: ReferenceInput[]) => void;
  maxReferences?: number;
  maxUploadMb?: number;
}) {
  const [link, setLink] = React.useState("");
  const [note, setNote] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const atCap = value.length >= maxReferences;

  function addLink() {
    const url = link.trim();
    if (!url || atCap) return;
    onChange([...value, { kind: "link", url, note: note.trim() || undefined }]);
    setLink("");
    setNote("");
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  async function uploadImage(file: File) {
    setError(null);
    if (atCap) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > maxUploadMb * 1024 * 1024) {
      setError(`Image exceeds ${maxUploadMb}MB.`);
      return;
    }
    setUploading(true);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          contentType: file.type,
          sizeBytes: file.size,
          filename: file.name,
        }),
      });
      if (!presignRes.ok) {
        const { error: e } = await presignRes.json().catch(() => ({ error: "presign failed" }));
        throw new Error(e ?? "presign failed");
      }
      const { url, storageKey, publicUrl } = await presignRes.json();
      // Browser PUTs bytes directly to R2 (never through our function).
      const put = await fetch(url, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`upload failed (${put.status})`);
      onChange([
        ...value,
        { kind: "image", url: publicUrl, storageKey, note: file.name },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadImage(file);
  }

  return (
    <div className="flex flex-col gap-sp-3">
      <p className="font-mono text-tiny uppercase text-content-secondary">
        References ({value.length}/{maxReferences})
      </p>

      <div className="flex flex-col gap-sp-2 md:flex-row">
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://example.com/inspiration"
          disabled={atCap}
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (optional)"
          disabled={atCap}
        />
        <Button variant="secondary" size="small" onClick={addLink} disabled={atCap}>
          ADD LINK
        </Button>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileInput.current?.click()}
        className="flex cursor-pointer items-center justify-center border-[3px] border-dashed border-black p-sp-4 font-mono text-small uppercase text-content-secondary"
      >
        {uploading ? "UPLOADING…" : atCap ? "REFERENCE LIMIT REACHED" : "DROP OR CLICK TO UPLOAD IMAGE"}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={atCap || uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadImage(f);
            e.target.value = "";
          }}
        />
      </div>

      {error ? <p className="text-tiny text-error">{error}</p> : null}

      {value.length > 0 ? (
        <ul className="flex flex-col gap-sp-2">
          {value.map((r, i) => (
            <li
              key={`${r.url}-${i}`}
              className="flex items-center justify-between gap-sp-3 border-thin border-black p-sp-2 font-mono text-small"
            >
              <span className="truncate">
                [{r.kind}] {r.url}
                {r.note ? ` — ${r.note}` : ""}
              </span>
              <Button variant="destructive" size="small" onClick={() => remove(i)}>
                REMOVE
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
