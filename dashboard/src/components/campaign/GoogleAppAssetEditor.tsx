"use client";

import { useState, useCallback } from "react";
import { Check, AlertCircle, Download, RefreshCw, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

// ---- Types ----
export interface GoogleAppAssets {
  headlines: string[];       // 5 items, max 30 chars each
  descriptions: string[];    // 5 items, max 90 chars each
  call_to_action: string;
}

const CTA_OPTIONS = [
  "DOWNLOAD",
  "INSTALL_MOBILE_APP",
  "PLAY_NOW",
  "GET_NOW",
  "LEARN_MORE",
  "SIGN_UP",
];

const CTA_LABELS: Record<string, string> = {
  DOWNLOAD: "Tải xuống",
  INSTALL_MOBILE_APP: "Cài đặt ngay",
  PLAY_NOW: "Chơi ngay",
  GET_NOW: "Nhận ngay",
  LEARN_MORE: "Tìm hiểu thêm",
  SIGN_UP: "Đăng ký",
};

// ---- Char Counter ----
function CharCount({ value, max, warn = 0.85 }: { value: string; max: number; warn?: number }) {
  const len = value.length;
  const pct = len / max;
  return (
    <span
      className={clsx(
        "text-[10px] font-mono tabular-nums",
        len > max ? "text-red-600 font-bold" : pct >= warn ? "text-amber-600" : "text-gray-400"
      )}
    >
      {len}/{max}
    </span>
  );
}

// ---- Single Asset Field ----
function AssetField({
  label,
  value,
  maxLen,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  maxLen: number;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const over = value.length > maxLen;
  const base =
    "w-full rounded-lg border px-3 py-2 text-sm text-gray-800 outline-none transition-colors resize-none";
  const borderClass = over
    ? "border-red-400 bg-red-50 focus:ring-red-200"
    : "border-gray-200 bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <CharCount value={value} max={maxLen} />
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className={clsx(base, borderClass)}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={clsx(base, borderClass)}
        />
      )}
      {over && (
        <p className="mt-0.5 text-[10px] text-red-600">
          Vượt quá {value.length - maxLen} ký tự — Google sẽ cắt bớt
        </p>
      )}
    </div>
  );
}

