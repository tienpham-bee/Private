"use client";

import { use, useEffect, useState, useCallback } from "react";
import { ArrowLeft, Sparkles, Loader2, Plus, CheckCircle2, Clock, Circle, ChevronDown, ChevronUp, Calendar, Send, Image as ImageIcon, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, PlatformBadge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

const contentTypeLabels: Record<string, string> = {
  social_post: "Bài đăng",
  video_script: "Kịch bản video",
  image_ad: "Quảng cáo hình ảnh",
  caption: "Chú thích",
};

// ===== Inline Content Preview =====
function ContentPreview({ piece, images }: { piece: any; images: any[] }) {
  return (
    <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
      {/* Text content */}
      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{piece.body_text}</p>
      {piece.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {piece.hashtags.map((h: string) => (
            <span key={h} className="text-xs font-medium text-brand-600">{h}</span>
          ))}
        </div>
      )}
      {piece.llm_model && (
        <div>
          <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
            {piece.llm_model.replace("claude-", "")}
          </span>
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className="pt-1 border-t border-gray-200">
          <div className="flex items-center gap-1.5 mb-2">
            <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs font-medium text-gray-600">Ảnh đã tạo ({images.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {images.map((img: any) => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-purple-100 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={api.images.fileUrl(img.id)}
                  alt={img.prompt}
                  className="w-full object-cover aspect-video"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={api.images.fileUrl(img.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-800 hover:bg-white"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Xem full
                  </a>
                </div>
                <div className="px-2 py-1 border-t border-purple-100">
                  <p className="text-[10px] text-gray-500 truncate" title={img.prompt}>{img.prompt}</p>
                  <p className="text-[10px] text-gray-400">{img.width}×{img.height}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Schedule Inline Form =====
function ScheduleForm({
  piece,
  platformAccounts,
  onScheduled,
  onCancel,
}: {
  piece: any;
  platformAccounts: any[];
  onScheduled: () => void;
  onCancel: () => void;
}) {
  const matchingAccounts = platformAccounts.filter(
    (a) => a.platform === piece.platform
  );

  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [accountId, setAccountId] = useState(matchingAccounts[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSchedule = async () => {
    if (!accountId) {
      setError("Chưa có tài khoản nền tảng. Vui lòng thêm tài khoản trong Cài đặt.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.schedule.create({
        content_id: piece.id,
        platform_account_id: accountId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        timezone: "Asia/Ho_Chi_Minh",
      });
      onScheduled();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lên lịch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <p className="text-sm font-medium text-blue-800">Lên lịch đăng bài</p>

      {matchingAccounts.length === 0 ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded p-2">
          Chưa có tài khoản {piece.platform} nào được kết nối.{" "}
          <Link href="/platforms" className="underline">Thêm tài khoản</Link>
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Thời gian đăng</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Tài khoản</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm"
              >
                {matchingAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.account_name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSchedule} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Calendar className="h-3.5 w-3.5" />}
              Xác nhận lịch
            </Button>
            <Button size="sm" variant="secondary" onClick={onCancel} disabled={loading}>
              Hủy
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ===== Plan Item Row (expandable) =====
function PlanItemRow({
  item,
  campaignId,
  contentPiece,
  images,
  platformAccounts,
  onRefresh,
}: {
  item: any;
  campaignId: string;
  contentPiece: any | null;
  images: any[];
  platformAccounts: any[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const hasContent = !!contentPiece;
  const isDone = item.status === "approved" || item.status === "generated";
  const isApproved = item.status === "approved" || contentPiece?.status === "approved";
  const isScheduled = contentPiece?.status === "scheduled";
  const isPublished = contentPiece?.status === "published";

  const handleApprove = async () => {
    if (!contentPiece) return;
    setApproving(true);
    try {
      await api.generation.approve(contentPiece.id);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xoá mục này khỏi kế hoạch?")) return;
    setDeleting(true);
    try {
      await api.contentPlan.deleteItem(item.id);
      onRefresh();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Main row */}
      <div
        className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => hasContent && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Status icon */}
          <div className="shrink-0">
            {isPublished ? (
              <Send className="h-5 w-5 text-blue-500" />
            ) : isScheduled ? (
              <Clock className="h-5 w-5 text-amber-500" />
            ) : isApproved ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : isDone ? (
              <div className="h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">AI</span>
              </div>
            ) : (
              <Circle className="h-5 w-5 text-gray-300" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <PlatformBadge platform={item.platform} />
              <span className="text-xs text-gray-500">
                {contentTypeLabels[item.content_type] || item.content_type}
              </span>
              {item.phase && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                  {item.phase}
                </span>
              )}
              {isScheduled && contentPiece?.scheduled_at && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  <Clock className="h-2.5 w-2.5" />
                  Đã lên lịch
                </span>
              )}
              {isPublished && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  Đã đăng
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">{item.topic}</p>
          </div>

          {/* Expand chevron if has content */}
          {hasContent && (
            <div className="ml-2 shrink-0 text-gray-400">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="ml-4 shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isDone ? (
            <Link href={`/campaigns/${campaignId}/generate?item_id=${item.id}`}>
              <Button variant="ghost" size="sm">Xem / Sửa</Button>
            </Link>
          ) : (
            <Link href={`/campaigns/${campaignId}/generate?item_id=${item.id}`}>
              <Button variant="success" size="sm">
                <Sparkles className="h-3.5 w-3.5" />
                Tạo nội dung
              </Button>
            </Link>
          )}
          {!isScheduled && !isPublished && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Xoá khỏi kế hoạch"
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && hasContent && (
        <div className="px-5 pb-4">
          <ContentPreview piece={contentPiece} images={images} />

          {/* Action row */}
          {!isApproved && !isScheduled && !isPublished && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="success"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Duyệt bài
              </Button>
            </div>
          )}

          {isApproved && !isScheduled && !isPublished && !showSchedule && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-emerald-600 font-medium">Đã duyệt</span>
              <Button size="sm" variant="secondary" onClick={() => setShowSchedule(true)}>
                <Calendar className="h-3.5 w-3.5" />
                Lên lịch đăng
              </Button>
            </div>
          )}

          {showSchedule && contentPiece && (
            <ScheduleForm
              piece={contentPiece}
              platformAccounts={platformAccounts}
              onScheduled={() => {
                setShowSchedule(false);
                onRefresh();
              }}
              onCancel={() => setShowSchedule(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ===== Main Page =====
export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [contentMap, setContentMap] = useState<Record<string, any>>({});
  const [imageMap, setImageMap] = useState<Record<string, any[]>>({}); // content_piece_id → images[]
  const [platformAccounts, setPlatformAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const [camp, allContent, accounts, allImages] = await Promise.all([
        api.campaigns.get(id),
        api.content.list({ campaign_id: id }),
        api.platforms.list().catch(() => [] as any[]),
        api.images.list({ campaign_id: id }).catch(() => [] as any[]),
      ]);
      setCampaign(camp);
      setPlatformAccounts(accounts);

      // Build content map: id → piece
      const map: Record<string, any> = {};
      (allContent as any[]).forEach((c: any) => { map[c.id] = c; });
      setContentMap(map);

      // Build image map: content_piece_id → images[]
      const imgMap: Record<string, any[]> = {};
      (allImages as any[]).forEach((img: any) => {
        if (img.content_piece_id) {
          if (!imgMap[img.content_piece_id]) imgMap[img.content_piece_id] = [];
          imgMap[img.content_piece_id].push(img);
        }
      });
      setImageMap(imgMap);

      if (camp?.brand_id) {
        api.brands.get(camp.brand_id).then(setBrand).catch(() => {});
      }
      // Load plan (may not exist)
      api.contentPlan.get(id).then(setPlan).catch(() => {});
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (notFound || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500">Không tìm thấy chiến dịch</p>
        <Link href="/campaigns">
          <Button variant="secondary">Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  const planItems: any[] = plan?.items || [];
  const doneCount = planItems.filter(
    (i: any) => i.status === "approved" || i.status === "generated"
  ).length;
  const totalItems = planItems.length;

  // Count by status
  const approvedCount = planItems.filter((i: any) => {
    const piece = i.content_piece_id ? contentMap[i.content_piece_id] : null;
    return piece?.status === "approved" || i.status === "approved";
  }).length;
  const scheduledCount = planItems.filter((i: any) => {
    const piece = i.content_piece_id ? contentMap[i.content_piece_id] : null;
    return piece?.status === "scheduled";
  }).length;

  return (
    <div>
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <PageHeader
        title={campaign.name}
        description={`${brand?.game_name ? brand.game_name + " — " : ""}${campaign.description || ""}`}
        actions={
          <Link href={`/campaigns/${id}/generate`}>
            <Button variant="success">
              <Plus className="h-4 w-4" />
              Tạo bài thêm
            </Button>
          </Link>
        }
      />

      {/* Campaign Info */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase text-gray-400">Trạng thái</p>
            <div className="mt-1"><StatusBadge status={campaign.status} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase text-gray-400">Thời gian</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {campaign.start_date} → {campaign.end_date}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase text-gray-400">Nền tảng</p>
            <div className="mt-1 flex gap-1 flex-wrap">
              {campaign.target_platforms.map((p: string) => (
                <PlatformBadge key={p} platform={p} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase text-gray-400">Tiến độ</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {doneCount}/{totalItems} đã tạo
            </p>
            {approvedCount > 0 && (
              <p className="text-xs text-emerald-600 mt-0.5">{approvedCount} đã duyệt{scheduledCount > 0 ? `, ${scheduledCount} lên lịch` : ""}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content Plan Items */}
      {planItems.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Kế hoạch nội dung</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nhấn "Tạo nội dung" để AI viết. Nhấn vào bài đã tạo để duyệt và lên lịch.
                </p>
              </div>
              {totalItems > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 rounded-full bg-gray-200">
                    <div
                      className="h-1.5 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(doneCount / totalItems) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{doneCount}/{totalItems}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <div>
            {planItems.map((item: any) => (
              <PlanItemRow
                key={item.id}
                item={item}
                campaignId={id}
                contentPiece={item.content_piece_id ? contentMap[item.content_piece_id] || null : null}
                images={item.content_piece_id ? (imageMap[item.content_piece_id] || []) : []}
                platformAccounts={platformAccounts}
                onRefresh={load}
              />
            ))}
          </div>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Chưa có kế hoạch nội dung
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Tạo bài đăng trực tiếp hoặc quay lại để lên kế hoạch
            </p>
            <Link href={`/campaigns/${id}/generate`}>
              <Button variant="success">
                <Sparkles className="h-4 w-4" />
                Tạo nội dung ngay
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
