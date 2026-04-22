"use client";

import { useState, useEffect } from "react";
import { Gamepad2, Plus, ExternalLink, Hash, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import { Brand } from "@/types";

function BrandForm({
  brand,
  onClose,
  onSaved,
}: {
  brand?: Brand;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState({
    game_name: brand?.game_name || "",
    app_store_url: brand?.app_store_url || "",
    play_store_url: brand?.play_store_url || "",
    tone_of_voice: brand?.tone_of_voice || "",
    target_audience: brand?.target_audience || "",
    hashtags: brand?.hashtags.join(", ") || "",
    sample_posts: brand?.sample_posts.join("\n\n") || "",
    system_prompt_override: brand?.system_prompt_override || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = {
        game_name: formData.game_name,
        app_store_url: formData.app_store_url || null,
        play_store_url: formData.play_store_url || null,
        tone_of_voice: formData.tone_of_voice,
        target_audience: formData.target_audience,
        hashtags: formData.hashtags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        sample_posts: formData.sample_posts
          .split("\n\n")
          .map((p) => p.trim())
          .filter(Boolean),
        system_prompt_override: formData.system_prompt_override || null,
      };
      if (brand) {
        await api.brands.update(brand.id, data);
      } else {
        await api.brands.create(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi lưu thương hiệu");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {brand ? "Chỉnh sửa thương hiệu" : "Tạo thương hiệu mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên game <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.game_name}
              onChange={set("game_name")}
              placeholder="VD: Dragon Quest Legends"
              required
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đường dẫn App Store
              </label>
              <input
                type="url"
                value={formData.app_store_url}
                onChange={set("app_store_url")}
                placeholder="https://apps.apple.com/..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đường dẫn Google Play
              </label>
              <input
                type="url"
                value={formData.play_store_url}
                onChange={set("play_store_url")}
                placeholder="https://play.google.com/..."
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giọng điệu thương hiệu <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.tone_of_voice}
              onChange={set("tone_of_voice")}
              placeholder="VD: Hùng tráng, phiêu lưu, kịch tính - hướng đến game thủ hardcore"
              rows={2}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đối tượng mục tiêu <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.target_audience}
              onChange={set("target_audience")}
              placeholder="VD: Nam 18-35 tuổi, yêu thích RPG, game thủ cạnh tranh"
              rows={2}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hashtag mặc định
            </label>
            <input
              type="text"
              value={formData.hashtags}
              onChange={set("hashtags")}
              placeholder="#TenGame, #MobileGaming, #RPG"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">Phân cách bằng dấu phẩy</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bài mẫu (để AI học giọng điệu thương hiệu)
            </label>
            <textarea
              value={formData.sample_posts}
              onChange={set("sample_posts")}
              placeholder="Dán 2-5 bài mẫu thể hiện giọng điệu thương hiệu của bạn..."
              rows={4}
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              Mỗi bài cách nhau một dòng trống
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prompt hệ thống tùy chỉnh (không bắt buộc)
            </label>
            <textarea
              value={formData.system_prompt_override}
              onChange={set("system_prompt_override")}
              placeholder="Ghi đè prompt hệ thống mặc định cho thương hiệu này..."
              rows={3}
              className={`${inputClass} font-mono text-xs`}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose} type="button" disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {brand ? "Lưu thay đổi" : "Tạo thương hiệu"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | undefined>();

  const loadBrands = async () => {
    try {
      const data = await api.brands.list();
      setBrands(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  return (
    <div>
      <PageHeader
        title="Thương hiệu"
        description="Quản lý thương hiệu game và hướng dẫn nội dung cho AI"
        actions={
          <Button onClick={() => { setEditBrand(undefined); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            Thêm thương hiệu
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : brands.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Gamepad2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Chưa có thương hiệu nào
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Tạo thương hiệu đầu tiên để AI có thể tạo nội dung phù hợp
            </p>
            <Button onClick={() => { setEditBrand(undefined); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Thêm thương hiệu
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                    <Gamepad2 className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {brand.game_name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Cập nhật{" "}
                      {new Date(brand.updated_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditBrand(brand); setShowForm(true); }}
                >
                  Sửa
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400 mb-1">
                    Giọng điệu
                  </p>
                  <p className="text-sm text-gray-700">{brand.tone_of_voice}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-400 mb-1">
                    Đối tượng mục tiêu
                  </p>
                  <p className="text-sm text-gray-700">{brand.target_audience}</p>
                </div>
                {brand.hashtags.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-400 mb-1">
                      Hashtag
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {brand.hashtags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                        >
                          <Hash className="h-3 w-3" />
                          {tag.replace("#", "")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {brand.sample_posts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-400 mb-1">
                      Bài mẫu ({brand.sample_posts.length})
                    </p>
                    {brand.sample_posts.slice(0, 1).map((post, i) => (
                      <p
                        key={i}
                        className="text-sm text-gray-500 italic line-clamp-2"
                      >
                        &ldquo;{post}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {brand.app_store_url && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <ExternalLink className="h-3 w-3" /> App Store
                    </span>
                  )}
                  {brand.play_store_url && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <ExternalLink className="h-3 w-3" /> Google Play
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <BrandForm
          brand={editBrand}
          onClose={() => setShowForm(false)}
          onSaved={loadBrands}
        />
      )}
    </div>
  );
}
