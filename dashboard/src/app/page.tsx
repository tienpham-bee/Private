import {
  CheckSquare,
  CalendarDays,
  Send,
  Megaphone,
  Gamepad2,
  Share2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge, PlatformBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { mockStats, mockContent, mockCampaigns, mockBrands } from "@/lib/mock-data";

const statCards = [
  {
    label: "Chờ duyệt",
    value: mockStats.pendingReview,
    icon: CheckSquare,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Đã lên lịch",
    value: mockStats.scheduled,
    icon: CalendarDays,
    color: "text-brand-600",
    bg: "bg-brand-50",
  },
  {
    label: "Đã đăng",
    value: mockStats.published,
    icon: Send,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Chiến dịch đang chạy",
    value: mockStats.activeCampaigns,
    icon: Megaphone,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Thương hiệu",
    value: mockStats.totalBrands,
    icon: Gamepad2,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Nền tảng kết nối",
    value: mockStats.platformAccounts,
    icon: Share2,
    color: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    label: "Tổng nội dung",
    value: mockStats.totalContent,
    icon: FileText,
    color: "text-gray-600",
    bg: "bg-gray-50",
  },
  {
    label: "Bị từ chối",
    value: mockStats.rejected,
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
];

export default function DashboardPage() {
  const pendingContent = mockContent.filter(
    (c) => c.status === "pending_review"
  );
  const recentContent = mockContent.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        description="Theo dõi toàn bộ hoạt động marketing tự động"
      />

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
                >
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pending Review */}
        <Card>
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">
              Chờ duyệt ({pendingContent.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingContent.map((content) => {
              const campaign = mockCampaigns.find(
                (c) => c.id === content.campaign_id
              );
              return (
                <div key={content.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PlatformBadge platform={content.platform} />
                        <StatusBadge status={content.content_type} />
                        {content.variant_label && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                            Phiên bản {content.variant_label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mt-1">
                        {content.body_text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {campaign?.name} &middot;{" "}
                        {new Date(content.created_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {pendingContent.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                Không có nội dung nào chờ duyệt
              </div>
            )}
          </div>
        </Card>

        {/* Active Campaigns */}
        <Card>
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Chiến dịch đang chạy</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {mockCampaigns
              .filter((c) => c.status === "active")
              .map((campaign) => {
                const brand = mockBrands.find(
                  (b) => b.id === campaign.brand_id
                );
                const contentCount = mockContent.filter(
                  (c) => c.campaign_id === campaign.id
                ).length;
                return (
                  <div key={campaign.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {campaign.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {brand?.game_name} &middot; {campaign.start_date} →{" "}
                          {campaign.end_date}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {contentCount}
                        </p>
                        <p className="text-xs text-gray-400">nội dung</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {campaign.target_platforms.map((p) => (
                        <PlatformBadge key={p} platform={p} />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>

        {/* Recent Content Activity */}
        <Card className="col-span-2">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">
              Hoạt động nội dung gần đây
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Nội dung</th>
                  <th className="px-6 py-3">Nền tảng</th>
                  <th className="px-6 py-3">Loại</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentContent.map((content) => (
                  <tr key={content.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="max-w-xs truncate text-sm text-gray-700">
                        {content.body_text || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <PlatformBadge platform={content.platform} />
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-gray-500">
                        {content.content_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={content.status} />
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-600">
                        {content.llm_model?.replace("claude-", "")}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(content.created_at).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