// ---- Asset Group (headlines or descriptions) ----
function AssetGroup({
  title,
  items,
  maxLen,
  maxItems,
  multiline,
  placeholder,
  onChange,
}: {
  title: string;
  items: string[];
  maxLen: number;
  maxItems: number;
  multiline?: boolean;
  placeholder?: string;
  onChange: (items: string[]) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const validCount = items.filter((h) => h.trim().length > 0 && h.length <= maxLen).length;

  const update = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              validCount === maxItems
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            )}
          >
            {validCount}/{maxItems} hợp lệ
          </span>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
      </button>
      {!collapsed && (
        <div className="p-4 space-y-3">
          {items.map((item, i) => (
            <AssetField
              key={i}
              label={`${title.replace(/s$/, "")} ${i + 1}`}
              value={item}
              maxLen={maxLen}
              multiline={multiline}
              placeholder={placeholder}
              onChange={(v) => update(i, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Export helpers ----
function exportCSV(assets: GoogleAppAssets, topic: string) {
  const rows: string[][] = [
    ["Ad Type", "Headlines", "Descriptions", "Call To Action"],
    [
      "App Ad",
      assets.headlines.join(" | "),
      assets.descriptions.join(" | "),
      assets.call_to_action,
    ],
  ];
  // Google Ads bulk upload format — one row per asset
  const googleRows: string[][] = [["Campaign", "Ad group", "Asset type", "Asset text"]];
  assets.headlines.forEach((h) => googleRows.push(["", "", "Headline", h]));
  assets.descriptions.forEach((d) => googleRows.push(["", "", "Description", d]));
  googleRows.push(["", "", "Call to action", assets.call_to_action]);

  const csv = googleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `google-app-assets-${topic.slice(0, 30).replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(assets: GoogleAppAssets) {
  const json = JSON.stringify(assets, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "google-app-assets.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Main Editor ----
interface GoogleAppAssetEditorProps {
  contentPieceId: string | null;
  topic: string;
  initialAssets: GoogleAppAssets;
  onSaved: (assets: GoogleAppAssets) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  isApproved: boolean;
  saving?: boolean;
}

export function GoogleAppAssetEditor({
  contentPieceId,
  topic,
  initialAssets,
  onSaved,
  onApprove,
  onRegenerate,
  isApproved,
  saving: externalSaving,
}: GoogleAppAssetEditorProps) {
  const [headlines, setHeadlines] = useState<string[]>(
    initialAssets.headlines.length === 5 ? initialAssets.headlines : [...initialAssets.headlines, ...Array(5).fill("")].slice(0, 5)
  );
  const [descriptions, setDescriptions] = useState<string[]>(
    initialAssets.descriptions.length === 5 ? initialAssets.descriptions : [...initialAssets.descriptions, ...Array(5).fill("")].slice(0, 5)
  );
  const [cta, setCta] = useState(initialAssets.call_to_action || "DOWNLOAD");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const assets: GoogleAppAssets = { headlines, descriptions, call_to_action: cta };

  const isDirty =
    JSON.stringify(headlines) !== JSON.stringify(initialAssets.headlines) ||
    JSON.stringify(descriptions) !== JSON.stringify(initialAssets.descriptions) ||
    cta !== initialAssets.call_to_action;

  const validHeadlines = headlines.filter((h) => h.trim() && h.length <= 30).length;
  const validDescriptions = descriptions.filter((d) => d.trim() && d.length <= 90).length;
  const allValid = validHeadlines === 5 && validDescriptions === 5;

  const handleSave = async () => {
    if (!contentPieceId) return;
    setSaving(true);
    try {
      await api.content.update(contentPieceId, {
        script_json: { headlines, descriptions, call_to_action: cta },
        body_text: `Google App Campaign: ${topic}`,
      });
      onSaved(assets);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            Google App Campaigns
          </span>
          {isApproved && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <Check className="h-3 w-3" /> Đã duyệt
            </span>
          )}
          {isDirty && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              Chưa lưu
            </span>
          )}
        </div>
        <h3 className="text-base font-bold text-gray-900">{topic}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Google sẽ tự mix các assets để tìm combo hiệu quả nhất.
        </p>
      </div>

      {/* Validation bar */}
      <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {validHeadlines === 5 ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className="text-xs text-gray-600">
            Headlines: <strong className={validHeadlines === 5 ? "text-emerald-600" : "text-amber-600"}>{validHeadlines}/5</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {validDescriptions === 5 ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className="text-xs text-gray-600">
            Descriptions: <strong className={validDescriptions === 5 ? "text-emerald-600" : "text-amber-600"}>{validDescriptions}/5</strong>
          </span>
        </div>
        {allValid && (
          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            ✓ Sẵn sàng upload Google Ads
          </span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Headlines */}
        <AssetGroup
          title="Headlines"
          items={headlines}
          maxLen={30}
          maxItems={5}
          placeholder="Tối đa 30 ký tự..."
          onChange={setHeadlines}
        />

        {/* Descriptions */}
        <AssetGroup
          title="Descriptions"
          items={descriptions}
          maxLen={90}
          maxItems={5}
          multiline
          placeholder="Tối đa 90 ký tự..."
          onChange={setDescriptions}
        />

        {/* CTA */}
        <div className="rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Call to Action</label>
          <div className="flex flex-wrap gap-2">
            {CTA_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setCta(option)}
                className={clsx(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  cta === option
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {CTA_LABELS[option] || option}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <p className="text-xs font-semibold text-blue-700 mb-3 uppercase tracking-wide">
            Xem trước trên Google Search
          </p>
          <div className="rounded-lg bg-white border border-gray-200 p-3 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">Quảng cáo · Google Play</p>
            <p className="text-sm font-medium text-blue-700 leading-snug">
              {headlines[0] || "Headline 1"} | {headlines[1] || "Headline 2"} | {headlines[2] || "Headline 3"}
            </p>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              {descriptions[0] || "Description 1 sẽ hiện ở đây..."}
            </p>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2 bg-white">
        {isDirty && (
          <Button onClick={handleSave} disabled={saving || !!externalSaving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saveOk ? <Check className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {saveOk ? "Đã lưu!" : "Lưu thay đổi"}
          </Button>
        )}
        {!isDirty && !isApproved && (
          <Button variant="success" onClick={onApprove} disabled={!allValid}>
            <Check className="h-4 w-4" />
            Duyệt
          </Button>
        )}
        <Button variant="secondary" onClick={onRegenerate} className="text-orange-600 border-orange-300 hover:bg-orange-50">
          <RefreshCw className="h-4 w-4" />
          Tạo lại
        </Button>

        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => exportCSV(assets, topic)} title="Export CSV cho Google Ads Manager">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="ghost" onClick={() => exportJSON(assets)} title="Export JSON">
            <Download className="h-4 w-4" />
            JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
