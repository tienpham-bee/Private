"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, PlatformBadge } from "@/components/ui/badge";
import { api } from "@/lib/api";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    Promise.all([api.campaigns.list(), api.brands.list()])
      .then(([camps, brds]) => {
        setCampaigns(camps);
        setBrands(brds);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filterStatus === "all"
      ? campaigns
      : campaigns.filter((c) => c.status === filterStatus);

  return (
    <div>
      <PageHeader
        title="Chiến dịch"
        description="Quản lý chiến dịch marketing và kích hoạt AI tạo nội dung"
        actions={
          <Link href="/campaigns/new">
            <Button>
              <Plus className="h-4 w-4" />
              Tạo chiến dịch
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {[
          { key: "all", label: "Tất cả" },
          { key: "draft", label: "Nháp" },
          { key: "active", label: "Đang chạy" },
          { key: "paused", label: "Tạm dừng" },
          { key: "completed", label: "Hoàn thành" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filterStatus === key
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-500">
              {filterStatus === "all"
                ? "Chưa có chiến dịch nào. Tạo chiến dịch đầu tiên!"
                : "Không có chiến dịch nào với trạng thái này."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((campaign) => {
            const brand = brands.find((b) => b.id === campaign.brand_id);

            return (
              <Card key={campaign.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {campaign.name}
                        </h3>
                        <StatusBadge status={campaign.status} />
                        {campaign.ab_test_enabled && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                            Thử nghiệm A/B
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {brand?.game_name && `${brand.game_name} · `}
                        {campaign.description}
                      </p>

                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-500">
                          <span className="font-medium text-gray-700">
                            {campaign.start_date}
                          </span>{" "}
                          →{" "}
                          <span className="font-medium text-gray-700">
                            {campaign.end_date}
                          </span>
                        </span>
                        <div className="flex gap-1.5">
                          {campaign.target_platforms.map((p: string) => (
                            <PlatformBadge key={p} platform={p} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/campaigns/${campaign.id}/generate`}>
                        <Button variant="success" size="sm">
                          <Sparkles className="h-3.5 w-3.5" />
                          Tạo nội dung
                        </Button>
                      </Link>
                      <Link href={`/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="sm">
                          Chi tiết
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
