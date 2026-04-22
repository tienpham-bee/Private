import { clsx } from "clsx";

const variants: Record<string, string> = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-brand-100 text-brand-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

// Map content status to badge variant
const statusVariant: Record<string, string> = {
  generating: "info",
  pending_review: "warning",
  approved: "success",
  rejected: "danger",
  revision_requested: "purple",
  scheduled: "primary",
  publishing: "info",
  published: "success",
  failed: "danger",
  draft: "default",
  active: "success",
  paused: "warning",
  completed: "default",
};

const statusLabel: Record<string, string> = {
  generating: "Đang tạo",
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  revision_requested: "Yêu cầu sửa",
  scheduled: "Đã lên lịch",
  publishing: "Đang đăng",
  published: "Đã đăng",
  failed: "Thất bại",
  draft: "Nháp",
  active: "Đang chạy",
  paused: "Tạm dừng",
  completed: "Hoàn thành",
  social_post: "Bài đăng",
  video_script: "Kịch bản video",
  image_ad: "Quảng cáo hình ảnh",
  caption: "Chú thích",
  google_app_asset: "Google App Campaign",
};

// Map platform to colors
const platformVariant: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  threads: "bg-gray-800 text-white",
  tiktok: "bg-gray-900 text-white",
  google_app_campaigns: "bg-green-100 text-green-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = statusVariant[status] || "default";
  const label = statusLabel[status] || status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant={variant}>{label}</Badge>;
}

export function PlatformBadge({ platform }: { platform: string }) {
  const colorClass = platformVariant[platform] || "bg-gray-100 text-gray-700";
  const icon: Record<string, string> = {
    facebook: "f",
    instagram: "ig",
    threads: "@",
    tiktok: "tk",
    google_app_campaigns: "G",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorClass
      )}
    >
      <span className="font-bold">{icon[platform] || "?"}</span>
      {platform.charAt(0).toUpperCase() + platform.slice(1)}
    </span>
  );
}
