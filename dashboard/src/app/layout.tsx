import type { Metadata } from "next";
import { Sidebar } from "@/components/ui/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Marketing Agent - Tự động hóa Marketing",
  description: "Hệ thống tự động tạo nội dung và đăng bài lên mạng xã hội cho game mobile",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <Sidebar />
        <main className="ml-64 min-h-screen p-8">{children}</main>
      </body>
    </html>
  );
}
