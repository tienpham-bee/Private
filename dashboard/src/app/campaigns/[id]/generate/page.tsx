"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import { GenerationWorkspace } from "@/components/campaign/GenerationWorkspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ContentPlan, ContentPlanItem } from "@/types";

// ===== Manual Setup Form (when no item_id provided) =====
function ManualSetup({
  targetPlatforms,
  onStart,
  onBack,
}: {
  targetPlatforms: string[];
  onStart: (items: ContentPlanItem[]) => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<ContentPlanItem[]>([
    {
      id: `single_${Date.now()}`,
      order_index: 0,
      phase: null,
      platform: targetPlatforms[0] || "facebook",
      content_type: "social_post",
      topic: "",
      description: "",
      suggested_date: null,
      template_id: null,
      status: "pending",
      content_piece_id: null,
    },
  ]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: `single_${Date.now()}_${prev.length}`,
        order_index: prev.length,
        phase: null,
        platform: targetPlatforms[0] || "facebook",
        content_type: "social_post",
        topic: "",
        description: "",
        suggested_date: null,
        template_id: null,
        status: "pending",
        content_piece_id: null,
      },
    ]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const update = (id: string, field: string, value: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const canStart = items.every((i) => i.topic.trim());

  const contentTypeOptions = [
    { value: "social_post", label: "Bài đăng" },
    { value: "video_script", label: "Kịch bản video" },
    { value: "image_ad", label: "Quảng cáo hình ảnh" },
    { value: "google_app_asset", label: "🎯 Google App Campaign" },
    { value: "caption", label: "Chú thích" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Tạo bài thêm</h2>
            <p className="text-sm text-gray-500 mt-0.5">Nhập chủ đề, AI sẽ viết nội dung</p>
          </div>
          <Button variant="secondary" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" />
            Thêm bài
          </Button>
        </CardContent>
      </Card>

      {items.map((item, idx) => (
        <Card key={item.id}>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Bài #{idx + 1}</span>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nền tảng</label>
                <select
                  value={item.platform}
                  onChange={(e) => {
                    const p = e.target.value;
                    update(item.id, "platform", p);
                    if (p === "google_app_campaigns") update(item.id, "content_type", "google_app_asset");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {targetPlatforms.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                  {!targetPlatforms.includes("google_app_campaigns") && (
                    <option value="google_app_campaigns">Google App Campaigns</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Loại nội dung</label>
                <select
                  value={item.content_type}
                  onChange={(e) => update(item.id, "content_type", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {contentTypeOptions.map((ct) => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Chủ đề *</label>
              <input
                type="text"
                value={item.topic}
                onChange={(e) => update(item.id, "topic", e.target.value)}
                placeholder="VD: Ra mắt Season 5, tạo hype cho người chơi mới..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mô tả thêm</label>
              <textarea
                value={item.description || ""}
                onChange={(e) => update(item.id, "description", e.target.value)}
                placeholder="Chi tiết thêm để AI hiểu ý bạn hơn..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Button>
        <Button onClick={() => onStart(items)} disabled={!canStart} size="lg">
          <Sparkles className="h-4 w-4" />
          Bắt đầu tạo nội dung
        </Button>
      </div>
    </div>
  );
}

// ===== Main Page =====
export default function CampaignGeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item_id");

  const [campaign, setCampaign] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [showSetup, setShowSetup] = useState(!itemId); // skip setup if item_id provided

  useEffect(() => {
    api.campaigns.get(id)
      .then((camp) => {
        setCampaign(camp);
        if (camp?.brand_id) {
          api.brands.get(camp.brand_id).then(setBrand).catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // When item_id provided, build plan from that plan item
  useEffect(() => {
    if (!itemId) return;
    api.contentPlan.get(id)
      .then((contentPlan) => {
        const item = contentPlan.items?.find((i: any) => i.id === itemId);
        if (item) {
          const singlePlan: ContentPlan = {
            id: contentPlan.id,
            campaign_id: id,
            status: "confirmed",
            ai_reasoning: null,
            phases: null,
            items: [item],
            created_at: new Date().toISOString(),
          };
          setPlan(singlePlan);
          setShowSetup(false);
        }
      })
      .catch(() => {});
  }, [id, itemId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-gray-500">Không tìm thấy chiến dịch</p>
        <Link href="/campaigns"><Button variant="secondary">Quay lại</Button></Link>
      </div>
    );
  }

  const briefData: Record<string, unknown> = {
    brand_id: campaign.brand_id,
    brand_name: brand?.game_name,
    name: campaign.name,
    description: campaign.description,
    objectives: campaign.objectives || [],
    key_message: campaign.key_message || campaign.description,
    product_highlights: campaign.product_highlights || [],
    platforms: campaign.target_platforms,
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    posting_frequency: campaign.posting_frequency,
    ai_instructions: campaign.ai_instructions || "",
  };

  return (
    <div>
      <Link
        href={`/campaigns/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại chiến dịch
      </Link>

      {/* Campaign header */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {itemId ? "Tạo nội dung" : "Tạo bài thêm"} — {campaign.name}
            </h1>
            <p className="text-sm text-gray-500">
              {brand?.game_name && `${brand.game_name} · `}
              {campaign.start_date} → {campaign.end_date}
            </p>
          </div>
        </div>
      </div>

      {/* Show setup form OR generation workspace */}
      {showSetup && !plan && (
        <ManualSetup
          targetPlatforms={campaign.target_platforms}
          onStart={(items) => {
            setPlan({
              id: `manual_${Date.now()}`,
              campaign_id: id,
              status: "confirmed",
              ai_reasoning: null,
              phases: null,
              items,
              created_at: new Date().toISOString(),
            });
            setShowSetup(false);
          }}
          onBack={() => window.history.back()}
        />
      )}

      {/* Loading item from plan */}
      {itemId && !plan && !loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        </div>
      )}

      {plan && (
        <GenerationWorkspace
          plan={plan}
          briefData={briefData}
          onComplete={() => {
            window.location.href = `/campaigns/${id}`;
          }}
        />
      )}
    </div>
  );
}
