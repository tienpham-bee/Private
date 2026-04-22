"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PlatformBadge } from "@/components/ui/badge";
import { mockPlatformAccounts, mockBrands } from "@/lib/mock-data";

const platformIcons: Record<string, { icon: string; color: string; bg: string }> = {
  facebook: { icon: "f", color: "text-blue-600", bg: "bg-blue-100" },
  instagram: { icon: "ig", color: "text-pink-600", bg: "bg-pink-100" },
  threads: { icon: "@", color: "text-gray-800", bg: "bg-gray-200" },
  tiktok: { icon: "tk", color: "text-gray-900", bg: "bg-gray-200" },
};

function ConnectModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            Kết nối tài khoản nền tảng
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nền tảng *
            </label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500">
              <option value="">Chọn nền tảng</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="threads">Threads</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thương hiệu *
            </label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500">
              <option value="">Chọn thương hiệu</option>
              {mockBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.game_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên tài khoản *
            </label>
            <input
              type="text"
              placeholder="VD: @dragonquestlegends"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID trang/người dùng *
            </label>
            <input
              type="text"
              placeholder="ID của nền tảng"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token *
            </label>
            <textarea
              rows={3}
              placeholder="Dán access token của bạn..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-xs focus:border-brand-500 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose} type="button">
              Hủy
            </Button>
            <Button type="button" onClick={onClose}>
              Kết nối tài khoản
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlatformsPage() {
  const [showConnect, setShowConnect] = useState(false);

  // Group accounts by brand
  const accountsByBrand = mockBrands.map((brand) => ({
    brand,
    accounts: mockPlatformAccounts.filter((a) => a.brand_id === brand.id),
  }));

  return (
    <div>
      <PageHeader
        title="Tài khoản nền tảng"
        description="Quản lý tài khoản mạng xã hội đã kết nối cho từng thương hiệu"
        actions={
          <Button onClick={() => setShowConnect(true)}>
            <Plus className="h-4 w-4" />
            Kết nối tài khoản
          </Button>
        }
      />

      <div className="space-y-6">
        {accountsByBrand.map(({ brand, accounts }) => (
          <Card key={brand.id}>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">{brand.game_name}</h3>
              <p className="text-xs text-gray-400">
                {accounts.length} tài khoản đã kết nối
              </p>
            </CardHeader>
            <div className="divide-y divide-gray-50">
              {accounts.map((account) => {
                const pi = platformIcons[account.platform] || {
                  icon: "?",
                  color: "text-gray-600",
                  bg: "bg-gray-100",
                };

                const isExpiringSoon =
                  account.token_expires_at &&
                  new Date(account.token_expires_at).getTime() -
                    Date.now() <
                    7 * 24 * 60 * 60 * 1000;

                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${pi.bg} ${pi.color}`}
                      >
                        {pi.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {account.account_name}
                          </p>
                          <PlatformBadge platform={account.platform} />
                        </div>
                        <p className="text-xs text-gray-400">
                          ID: {account.platform_user_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status */}
                      {account.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Ngừng
                        </span>
                      )}

                      {/* Token expiry */}
                      {account.token_expires_at && (
                        <span
                          className={`text-xs ${isExpiringSoon ? "text-amber-600 font-medium" : "text-gray-400"}`}
                        >
                          Hết hạn:{" "}
                          {new Date(account.token_expires_at).toLocaleDateString(
                            "vi-VN"
                          )}
                        </span>
                      )}

                      {/* Actions */}
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Làm mới Token
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {accounts.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  Chưa có tài khoản nào được kết nối cho thương hiệu này
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} />}
    </div>
  );
}
