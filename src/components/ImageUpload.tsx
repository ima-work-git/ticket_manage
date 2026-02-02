import { useRef } from 'react';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string | undefined) => void;
  aspectRatio?: string;
}

export function ImageUpload({
  value,
  onChange,
  aspectRatio = '16 / 9',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onChange(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="image-upload"
      style={{ aspectRatio }}
      onClick={() => inputRef.current?.click()}
    >
      {value ? (
        <img src={value} alt="Uploaded" />
      ) : (
        <div className="image-upload-placeholder">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>画像をアップロード</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
}
