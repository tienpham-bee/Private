"use client";

import { useState, useRef, useEffect } from "react";
import {
  Check,
  Circle,
  Loader2,
  Minus,
  Send,
  SkipForward,
  RefreshCw,
  ChevronDown,
  Film,
  Image as ImageIcon,
  Sparkles,
  Download,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { PlatformBadge, StatusBadge } from "@/components/ui/badge";
import { ContentPlan, ContentPlanItem, ChatMessage } from "@/types";
import { api } from "@/lib/api";
import { GoogleAppAssetEditor, GoogleAppAssets } from "./GoogleAppAssetEditor";

interface GenerationWorkspaceProps {
  plan: ContentPlan;
  briefData: Record<string, unknown>;
  onComplete: () => void;
}

function isPlanItemId(id: string): boolean {
  // Real plan item UUIDs vs manual IDs like "single_1234"
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

interface ImageState {
  prompt: string;
  loading: boolean;
  imageUrl: string | null;
  imageId: string | null;
  error: string | null;
}


function buildAutoPrompt(item: ContentPlanItem, bodyText: string): string {
  const platformLabel: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    threads: "Threads",
  };
  const platform = platformLabel[item.platform] || item.platform;
  const firstLine = bodyText?.split("\n")[0] || item.topic;
  return `Ảnh quảng cáo game mobile cho ${platform}: "${item.topic}". ${firstLine}. Phong cách gaming RPG hiện đại, màu sắc rực rỡ, đồ họa chất lượng cao.`;
}

// ===== Left Panel: Plan Item Queue =====
function PlanItemQueue({
  items,
  activeId,
  onSelect,
}: {
  items: ContentPlanItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const completedCount = items.filter(
    (i) => i.status === "approved" || i.status === "skipped"
  ).length;

  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">Danh sách</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {completedCount}/{items.length} đã hoàn thành
        </p>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
          <div
            className="h-1.5 rounded-full bg-emerald-500 transition-all"
            style={{
              width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={clsx(
                "w-full rounded-lg px-3 py-2 text-left transition-colors",
                isActive
                  ? "border-2 border-brand-500 bg-white shadow-sm"
                  : "border-2 border-transparent hover:bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                {item.status === "pending" && (
                  <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                )}
                {item.status === "generating" && (
                  <Loader2 className="h-4 w-4 text-brand-500 animate-spin shrink-0" />
                )}
                {item.status === "generated" && (
                  <div className="h-4 w-4 rounded-full bg-amber-400 shrink-0" />
                )}
                {item.status === "approved" && (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
                {item.status === "skipped" && (
                  <Minus className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <span
                  className={clsx(
                    "text-xs font-medium truncate",
                    item.status === "approved"
                      ? "text-emerald-700"
                      : item.status === "skipped"
                        ? "text-gray-400 line-through"
                        : "text-gray-700"
                  )}
                >
                  {item.topic}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 ml-6">
                <PlatformBadge platform={item.platform} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Video Script Preview =====
function VideoScriptPreview({ script }: { script: Record<string, unknown> }) {
  const scenes = (script.scenes as Array<Record<string, unknown>>) || [];
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 text-sm">
          {script.title as string}
        </h4>
        <span className="text-xs text-gray-500">
          {script.duration_seconds as number}s
        </span>
      </div>
      {scenes.map((scene) => (
        <div
          key={scene.scene_number as number}
          className="border-l-2 border-brand-200 pl-3 py-1"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
              {scene.scene_number as number}
            </span>
            <span className="text-[10px] text-gray-400">
              {scene.duration_seconds as number}s
            </span>
            {!!scene.text_overlay && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                {scene.text_overlay as string}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            {scene.visual_description as string}
          </p>
          {!!scene.voiceover && (
            <p className="text-xs text-gray-500 italic mt-0.5">
              VO: &ldquo;{scene.voiceover as string}&rdquo;
            </p>
          )}
        </div>
      ))}
      {!!script.cta && (
        <div className="pt-1 text-xs font-medium text-brand-600">
          CTA: {script.cta as string}
        </div>
      )}
    </div>
  );
}

// ===== Image Generation Sidebar =====
function ImageGenSidebar({
  item,
  imageState,
  onGenerateImage,
}: {
  item: ContentPlanItem;
  imageState: ImageState;
  onGenerateImage: (itemId: string, prompt: string) => void;
}) {
  const [prompt, setPrompt] = useState(imageState.prompt);

  // Sync prompt when parent updates it (after text generation)
  useEffect(() => {
    if (imageState.prompt) setPrompt(imageState.prompt);
  }, [imageState.prompt]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-purple-600 shrink-0" />
        <span className="text-sm font-semibold text-purple-800">Tạo ảnh</span>
        {imageState.loading && (
          <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            Đang tạo...
          </span>
        )}
        {imageState.imageUrl && !imageState.loading && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            ✓ Đã có ảnh
          </span>
        )}
      </div>

      {/* Image result */}
      {imageState.imageUrl && !imageState.loading && (
        <div className="rounded-xl overflow-hidden border border-purple-200 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageState.imageUrl}
            alt="Ảnh được tạo bởi AI"
            className="w-full object-contain"
          />
          <div className="px-3 py-2 border-t border-purple-100 flex gap-2">
            <a
              href={imageState.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-3 w-3" />
              Tải về
            </a>
            <a
              href={imageState.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs text-purple-700 hover:bg-purple-100 transition-colors"
            >
              <ImageIcon className="h-3 w-3" />
              Xem full
            </a>
          </div>
        </div>
      )}

      {/* Loading placeholder */}
      {imageState.loading && (
        <div className="rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
          <p className="text-sm font-medium text-purple-600">Gemini đang vẽ...</p>
          <p className="text-xs text-purple-400">~15-20 giây</p>
        </div>
      )}

      {/* Error */}
      {imageState.error && !imageState.loading && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{imageState.error}</p>
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1.5 block uppercase tracking-wide">
          Mô tả ảnh (Prompt)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="Mô tả ảnh bạn muốn tạo..."
          disabled={imageState.loading}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-300 resize-none disabled:opacity-50"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={() => onGenerateImage(item.id, prompt)}
        disabled={imageState.loading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {imageState.loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Đang tạo ảnh...</>
        ) : (
          <><Sparkles className="h-4 w-4" />{imageState.imageUrl ? "Tạo lại ảnh" : "Tạo ảnh với Gemini AI"}</>
        )}
      </button>
    </div>
  );
}

// ===== Center Panel: Content Preview =====
function ContentPreview({
  item,
  generatedContent,
  imageState,
  contentPieceId,
  onApprove,
  onGenerate,
  onRegenerate,
  onSkip,
  onGenerateImage,
  onEditSaved,
}: {
  item: ContentPlanItem | null;
  generatedContent: Record<string, unknown> | null;
  imageState: ImageState | null;
  contentPieceId: string | null;
  onGenerate: () => void;
  onApprove: () => void;
  onRegenerate: () => void;
  onSkip: () => void;
  onGenerateImage: (itemId: string, prompt: string) => void;
  onEditSaved: (text: string, hashtags: string[]) => void;
}) {
  const [scriptExpanded, setScriptExpanded] = useState(true);
  const [editText, setEditText] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [saving, setSaving] = useState(false);

  const origBody = (generatedContent?.body_text as string) || "";
  const origHashtags = Array.isArray(generatedContent?.hashtags)
    ? (generatedContent!.hashtags as string[]).join(", ")
    : "";

  // Sync edit fields when generatedContent changes (new generation)
  useEffect(() => {
    setEditText(origBody);
    setEditHashtags(origHashtags);
  }, [origBody, origHashtags]);

  const isDirty = editText !== origBody || editHashtags !== origHashtags;

  const handleSave = async () => {
    if (!contentPieceId) return;
    setSaving(true);
    try {
      const hashtags = editHashtags
        .split(/[,\n]/)
        .map((h) => h.trim())
        .filter(Boolean);
      await import("@/lib/api").then(({ api }) =>
        api.content.update(contentPieceId, { body_text: editText, hashtags })
      );
      onEditSaved(editText, hashtags);
    } finally {
      setSaving(false);
    }
  };

  if (!item) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400 text-sm">
        Chọn một mục từ danh sách bên trái để bắt đầu
      </div>
    );
  }

  if (item.status === "pending") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800">{item.topic}</h3>
          <p className="text-sm text-gray-500 mt-1">{item.description}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <PlatformBadge platform={item.platform} />
            <StatusBadge status={item.content_type} />
          </div>
        </div>
        <Button onClick={onGenerate} size="lg">
          Bắt đầu tạo nội dung
        </Button>
      </div>
    );
  }

  if (item.status === "generating") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
        <p className="text-sm text-gray-600">AI đang tạo nội dung...</p>
      </div>
    );
  }

  if (item.status === "skipped") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <Minus className="h-10 w-10 text-gray-400" />
        <p className="text-sm text-gray-500">Đã bỏ qua mục này</p>
      </div>
    );
  }

  const isApproved = item.status === "approved";
  const isVideoScript = item.content_type === "video_script";
  const isGoogleAppAsset = item.content_type === "google_app_asset";

  // ---- Google App Campaign: special editor ----
  if (isGoogleAppAsset && generatedContent) {
    const raw = generatedContent.script_json as Record<string, unknown> | null;
    const initialAssets: GoogleAppAssets = {
      headlines: (raw?.headlines as string[]) || [],
      descriptions: (raw?.descriptions as string[]) || [],
      call_to_action: (raw?.call_to_action as string) || "DOWNLOAD",
    };
    return (
      <GoogleAppAssetEditor
        contentPieceId={contentPieceId}
        topic={item.topic}
        initialAssets={initialAssets}
        isApproved={isApproved}
        onApprove={onApprove}
        onRegenerate={onRegenerate}
        onSaved={(assets) => {
          onEditSaved(
            `Google App Campaign: ${item.topic}`,
            []
          );
          // Update generatedContent via parent's onEditSaved is enough —
          // actual data saved to DB inside GoogleAppAssetEditor
          void assets;
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: text content */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <PlatformBadge platform={item.platform} />
          <StatusBadge status={item.content_type} />
          {isApproved && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <Check className="h-3 w-3" />
              Đã duyệt
            </span>
          )}
          {isDirty && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Chưa lưu
            </span>
          )}
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-3">{item.topic}</h3>

        {/* Editable body */}
        <div className="mb-3 flex-1">
          {isVideoScript && generatedContent?.script_json ? (
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                placeholder="Mô tả video..."
                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none transition-colors"
              />
              <button
                onClick={() => setScriptExpanded(!scriptExpanded)}
                className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
              >
                <Film className="h-3 w-3" />
                <ChevronDown className={clsx("h-3 w-3 transition-transform", scriptExpanded && "rotate-180")} />
                {scriptExpanded ? "Thu gọn kịch bản" : "Xem kịch bản"}
              </button>
              {scriptExpanded && (
                <VideoScriptPreview script={generatedContent.script_json as Record<string, unknown>} />
              )}
            </div>
          ) : (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={7}
              placeholder="Nội dung bài viết..."
              className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none transition-colors"
            />
          )}
        </div>

        {/* Editable hashtags */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">Hashtags</label>
          <input
            value={editHashtags}
            onChange={(e) => setEditHashtags(e.target.value)}
            placeholder="#hashtag1, #hashtag2, ..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-brand-600 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-colors"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
          {isDirty ? (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Lưu thay đổi
              </Button>
              <Button variant="ghost" onClick={() => { setEditText(origBody); setEditHashtags(origHashtags); }} disabled={saving}>
                Hoàn tác
              </Button>
            </>
          ) : (
            <>
              {!isApproved && (
                <Button variant="success" onClick={onApprove}>
                  <Check className="h-4 w-4" />
                  Duyệt
                </Button>
              )}
              <Button variant="secondary" onClick={onRegenerate} className="text-orange-600 border-orange-300 hover:bg-orange-50">
                <RefreshCw className="h-4 w-4" />
                Tạo lại
              </Button>
              {!isApproved && (
                <Button variant="ghost" onClick={onSkip}>
                  <SkipForward className="h-4 w-4" />
                  Bỏ qua
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: image generation panel */}
      {imageState && (
        <div className="w-[380px] shrink-0 overflow-y-auto px-4 py-5">
          <ImageGenSidebar
            item={item}
            imageState={imageState}
            onGenerateImage={onGenerateImage}
          />
        </div>
      )}
    </div>
  );
}

// ===== Right Panel: Chat =====
function ChatPanel({
  messages,
  loading,
  onSend,
}: {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  const quickActions = ["Ngắn hơn", "Thêm emoji", "Đổi CTA", "Nghiêm túc hơn"];

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">Chat với AI</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-8">
            Gửi tin nhắn để yêu cầu AI chỉnh sửa nội dung
          </p>
        )}
        {messages
          .filter((m) => m.role !== "system")
          .map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={clsx(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-800"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.content_snapshot && (
                  <details className="mt-1">
                    <summary className="text-[10px] cursor-pointer opacity-70 hover:opacity-100">
                      Xem thay đổi
                    </summary>
                    <pre className="text-[10px] mt-1 bg-white/10 rounded p-1 whitespace-pre-wrap">
                      {JSON.stringify(msg.content_snapshot, null, 2).slice(0, 200)}...
                    </pre>
                  </details>
                )}
                <span
                  className={clsx(
                    "block text-[10px] mt-1",
                    msg.role === "user" ? "text-white/60" : "text-gray-400"
                  )}
                >
                  {new Date(msg.created_at).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-2 flex flex-wrap gap-1.5">
        {quickActions.map((action) => (
          <button
            key={action}
            onClick={() => onSend(action)}
            className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            {action}
          </button>
        ))}
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Nhập yêu cầu chỉnh sửa..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Main Workspace =====
export function GenerationWorkspace({
  plan,
  briefData,
  onComplete,
}: GenerationWorkspaceProps) {
  const [items, setItems] = useState<ContentPlanItem[]>(plan.items);
  const [activeItemId, setActiveItemId] = useState<string | null>(plan.items[0]?.id || null);
  const [generatedContents, setGeneratedContents] = useState<Record<string, Record<string, unknown>>>({});
  // contentPieceIds: maps local item.id → real DB content_piece_id
  const [contentPieceIds, setContentPieceIds] = useState<Record<string, string>>({});
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [chatLoading, setChatLoading] = useState(false);
  const [imageStates, setImageStates] = useState<Record<string, ImageState>>({});
  const [generateError, setGenerateError] = useState<string | null>(null);

  const activeItem = items.find((i) => i.id === activeItemId) || null;
  const activeChatMessages = activeItemId ? (chatMessages[activeItemId] || []) : [];

  const updateItemStatus = (itemId: string, status: ContentPlanItem["status"]) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status } : i)));
  };

  const moveToNextPending = () => {
    const next = items.find((i) => i.status === "pending" && i.id !== activeItemId);
    if (next) setActiveItemId(next.id);
  };

  const handleGenerate = async () => {
    if (!activeItemId || !activeItem) return;
    updateItemStatus(activeItemId, "generating");
    setGenerateError(null);
    try {
      const result = await api.generation.quickGenerate({
        platform: activeItem.platform,
        content_type: activeItem.content_type,
        topic: activeItem.topic,
        description: activeItem.description || undefined,
        campaign_id: plan.campaign_id || undefined,
        plan_item_id: isPlanItemId(activeItem.id) ? activeItem.id : undefined,
      });

      const piece = result.content_piece;
      const content: Record<string, unknown> = {
        body_text: piece.body_text || "",
        hashtags: piece.hashtags || [],
        script_json: piece.script_json || null,
      };

      setGeneratedContents((prev) => ({ ...prev, [activeItemId]: content }));
      setContentPieceIds((prev) => ({ ...prev, [activeItemId]: piece.id }));

      // Load AI messages from response
      const msgs: ChatMessage[] = (result.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        content_snapshot: m.content_snapshot,
        created_at: m.created_at,
      }));
      setChatMessages((prev) => ({ ...prev, [activeItemId]: msgs }));

      updateItemStatus(activeItemId, "generated");

      // Pre-populate image prompt
      setImageStates((prev) => ({
        ...prev,
        [activeItemId]: {
          prompt: buildAutoPrompt(activeItem, piece.body_text || ""),
          loading: false,
          imageUrl: piece.rendered_image_url || null,
          imageId: null,
          error: null,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tạo nội dung";
      setGenerateError(msg);
      updateItemStatus(activeItemId, "pending");
    }
  };

  const handleApprove = async () => {
    if (!activeItemId) return;
    const pieceId = contentPieceIds[activeItemId];
    if (pieceId) {
      try {
        await api.generation.approve(pieceId);
      } catch {
        // Non-blocking: still mark approved in UI
      }
    }
    updateItemStatus(activeItemId, "approved");
    setTimeout(() => moveToNextPending(), 300);
  };

  const handleRegenerate = async () => {
    if (!activeItemId || !activeItem) return;
    updateItemStatus(activeItemId, "generating");
    setGenerateError(null);
    const pieceId = contentPieceIds[activeItemId];

    try {
      let result: any;
      if (pieceId) {
        result = await api.generation.regenerateFresh(pieceId);
      } else {
        result = await api.generation.quickGenerate({
          platform: activeItem.platform,
          content_type: activeItem.content_type,
          topic: activeItem.topic,
          description: activeItem.description || undefined,
        });
      }

      const piece = result.content_piece;
      const content: Record<string, unknown> = {
        body_text: piece.body_text || "",
        hashtags: piece.hashtags || [],
        script_json: piece.script_json || null,
      };

      setGeneratedContents((prev) => ({ ...prev, [activeItemId]: content }));
      setContentPieceIds((prev) => ({ ...prev, [activeItemId]: piece.id }));

      const msgs: ChatMessage[] = (result.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        content_snapshot: m.content_snapshot,
        created_at: m.created_at,
      }));
      setChatMessages((prev) => ({ ...prev, [activeItemId]: msgs }));
      updateItemStatus(activeItemId, "generated");

      setImageStates((prev) => ({
        ...prev,
        [activeItemId]: {
          ...(prev[activeItemId] || {}),
          prompt: buildAutoPrompt(activeItem, piece.body_text || ""),
          loading: false,
          imageUrl: null,
          imageId: null,
          error: null,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tạo lại";
      setGenerateError(msg);
      updateItemStatus(activeItemId, "generated");
    }
  };

  const handleSkip = () => {
    if (!activeItemId) return;
    updateItemStatus(activeItemId, "skipped");
    setTimeout(() => moveToNextPending(), 300);
  };

  const handleGenerateImage = async (itemId: string, prompt: string) => {
    setImageStates((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), prompt, loading: true, error: null },
    }));
    try {
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plan.campaign_id);
      const result = await api.images.generate({
        prompt,
        campaign_id: isValidUuid ? plan.campaign_id : undefined,
        content_piece_id: contentPieceIds[itemId] || undefined,
      });
      setImageStates((prev) => ({
        ...prev,
        [itemId]: { prompt, loading: false, imageUrl: api.images.fileUrl(result.id), imageId: result.id, error: null },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tạo ảnh";
      setImageStates((prev) => ({
        ...prev,
        [itemId]: { ...(prev[itemId] || {}), loading: false, error: msg },
      }));
    }
  };

  const handleChatSend = async (text: string) => {
    if (!activeItemId) return;
    const pieceId = contentPieceIds[activeItemId];

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      content_snapshot: null,
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => ({
      ...prev,
      [activeItemId]: [...(prev[activeItemId] || []), userMsg],
    }));

    if (!pieceId) {
      const errMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: "Vui lòng tạo nội dung trước khi yêu cầu chỉnh sửa.",
        content_snapshot: null,
        created_at: new Date().toISOString(),
      };
      setChatMessages((prev) => ({
        ...prev,
        [activeItemId]: [...(prev[activeItemId] || []), errMsg],
      }));
      return;
    }

    setChatLoading(true);
    try {
      const result = await api.generation.chat(pieceId, text);
      const piece = result.content_piece;

      // Update displayed content
      setGeneratedContents((prev) => ({
        ...prev,
        [activeItemId]: {
          ...prev[activeItemId],
          body_text: piece.body_text || prev[activeItemId]?.body_text || "",
          hashtags: piece.hashtags || prev[activeItemId]?.hashtags || [],
          script_json: piece.script_json || prev[activeItemId]?.script_json || null,
        },
      }));

      const aiMsg: ChatMessage = {
        id: result.message.id,
        role: "assistant",
        content: `Đã cập nhật nội dung theo yêu cầu của bạn.`,
        content_snapshot: result.message.content_snapshot,
        created_at: result.message.created_at,
      };
      setChatMessages((prev) => ({
        ...prev,
        [activeItemId]: [...(prev[activeItemId] || []), aiMsg],
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi chat với AI";
      const errMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `Lỗi: ${msg}`,
        content_snapshot: null,
        created_at: new Date().toISOString(),
      };
      setChatMessages((prev) => ({
        ...prev,
        [activeItemId]: [...(prev[activeItemId] || []), errMsg],
      }));
    } finally {
      setChatLoading(false);
    }
  };

  const allDone = items.every((i) => i.status === "approved" || i.status === "skipped");

  return (
    <div className="space-y-4">
      {generateError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Lỗi tạo nội dung</p>
            <p className="text-xs text-red-600 mt-0.5">{generateError}</p>
          </div>
          <button onClick={() => setGenerateError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {allDone && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-800">Đã hoàn thành tất cả nội dung!</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {items.filter((i) => i.status === "approved").length} nội dung đã duyệt,{" "}
              {items.filter((i) => i.status === "skipped").length} đã bỏ qua
            </p>
          </div>
          <Button variant="success" onClick={onComplete}>Hoàn tất chiến dịch</Button>
        </div>
      )}

      <div className="flex h-[calc(100vh-280px)] min-h-[500px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <PlanItemQueue items={items} activeId={activeItemId} onSelect={setActiveItemId} />

        <ContentPreview
          item={activeItem}
          generatedContent={activeItemId ? generatedContents[activeItemId] || null : null}
          imageState={activeItemId ? imageStates[activeItemId] || null : null}
          contentPieceId={activeItemId ? contentPieceIds[activeItemId] || null : null}
          onGenerate={handleGenerate}
          onApprove={handleApprove}
          onRegenerate={handleRegenerate}
          onSkip={handleSkip}
          onGenerateImage={handleGenerateImage}
          onEditSaved={(text, hashtags) => {
            if (!activeItemId) return;
            setGeneratedContents((prev) => ({
              ...prev,
              [activeItemId]: { ...prev[activeItemId], body_text: text, hashtags },
            }));
          }}
        />

        <ChatPanel
          messages={activeChatMessages}
          loading={chatLoading}
          onSend={handleChatSend}
        />
      </div>
    </div>
  );
}
