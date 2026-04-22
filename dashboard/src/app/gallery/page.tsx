"use client";

import { useCallback, useRef, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Images,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  extra_data: { mode?: string; source_image_id?: string } | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STYLE_PRESETS = [
  { id: "none", label: "Không có", suffix: "" },
  { id: "flat", label: "Flat Design", suffix: ", flat design style, clean vectors, bold colors, minimalist" },
  { id: "neon", label: "Neon / Cyberpunk", suffix: ", neon cyberpunk style, dark background, glowing neon lights, futuristic" },
  { id: "anime", label: "Anime", suffix: ", anime art style, Japanese illustration, vibrant colors" },
  { id: "minimal", label: "Minimalist", suffix: ", minimalist style, clean white background, simple shapes, elegant" },
  { id: "realistic", label: "Realistic", suffix: ", photorealistic, ultra-detailed, 8K, cinematic lighting" },
  { id: "3d", label: "3D Render", suffix: ", 3D render, Blender style, volumetric lighting, glossy materials" },
  { id: "watercolor", label: "Watercolor", suffix: ", watercolor painting, soft brushstrokes, artistic, dreamy" },
  { id: "pixel", label: "Pixel Art", suffix: ", pixel art style, retro 8-bit game aesthetic, vibrant palette" },
] as const;

const ASPECT_RATIOS = [
  { id: "free", label: "Tự do", suffix: "" },
  { id: "1:1", label: "Vuông 1:1", suffix: ", square format 1080x1080" },
  { id: "16:9", label: "Banner 16:9", suffix: ", landscape banner 1200x628" },
  { id: "9:16", label: "Story 9:16", suffix: ", vertical story 1080x1920" },
  { id: "4:5", label: "Feed 4:5", suffix: ", portrait feed 1080x1350" },
] as const;

const SAMPLE_PROMPTS = [
  "Banner quảng cáo game RPG fantasy, hiệp sĩ và rồng, phong cách epic",
  "Poster mobile game casual puzzle, màu sắc tươi sáng, phong cách cute",
  "Instagram story quảng cáo game hành động, hiệu ứng neon",
  "Key visual chiến dịch ra mắt game mới, dark fantasy theme",
  "Nhân vật game mobile đáng yêu, chibi style, background gradient",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function modeBadge(mode?: string) {
  if (!mode || mode === "generate") return null;
  const map: Record<string, { label: string; color: string }> = {
    reference: { label: "Từ mẫu", color: "bg-blue-100 text-blue-700" },
    variation: { label: "Biến thể", color: "bg-purple-100 text-purple-700" },
    batch: { label: "Batch", color: "bg-green-100 text-green-700" },
    uploaded: { label: "Upload", color: "bg-orange-100 text-orange-700" },
  };
  const info = map[mode];
  if (!info) return null;
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${info.color}`}>{info.label}</span>;
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ image, onClose, onVariation, onDelete }: {
  image: ImageAsset;
  onClose: () => void;
  onVariation: (img: ImageAsset) => void;
  onDelete: (id: string) => void;
}) {
  const imgUrl = api.images.fileUrl(image.id);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-9 right-0 text-white/80 hover:text-white">
          <X className="h-6 w-6" />
        </button>
        <div className="rounded-2xl bg-white overflow-hidden shadow-2xl">
          <div className="bg-gray-950 flex items-center justify-center" style={{ maxHeight: "60vh" }}>
            <img src={imgUrl} alt={image.prompt} className="max-h-[60vh] object-contain" />
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-700 mb-3 line-clamp-3">{image.prompt}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
              {image.width && <span>{image.width}×{image.height}</span>}
              <span>{formatSize(image.file_size)}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">{image.model}</span>
              {modeBadge(image.extra_data?.mode)}
              <span>{new Date(image.created_at).toLocaleString("vi-VN")}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={imgUrl} download className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                <Download className="h-3.5 w-3.5" /> Tải xuống
              </a>
              <button onClick={() => navigator.clipboard.writeText(imgUrl)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Copy className="h-3.5 w-3.5" /> Sao chép URL
              </button>
              <button onClick={() => { onClose(); onVariation(image); }} className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100">
                <RefreshCw className="h-3.5 w-3.5" /> Tạo biến thể
              </button>
              <button onClick={() => { if (confirm("Xoá ảnh này?")) { onDelete(image.id); onClose(); } }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 ml-auto">
                <Trash2 className="h-3.5 w-3.5" /> Xoá
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Image Card ────────────────────────────────────────────────────────────────
function ImageCard({ image, onPreview, onDelete, onVariation }: {
  image: ImageAsset;
  onPreview: (img: ImageAsset) => void;
  onDelete: (id: string) => void;
  onVariation: (img: ImageAsset) => void;
}) {
  const imgUrl = api.images.fileUrl(image.id);
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
      <div className="relative bg-gray-100 cursor-pointer" style={{ aspectRatio: image.width && image.height ? `${image.width}/${image.height}` : "16/10" }} onClick={() => onPreview(image)}>
        <img src={imgUrl} alt={image.prompt} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {modeBadge(image.extra_data?.mode) && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {modeBadge(image.extra_data?.mode)}
          </div>
        )}
      </div>
      <CardContent className="py-2.5 px-3">
        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{image.prompt}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {image.width && <span>{image.width}×{image.height}</span>}
            <span>{new Date(image.created_at).toLocaleDateString("vi-VN")}</span>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onVariation(image)} className="rounded p-1 text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors" title="Tạo biến thể">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (confirm("Xoá ảnh này?")) onDelete(image.id); }} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Xoá">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
type Tab = "text" | "reference" | "variation";

export default function GalleryPage() {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageAsset | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("text");

  // Form state
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("none");
  const [selectedRatio, setSelectedRatio] = useState<string>("free");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [batchCount, setBatchCount] = useState(1);

  // Reference image state
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refPreviewUrl, setRefPreviewUrl] = useState<string | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Variation source
  const [variationSource, setVariationSource] = useState<ImageAsset | null>(null);
  const [variationPrompt, setVariationPrompt] = useState("");

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.images.list();
      setImages(data);
    } catch (e) {
      console.warn("Could not load images:", e);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  if (!loaded && !loading) loadImages();

  // Build final prompt with style + ratio suffixes
  const buildFinalPrompt = (base: string) => {
    const style = STYLE_PRESETS.find((s) => s.id === selectedStyle);
    const ratio = ASPECT_RATIOS.find((r) => r.id === selectedRatio);
    let final = base.trim();
    if (style && style.suffix) final += style.suffix;
    if (ratio && ratio.suffix) final += ratio.suffix;
    if (negativePrompt.trim()) final += `. Không có: ${negativePrompt.trim()}`;
    return final;
  };

  const appendImages = (newOnes: ImageAsset | ImageAsset[]) => {
    const arr = Array.isArray(newOnes) ? newOnes : [newOnes];
    setImages((prev) => [...arr, ...prev]);
  };

  // ── Generate from text ──
  const handleGenerateText = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    const finalPrompt = buildFinalPrompt(prompt);
    try {
      if (batchCount === 1) {
        const img = await api.images.generate({ prompt: finalPrompt });
        appendImages(img);
      } else {
        const imgs = await api.images.batchGenerate({ prompt: finalPrompt, count: batchCount });
        appendImages(imgs);
      }
      setPrompt("");
    } catch (e: any) {
      setError(e.message || "Lỗi khi tạo ảnh");
    } finally {
      setGenerating(false);
    }
  };

  // ── Generate from reference ──
  const handleGenerateFromRef = async () => {
    if (!prompt.trim() || !refFile) return;
    setGenerating(true);
    setError(null);
    const finalPrompt = buildFinalPrompt(prompt);
    try {
      const fd = new FormData();
      fd.append("prompt", finalPrompt);
      fd.append("reference_image", refFile);
      const img = await api.images.generateFromReference(fd);
      appendImages(img);
      setPrompt("");
      setRefFile(null);
      setRefPreviewUrl(null);
    } catch (e: any) {
      setError(e.message || "Lỗi khi tạo ảnh từ mẫu");
    } finally {
      setGenerating(false);
    }
  };

  // ── Create variations ──
  const handleCreateVariations = async () => {
    if (!variationSource) return;
    setGenerating(true);
    setError(null);
    try {
      const imgs = await api.images.createVariations(variationSource.id, batchCount, variationPrompt || undefined);
      appendImages(imgs);
      setVariationSource(null);
      setVariationPrompt("");
    } catch (e: any) {
      setError(e.message || "Lỗi khi tạo biến thể");
    } finally {
      setGenerating(false);
    }
  };

  // ── Upload ──
  const handleUpload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("prompt", `Ảnh tải lên: ${file.name}`);
    try {
      const img = await api.images.upload(fd);
      appendImages(img);
    } catch (e: any) {
      setError(e.message || "Lỗi khi tải ảnh lên");
    }
  };

  const handleRefFileChange = (file: File) => {
    setRefFile(file);
    setRefPreviewUrl(URL.createObjectURL(file));
  };

  const handleDelete = async (id: string) => {
    await api.images.delete(id).catch(() => {});
    setImages((prev) => prev.filter((i) => i.id !== id));
  };

  const handleVariationFromCard = (img: ImageAsset) => {
    setVariationSource(img);
    setActiveTab("variation");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Thư viện ảnh AI"
        description="Tạo và quản lý hình ảnh marketing bằng Gemini AI"
      />

      {/* ── Control Panel ── */}
      <Card className="mb-6">
        <CardContent className="py-5">
          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
            {([
              { id: "text", label: "Tạo từ văn bản", icon: Wand2 },
              { id: "reference", label: "Từ ảnh mẫu", icon: Upload },
              { id: "variation", label: "Tạo biến thể", icon: RefreshCw },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Text to Image ── */}
          {activeTab === "text" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Mô tả hình ảnh</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey && !generating) handleGenerateText(); }}
                  placeholder="Mô tả chi tiết hình ảnh bạn muốn tạo... (Ctrl+Enter để tạo)"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none"
                  disabled={generating}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-gray-400">Gợi ý:</span>
                  {SAMPLE_PROMPTS.map((sp, i) => (
                    <button key={i} onClick={() => setPrompt(sp)} className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 transition-colors">
                      {sp.length > 45 ? sp.slice(0, 45) + "…" : sp}
                    </button>
                  ))}
                </div>
              </div>

              <StyleRatioPanel
                selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
                selectedRatio={selectedRatio} setSelectedRatio={setSelectedRatio}
                negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
              />

              <div className="flex items-center gap-3">
                <BatchSelector value={batchCount} onChange={setBatchCount} />
                <Button onClick={handleGenerateText} disabled={generating || !prompt.trim()} size="lg" className="ml-auto">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {generating ? "Đang tạo..." : batchCount > 1 ? `Tạo ${batchCount} ảnh` : "Tạo ảnh"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Tab: Reference Image ── */}
          {activeTab === "reference" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Upload zone */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Ảnh mẫu</label>
                  <div
                    onClick={() => refInputRef.current?.click()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleRefFileChange(f); }}
                    onDragOver={(e) => e.preventDefault()}
                    className="relative border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors flex items-center justify-center overflow-hidden"
                    style={{ minHeight: 140 }}
                  >
                    {refPreviewUrl ? (
                      <>
                        <img src={refPreviewUrl} className="h-full w-full object-contain max-h-36" alt="preview" />
                        <button onClick={(e) => { e.stopPropagation(); setRefFile(null); setRefPreviewUrl(null); }} className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-gray-600 hover:bg-white">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-6 px-4">
                        <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">Kéo thả hoặc click để chọn ảnh mẫu</p>
                        <p className="text-[11px] text-gray-400 mt-1">PNG, JPEG, WebP · tối đa 10MB</p>
                      </div>
                    )}
                    <input ref={refInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefFileChange(f); }} />
                  </div>
                </div>

                {/* Prompt */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">Mô tả chỉnh sửa / phong cách</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="VD: Tạo ảnh tương tự với phong cách anime, thêm hiệu ứng ánh sáng..."
                    rows={4}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none"
                    disabled={generating}
                  />
                </div>
              </div>

              <StyleRatioPanel
                selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
                selectedRatio={selectedRatio} setSelectedRatio={setSelectedRatio}
                negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { const inp = document.createElement("input"); inp.type="file"; inp.accept="image/*"; inp.onchange=(e)=>{const f=(e.target as HTMLInputElement).files?.[0]; if(f) handleUpload(f);}; inp.click(); }}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2"
                >
                  <ImageIcon className="h-4 w-4" /> Chỉ tải lên (không AI)
                </button>
                <Button onClick={handleGenerateFromRef} disabled={generating || !prompt.trim() || !refFile} size="lg" className="ml-auto">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  {generating ? "Đang tạo..." : "Tạo từ ảnh mẫu"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Tab: Variations ── */}
          {activeTab === "variation" && (
            <div className="space-y-4">
              {variationSource ? (
                <div className="flex gap-4">
                  <div className="w-32 shrink-0">
                    <p className="text-xs font-medium text-gray-600 mb-1.5">Ảnh gốc</p>
                    <div className="relative rounded-lg overflow-hidden border border-gray-200">
                      <img src={api.images.fileUrl(variationSource.id)} alt="source" className="w-full object-cover" style={{ aspectRatio: "1" }} />
                      <button onClick={() => setVariationSource(null)} className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-gray-600">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Hướng dẫn biến thể (tuỳ chọn)</label>
                    <textarea
                      value={variationPrompt}
                      onChange={(e) => setVariationPrompt(e.target.value)}
                      placeholder="VD: Đổi màu sang tông lạnh, thêm hiệu ứng ánh sáng... (để trống = AI tự sáng tạo)"
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none"
                      disabled={generating}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 text-center">
                  <Images className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">Chọn ảnh muốn tạo biến thể</p>
                  <p className="text-xs text-gray-400">Hover vào ảnh bên dưới → nhấn nút <RefreshCw className="h-3 w-3 inline" /></p>
                </div>
              )}

              {variationSource && (
                <div className="flex items-center gap-3">
                  <BatchSelector value={batchCount} onChange={setBatchCount} />
                  <Button onClick={handleCreateVariations} disabled={generating || !variationSource} size="lg" className="ml-auto">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    {generating ? "Đang tạo..." : `Tạo ${batchCount} biến thể`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 flex items-center gap-2">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Generating indicator */}
          {generating && (
            <div className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-brand-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-brand-800">Gemini AI đang tạo ảnh...</p>
                <p className="text-xs text-brand-600">Thường mất 15–45 giây tùy độ phức tạp</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Gallery Grid ── */}
      {loading && !loaded ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <ImageIcon className="h-14 w-14 text-gray-200 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-500 mb-1">Chưa có ảnh nào</h3>
            <p className="text-sm text-gray-400">Nhập mô tả ở trên và bấm "Tạo ảnh" để bắt đầu</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{images.length} ảnh trong thư viện</p>
            <button onClick={loadImages} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Làm mới
            </button>
          </div>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {images.map((image) => (
              <div key={image.id} className="break-inside-avoid">
                <ImageCard
                  image={image}
                  onPreview={setPreviewImage}
                  onDelete={handleDelete}
                  onVariation={handleVariationFromCard}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <PreviewModal
          image={previewImage}
          onClose={() => setPreviewImage(null)}
          onVariation={handleVariationFromCard}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StyleRatioPanel({ selectedStyle, setSelectedStyle, selectedRatio, setSelectedRatio, negativePrompt, setNegativePrompt }: {
  selectedStyle: string; setSelectedStyle: (v: string) => void;
  selectedRatio: string; setSelectedRatio: (v: string) => void;
  negativePrompt: string; setNegativePrompt: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Style presets */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">Phong cách</label>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_PRESETS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selectedStyle === s.id
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-2 block">Tỉ lệ khung hình</label>
        <div className="flex flex-wrap gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRatio(r.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selectedRatio === r.id
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Negative prompt */}
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">
          Không muốn có <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
        </label>
        <input
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="VD: bạo lực, màu sắc tối, chữ mờ..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function BatchSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Số lượng:</span>
      <div className="flex gap-1">
        {[1, 2, 4].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`h-8 w-8 rounded-lg border text-sm font-medium transition-colors ${
              value === n ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
