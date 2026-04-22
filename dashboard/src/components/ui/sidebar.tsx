"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Gamepad2,
  Megaphone,
  FileText,
  CheckSquare,
  CalendarDays,
  Share2,
  Bot,
  ImagePlus,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/brands", label: "Thương hiệu", icon: Gamepad2 },
  { href: "/campaigns", label: "Chiến dịch", icon: Megaphone },
  { href: "/templates", label: "Mẫu nội dung", icon: FileText },
  { href: "/gallery", label: "Thư viện ảnh AI", icon: ImagePlus },
  { href: "/content", label: "Duyệt nội dung", icon: CheckSquare },
  { href: "/schedule", label: "Lịch đăng bài", icon: CalendarDays },
  { href: "/platforms", label: "Nền tảng", icon: Share2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5">
        <Bot className="h-7 w-7 text-brand-600" />
        <div>
          <h1 className="text-sm font-bold text-gray-900">AI Marketing</h1>
          <p className="text-[10px] text-gray-400">Tự động hóa nội dung</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                className={clsx(
                  "h-5 w-5",
                  isActive ? "text-brand-600" : "text-gray-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-full border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            A
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Quản trị viên</p>
            <p className="text-xs text-gray-400">admin@studio.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
