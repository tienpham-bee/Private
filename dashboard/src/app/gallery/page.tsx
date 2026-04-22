"use client";

import { useState } from "react";
import {
  ImageIcon,
  Sparkles,
  Loader2,
  Download,
  Trash2,
  X,
  Copy,
  ExternalLink,
  Wand2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";

interface ImageAsset {
  id: string;
  prompt: string;
  model: string;
  file_url: string;
  file_path: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  campaign_id: string | null;
  created_at: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImagePreviewModal({
  image,
  onClose,
}: {
  image: ImageAsset;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative max-w-4xl w-full mx-4">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="rounded-2xl bg-white overflow-hidden shadow-xl">
          <div className="bg-gray-900 flex items-center justify-center p-4 max-h-[60vh]">
            <img
              src={image.file_url}
              alt={image.prompt}
              className="max-h-[56vh] object-contain rounded"
            />
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-700 mb-3">{image.prompt}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
              <span>
                {image.width}x{image.height}
              </span>
              <span>{formatFileSize(image.file_size)}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">
                {image.model}
              </span>
              <span>
                {new Date(image.created_at).toLocaleString("vi-VN")}
              </span>
            </div>
            <div className="flex gap-2">
              <a
                href={image.file_url}
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Download className="h-3.5 w-3.5" />
                Tải xuống
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(image.file_url)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Copy className="h-3.5 w-3.5" />
                Sao chép URL
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [previewImage, setPreviewImage] = useState<ImageAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await api.images.list();
      setImages(data);
    } catch (e: any) {
      // If API not connected yet, show empty state
      console.warn("Could not load images:", e);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const newImage = await api.images.generate({ prompt: prompt.trim() });
      setImages((prev) => [newImage, ...prev]);
      setPrompt("");
    } catch (e: any) {
      setError(e.message || "Lỗi khi tạo ảnh. Kiểm tra API key và kết nối.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.images.delete(id);
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      console.error("Delete failed:", e);
    }
  };

  // Auto-load on first render
  if (!loaded && !loading) {
    loadImages();
  }

  const samplePrompts = [
    "Banner quảng cáo game RPG fantasy với hiệp sĩ và rồng, phong cách epic, 1200x628",
    "Poster mobile game casual puzzle với màu sắc tươi sáng, phong cách cute, 1080x1080",
    "Instagram story quảng cáo game hành động với hiệu ứng neon, 1080x1920",
    "Key visual cho chiến dịch ra mắt game mới, dark fantasy theme",
  ];

  return (
    <div>
      <PageHeader
        title="Thư viện ảnh AI"
        description="Tạo và quản lý hình ảnh marketing bằng Gemini Nano Banana 2"
      />

      {/* Generate section */}
      <Card className="mb-6">
        <CardContent className="py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
              <Wand2 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900 mb-2">
                Tạo ảnh mới với AI
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !generating && handleGenerate()}
                  placeholder="Mô tả hình ảnh bạn muốn tạo..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-brand-500"
                  disabled={generating}
                />
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  size="lg"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {generating ? "Đang tạo..." : "Tạo ảnh"}
                </Button>
              </div>

              {/* Sample prompts */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-gray-400">Gợi ý:</span>
                {samplePrompts.map((sp, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(sp)}
                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {sp.length > 50 ? sp.slice(0, 50) + "..." : sp}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {generating && (
                <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-brand-600 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-brand-800">
                      Gemini đang tạo ảnh...
                    </p>
                    <p className="text-xs text-brand-600">
                      Thường mất 10-30 giây tùy độ phức tạp
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model info */}
      <div className="mb-6 flex items-center gap-4 text-xs text-gray-500">
        <span className="rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700">
          Gemini Nano Banana 2
        </span>
        <span>Model: gemini-3.1-flash-image-preview</span>
        <span>~$0.045/ảnh</span>
      </div>

      {/* Gallery grid */}
      {loading && !loaded ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">
              Chưa có ảnh nào
            </h3>
            <p className="text-sm text-gray-400">
              Nhập mô tả ở trên và bấm &quot;Tạo ảnh&quot; để bắt đầu
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image) => (
            <Card
              key={image.id}
              className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
            >
              <div
                className="relative aspect-video bg-gray-100"
                onClick={() => setPreviewImage(image)}
              >
                <img
                  src={image.file_url}
                  alt={image.prompt}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <CardContent className="py-3">
                <p className="text-xs text-gray-700 line-clamp-2 mb-2">
                  {image.prompt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    {image.width && image.height && (
                      <span>
                        {image.width}x{image.height}
                      </span>
                    )}
                    <span>{formatFileSize(image.file_size)}</span>
                    <span>
                      {new Date(image.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewImage && (
        <ImagePreviewModal
          image={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
