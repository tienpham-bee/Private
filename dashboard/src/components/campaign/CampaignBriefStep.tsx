"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { PlatformEnum } from "@/types";

const objectiveOptions = [
  { key: "tang_tai", label: "Tăng lượt tải" },
  { key: "tuong_tac", label: "Tăng tương tác" },
  { key: "nhan_dien", label: "Nhận diện thương hiệu" },
  { key: "doanh_thu", label: "Tăng doanh thu" },
  { key: "su_kien", label: "Quảng bá sự kiện" },
];

const platformOptions: { key: PlatformEnum; label: string }[] = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "threads", label: "Threads" },
  { key: "google_app_campaigns", label: "🎯 Google App Campaigns" },
];

interface CampaignBriefStepProps {
  onNext: (briefData: Record<string, unknown>) => void;
}

export function CampaignBriefStep({ onNext }: CampaignBriefStepProps) {
  const [brands, setBrands] = useState<any[]>([]);
  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState<string[]>([]);
  const [mainMessage, setMainMessage] = useState("");
  const [highlights, setHighlights] = useState<string[]>([""]);
  const [platforms, setPlatforms] = useState<PlatformEnum[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [frequency, setFrequency] = useState<Record<string, number>>({});
  const [aiNotes, setAiNotes] = useState("");

  useEffect(() => {
    api.brands.list().then(setBrands).catch(() => {});
  }, []);

  const toggleObjective = (key: string) => {
    setObjectives((prev) =>
      prev.includes(key) ? prev.filter((o) => o !== key) : [...prev, key]
    );
  };

  const togglePlatform = (key: PlatformEnum) => {
    setPlatforms((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((p) => p !== key);
        const newFreq = { ...frequency };
        delete newFreq[key];
        setFrequency(newFreq);
        return next;
      }
      setFrequency((f) => ({ ...f, [key]: 1 }));
      return [...prev, key];
    });
  };

  const addHighlight = () => setHighlights((prev) => [...prev, ""]);
  const removeHighlight = (idx: number) =>
    setHighlights((prev) => prev.filter((_, i) => i !== idx));
  const updateHighlight = (idx: number, val: string) =>
    setHighlights((prev) => prev.map((h, i) => (i === idx ? val : h)));

  const isValid = brandId && name && mainMessage && platforms.length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onNext({
      brand_id: brandId,
      name,
      description,
      objectives,
      main_message: mainMessage,
      highlights: highlights.filter((h) => h.trim()),
      platforms,
      start_date: startDate,
      end_date: endDate,
      posting_frequency: frequency,
      ai_notes: aiNotes,
    });
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <Card>
      <CardContent className="py-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          Brief chiến dịch
        </h2>

        <div className="space-y-5 max-w-2xl">
          {/* Brand */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Thương hiệu <span className="text-red-500">*</span>
            </label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className={inputClass}
            >
              <option value="">-- Chọn thương hiệu --</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.game_name}
                </option>
              ))}
            </select>
            {brands.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Chưa có thương hiệu.{" "}
                <a href="/brands" className="underline">
                  Tạo thương hiệu trước
                </a>
              </p>
            )}
          </div>

          {/* Campaign name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Tên chiến dịch <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Ra mắt Season 5"
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Mô tả ngắn về chiến dịch..."
              className={inputClass}
            />
          </div>

          {/* Objectives */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Mục tiêu
            </label>
            <div className="flex flex-wrap gap-2">
              {objectiveOptions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleObjective(key)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                    objectives.includes(key)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Main message */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Thông điệp chính <span className="text-red-500">*</span>
            </label>
            <textarea
              value={mainMessage}
              onChange={(e) => setMainMessage(e.target.value)}
              rows={3}
              placeholder="Thông điệp cốt lõi của chiến dịch..."
              className={inputClass}
            />
          </div>

          {/* Product highlights */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Điểm nhấn sản phẩm
            </label>
            <div className="space-y-2">
              {highlights.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={h}
                    onChange={(e) => updateHighlight(idx, e.target.value)}
                    placeholder={`Điểm nhấn ${idx + 1}`}
                    className={clsx(inputClass, "flex-1")}
                  />
                  {highlights.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHighlight(idx)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addHighlight}
                className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-4 w-4" />
                Thêm điểm nhấn
              </button>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nền tảng mục tiêu <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => togglePlatform(key)}
                  className={clsx(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                    platforms.includes(key)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Ngày kết thúc
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Posting frequency */}
          {platforms.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Tần suất đăng bài
              </label>
              <div className="space-y-2">
                {platforms.map((p) => (
                  <div key={p} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-600 capitalize">
                      {p}:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={frequency[p] || 1}
                      onChange={(e) =>
                        setFrequency((f) => ({
                          ...f,
                          [p]: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-center focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-500">bài/ngày</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Ghi chú cho AI
            </label>
            <textarea
              value={aiNotes}
              onChange={(e) => setAiNotes(e.target.value)}
              rows={2}
              placeholder="VD: Tập trung vào FOMO, tránh từ 'miễn phí'..."
              className={inputClass}
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-gray-100">
            <Button onClick={handleSubmit} disabled={!isValid} size="lg">
              <Sparkles className="h-4 w-4" />
              Tiếp tục
              <ArrowRight className="h-4 w-4" />
              AI Lên kế hoạch
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
