"use client";

import { useState } from "react";
import {
  Check,
  X,
  RotateCcw,
  Edit3,
  Eye,
  ChevronDown,
  Sparkles,
  Film,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, PlatformBadge } from "@/components/ui/badge";
import { mockContent, mockCampaigns } from "@/lib/mock-data";
import { ContentPiece } from "@/types";

function VideoScriptPreview({ script }: { script: any }) {
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-800 text-sm">
          {script.title}
        </h4>
        <span className="text-xs text-gray-500">
          {script.duration_seconds}s
        </span>
      </div>
      {script.scenes?.map((scene: any) => (
        <div
          key={scene.scene_number}
          className="border-l-2 border-brand-200 pl-3 py-1"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
              {scene.scene_number}
            </span>
            <span className="text-[10px] text-gray-400">
              {scene.duration_seconds}s
            </span>
            {scene.text_overlay && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                {scene.text_overlay}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            {scene.visual_description}
          </p>
          {scene.voiceover && (
            <p className="text-xs text-gray-500 italic mt-0.5">
              VO: &ldquo;{scene.voiceover}&rdquo;
            </p>
          )}
        </div>
      ))}
      {script.cta && (
        <div className="pt-1 text-xs font-medium text-brand-600">
          CTA: {script.cta}
        </div>
      )}
    </div>
  );
}

function ContentCard({
  content,
  onAction,
}: {
  content: ContentPiece;
  onAction: (action: string) => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const campaign = mockCampaigns.find((c) => c.id === content.campaign_id);
  const isVideoScript = content.content_type === "video_script";

  return (
    <Card className="overflow-hidden">
      <CardContent className="py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={content.platform} />
            <span className="text-xs text-gray-400">
              {content.content_type.replace(/_/g, " ")}
            </span>
            {content.variant_label && (
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                Phiên bản {content.variant_label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-500">
              {content.llm_model?.replace("claude-", "")}
            </span>
            <StatusBadge status={content.status} />
          </div>
        </div>

        {/* Campaign */}
        <p className="text-xs text-gray-400 mb-2">
          {campaign?.name} &middot;{" "}
          {new Date(content.created_at).toLocaleString("vi-VN")}
        </p>

        {/* Content body */}
        <div className="rounded-lg bg-gray-50 p-4">
          {isVideoScript ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Film className="h-4 w-4 text-brand-600" />
                <span className="text-sm font-medium text-gray-800">
                  {content.body_text}
                </span>
              </div>
              {expanded && content.script_json && (
                <VideoScriptPreview script={content.script_json} />
              )}
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
                {expanded ? "Thu gọn" : "Xem kịch bản"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {content.body_text}
            </p>
          )}
        </div>

        {/* Hashtags */}
        {content.hashtags && content.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {content.hashtags.map((h) => (
              <span key={h} className="text-xs text-brand-600">
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Image ad template info */}
        {content.content_type === "image_ad" && content.template_id && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Template: {content.template_id}
            </span>
            {content.rendered_image_url ? (
              <span className="text-xs text-emerald-600">Đã render</span>
            ) : (
              <span className="text-xs text-amber-600">
                Chờ render
              </span>
            )}
          </div>
        )}

        {/* Action buttons - only for pending_review */}
        {content.status === "pending_review" && (
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
            <Button
              variant="success"
              size="sm"
              onClick={() => onAction("approve")}
            >
              <Check className="h-3.5 w-3.5" />
              Duyệt
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => onAction("reject")}
            >
              <X className="h-3.5 w-3.5" />
              Từ chối
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFeedback(!showFeedback)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Yêu cầu sửa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAction("edit")}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Sửa & Duyệt
            </Button>
          </div>
        )}

        {/* Feedback input */}
        {showFeedback && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Góp ý cho AI sửa lại (VD: 'Viết ngắn gọn hơn, thêm emoji')"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
            <Button size="sm">
              <Sparkles className="h-3.5 w-3.5" />
              Tạo lại
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ContentApprovalPage() {
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("pending_review");

  const filtered = mockContent.filter((c) => {
    if (filterPlatform !== "all" && c.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = mockContent.filter(
    (c) => c.status === "pending_review"
  ).length;

  return (
    <div>
      <PageHeader
        title="Duyệt nội dung"
        description={`${pendingCount} nội dung đang chờ duyệt`}
      />

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex gap-2">
          {[
            { key: "all", label: "Tất cả" },
            { key: "pending_review", label: "Chờ duyệt" },
            { key: "approved", label: "Đã duyệt" },
            { key: "scheduled", label: "Đã lên lịch" },
            { key: "published", label: "Đã đăng" },
            { key: "rejected", label: "Từ chối" },
          ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterStatus === key
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <div className="flex gap-1.5">
          {[
            { key: "all", label: "Tất cả nền tảng" },
            { key: "facebook", label: "Facebook" },
            { key: "instagram", label: "Instagram" },
            { key: "threads", label: "Threads" },
            { key: "tiktok", label: "TikTok" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterPlatform(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filterPlatform === key
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content list */}
      <div className="space-y-4">
        {filtered.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            onAction={(action) =>
              console.log(`${action} content ${content.id}`)
            }
          />
        ))}
        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-400">
                Không có nội dung nào phù hợp với bộ lọc
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
