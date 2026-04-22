"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformBadge, StatusBadge } from "@/components/ui/badge";
import { ContentPlan, ContentPlanItem } from "@/types";
import { api } from "@/lib/api";

interface ContentPlanStepProps {
  campaignId: string;
  briefData: Record<string, unknown>;
  onNext: () => void;
  onBack: () => void;
}

function PlanItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ContentPlanItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
        {item.order_index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <PlatformBadge platform={item.platform} />
          <StatusBadge status={item.content_type} />
        </div>
        <p className="text-sm font-semibold text-gray-900">{item.topic}</p>
        {item.description && (
          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
          {item.suggested_date && <span>{item.suggested_date}</span>}
          {item.template_id && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
              Template: {item.template_id}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={onEdit}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ContentPlanStep({
  campaignId,
  briefData,
  onNext,
  onBack,
}: ContentPlanStepProps) {
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>(
    {}
  );

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError("");
    try {
      const generatedPlan = await api.contentPlan.generate(campaignId);
      setPlan(generatedPlan);
      const expanded: Record<string, boolean> = {};
      generatedPlan.phases?.forEach((p: string) => {
        expanded[p] = true;
      });
      setExpandedPhases(expanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi tạo kế hoạch");
    } finally {
      setLoading(false);
    }
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }));
  };

  const deleteItem = async (itemId: string) => {
    if (!plan) return;
    try {
      await api.contentPlan.deleteItem(itemId);
      setPlan({
        ...plan,
        items: plan.items.filter((i) => i.id !== itemId),
      });
    } catch {
      // ignore
    }
  };

  const uniquePlatforms = plan
    ? [...new Set(plan.items.map((i) => i.platform))]
    : [];

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <Card>
        <CardContent className="py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Kế hoạch nội dung
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              AI sẽ phân tích brief và đề xuất kế hoạch nội dung chi tiết
            </p>
          </div>
          <Button
            onClick={handleGeneratePlan}
            disabled={loading || !!plan}
            size="lg"
          >
            <Bot className="h-4 w-4" />
            AI Lên kế hoạch
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              AI đang phân tích brief và lên kế hoạch...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan display */}
      {plan && !loading && (
        <>
          {/* AI reasoning */}
          {plan.ai_reasoning && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-2">
                <Bot className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Phân tích của AI
                  </p>
                  <p className="text-sm text-blue-700">{plan.ai_reasoning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Phase sections */}
          {plan.phases?.map((phase) => {
            const phaseItems = plan.items.filter((i) => i.phase === phase);
            const isExpanded = expandedPhases[phase] !== false;

            return (
              <Card key={phase}>
                <button
                  onClick={() => togglePhase(phase)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <h3 className="text-sm font-bold text-gray-900">
                      {phase}
                    </h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {phaseItems.length} mục
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2">
                      {phaseItems.map((item) => (
                        <PlanItemCard
                          key={item.id}
                          item={item}
                          onEdit={() => {}}
                          onDelete={() => deleteItem(item.id)}
                        />
                      ))}
                      <button
                        onClick={() => {}}
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-1"
                      >
                        <Plus className="h-4 w-4" />
                        Thêm mục
                      </button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* No-phase items */}
          {plan.items.filter((i) => !i.phase).length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="space-y-2">
                  {plan.items
                    .filter((i) => !i.phase)
                    .map((item) => (
                      <PlanItemCard
                        key={item.id}
                        item={item}
                        onEdit={() => {}}
                        onDelete={() => deleteItem(item.id)}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <div className="text-center text-sm text-gray-500 py-2">
            Tổng cộng{" "}
            <span className="font-bold text-gray-700">
              {plan.items.length}
            </span>{" "}
            nội dung trên{" "}
            <span className="font-bold text-gray-700">
              {uniquePlatforms.length}
            </span>{" "}
            nền tảng
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="secondary" onClick={onBack} disabled={confirming}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            <Button
              onClick={async () => {
                setConfirming(true);
                setError("");
                try {
                  await api.contentPlan.confirm(campaignId);
                  onNext();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Lỗi khi xác nhận kế hoạch");
                } finally {
                  setConfirming(false);
                }
              }}
              disabled={confirming}
              size="lg"
            >
              {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
              Xác nhận & Lưu kế hoạch
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {/* Back button when no plan yet */}
      {!plan && !loading && (
        <div className="flex">
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </div>
      )}
    </div>
  );
}
