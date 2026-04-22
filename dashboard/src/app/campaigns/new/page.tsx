"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CampaignBriefStep } from "@/components/campaign/CampaignBriefStep";
import { ContentPlanStep } from "@/components/campaign/ContentPlanStep";
import { api } from "@/lib/api";

const steps = [
  { number: 1, label: "Brief chiến dịch" },
  { number: 2, label: "Kế hoạch nội dung" },
];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [briefData, setBriefData] = useState<Record<string, unknown> | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleBriefNext = async (data: Record<string, unknown>) => {
    setCreating(true);
    setCreateError("");
    try {
      const campaign = await api.campaigns.create({
        brand_id: data.brand_id,
        name: data.name,
        description: data.description || null,
        target_platforms: data.platforms,
        content_types: ["social_post", "video_script", "image_ad", "caption"],
        start_date: (data.start_date as string) || todayPlus(1),
        end_date: (data.end_date as string) || todayPlus(30),
        posting_frequency: data.posting_frequency || null,
        objectives: data.objectives,
        key_message: data.main_message,
        product_highlights: data.highlights,
        ai_instructions: data.ai_notes || null,
      });
      setCampaignId(campaign.id);
      setBriefData(data);
      setCurrentStep(2);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Lỗi khi tạo chiến dịch");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <Link
        href="/campaigns"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-0">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    currentStep === step.number
                      ? "bg-brand-600 text-white"
                      : currentStep > step.number
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {currentStep > step.number ? "✓" : step.number}
                </span>
                <span
                  className={`text-sm font-medium ${
                    currentStep === step.number
                      ? "text-brand-700"
                      : currentStep > step.number
                        ? "text-emerald-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`mx-4 h-px w-16 ${
                    currentStep > step.number ? "bg-emerald-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {createError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {createError}
        </div>
      )}

      {creating && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang lưu chiến dịch...
        </div>
      )}

      {currentStep === 1 && (
        <CampaignBriefStep onNext={handleBriefNext} />
      )}

      {currentStep === 2 && briefData && campaignId && (
        <ContentPlanStep
          campaignId={campaignId}
          briefData={briefData}
          onNext={() => {
            // Plan confirmed → go to campaign detail to work on individual posts
            router.push(`/campaigns/${campaignId}`);
          }}
          onBack={() => setCurrentStep(1)}
        />
      )}
    </div>
  );
}
