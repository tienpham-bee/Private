"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, ListOrdered, FileText } from "lucide-react";
import { clsx } from "clsx";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge, PlatformBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { mockTemplates } from "@/lib/mock-data";
import { ContentTemplate, ContentType, TemplateSection } from "@/types";

const contentTypeFilters: { value: ContentType | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "social_post", label: "Bài đăng" },
  { value: "video_script", label: "Kịch bản video" },
  { value: "image_ad", label: "Quảng cáo hình ảnh" },
  { value: "caption", label: "Chú thích" },
];

const contentTypeOptions: { value: ContentType; label: string }[] = [
  { value: "social_post", label: "Bài đăng" },
  { value: "video_script", label: "Kịch bản video" },
  { value: "image_ad", label: "Quảng cáo hình ảnh" },
  { value: "caption", label: "Chú thích" },
];

const platformOptions = [
  { value: "", label: "Tất cả nền tảng" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "threads", label: "Threads" },
  { value: "tiktok", label: "TikTok" },
];

function TemplateForm({
  template,
  onClose,
  onSave,
}: {
  template?: ContentTemplate;
  onClose: () => void;
  onSave: (data: ContentTemplate) => void;
}) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [contentType, setContentType] = useState<ContentType>(
    template?.content_type || "social_post"
  );
  const [platform, setPlatform] = useState(template?.platform || "");
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.structure.sections || [{ name: "", description: "" }]
  );
  const [exampleOutput, setExampleOutput] = useState(
    template?.example_output || ""
  );

  const addSection = () => {
    setSections([...sections, { name: "", description: "" }]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (
    index: number,
    field: keyof TemplateSection,
    value: string | number | undefined
  ) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleSave = () => {
    const now = new Date().toISOString();
    const data: ContentTemplate = {
      id: template?.id || `t${Date.now()}`,
      name,
      description: description || null,
      content_type: contentType,
      platform: platform || null,
      structure: { sections },
      example_output: exampleOutput || null,
      is_active: template?.is_active ?? true,
      created_at: template?.created_at || now,
      updated_at: now,
    };
    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {template ? "Chỉnh sửa mẫu" : "Tạo mẫu mới"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên mẫu *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Hook → Vấn đề → Giải pháp → CTA"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn gọn về mẫu này..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại nội dung *
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
              >
                {contentTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nền tảng
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
              >
                {platformOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic sections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Các phần của mẫu *
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addSection}
              >
                <Plus className="h-3 w-3" />
                Thêm phần
              </Button>
            </div>
            <div className="space-y-3">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Phần {index + 1}
                    </span>
                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) =>
                          updateSection(index, "name", e.target.value)
                        }
                        placeholder="Tên phần (VD: Hook)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={section.char_limit || ""}
                        onChange={(e) =>
                          updateSection(
                            index,
                            "char_limit",
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        placeholder="Giới hạn ký tự (tuỳ chọn)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={section.description}
                    onChange={(e) =>
                      updateSection(index, "description", e.target.value)
                    }
                    placeholder="Mô tả hướng dẫn cho AI..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:ring-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ví dụ đầu ra
            </label>
            <textarea
              value={exampleOutput}
              onChange={(e) => setExampleOutput(e.target.value)}
              placeholder="Dán ví dụ nội dung hoàn chỉnh theo mẫu này..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose} type="button">
              Hủy
            </Button>
            <Button type="button" onClick={handleSave}>
              {template ? "Lưu thay đổi" : "Tạo mẫu"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ContentTemplate[]>(mockTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ContentTemplate | undefined>();
  const [filterType, setFilterType] = useState<ContentType | "all">("all");

  const filtered =
    filterType === "all"
      ? templates
      : templates.filter((t) => t.content_type === filterType);

  const handleSave = (data: ContentTemplate) => {
    setTemplates((prev) => {
      const exists = prev.find((t) => t.id === data.id);
      if (exists) {
        return prev.map((t) => (t.id === data.id ? data : t));
      }
      return [...prev, data];
    });
  };

  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div>
      <PageHeader
        title="Mẫu nội dung"
        description="Quản lý mẫu nội dung cho AI tạo content"
        actions={
          <Button
            onClick={() => {
              setEditTemplate(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tạo mẫu
          </Button>
        }
      />

      {/* Filter buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {contentTypeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterType(f.value)}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filterType === f.value
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Template cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <FileText className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            Chưa có mẫu nào cho loại nội dung này
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              setEditTemplate(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tạo mẫu đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filtered.map((template) => (
            <Card key={template.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                    <FileText className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditTemplate(template);
                      setShowForm(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={template.content_type} />
                  {template.platform ? (
                    <PlatformBadge platform={template.platform} />
                  ) : (
                    <Badge variant="default">Tất cả nền tảng</Badge>
                  )}
                </div>

                {/* Section list */}
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400 mb-1.5">
                    Cấu trúc ({template.structure.sections.length} phần)
                  </p>
                  <div className="space-y-1">
                    {template.structure.sections.map((section, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm"
                      >
                        <ListOrdered className="mt-0.5 h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <div>
                          <span className="font-medium text-gray-700">
                            {section.name}
                          </span>
                          <span className="text-gray-400"> - </span>
                          <span className="text-gray-500">
                            {section.description}
                          </span>
                          {section.char_limit && (
                            <span className="ml-1 text-xs text-gray-400">
                              (tối đa {section.char_limit} ký tự)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Example preview */}
                {template.example_output && (
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-400 mb-1.5">
                      Ví dụ đầu ra
                    </p>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-4">
                        {template.example_output}
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer info */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Cập nhật{" "}
                    {new Date(template.updated_at).toLocaleDateString("vi-VN")}
                  </p>
                  <Badge variant={template.is_active ? "success" : "default"}>
                    {template.is_active ? "Đang hoạt động" : "Tắt"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <TemplateForm
          template={editTemplate}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
