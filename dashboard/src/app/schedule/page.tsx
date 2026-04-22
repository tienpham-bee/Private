"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PlatformBadge, StatusBadge } from "@/components/ui/badge";
import {
  mockSchedule,
  mockContent,
  mockPlatformAccounts,
  mockCampaigns,
} from "@/lib/mock-data";

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const HOURS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00",
];

// Generate a week of dates starting from Monday
function getWeekDates(offset: number = 0): Date[] {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function ScheduleEvent({
  entry,
}: {
  entry: (typeof mockSchedule)[0];
}) {
  const content = mockContent.find((c) => c.id === entry.content_id);
  const account = mockPlatformAccounts.find(
    (a) => a.id === entry.platform_account_id
  );
  const campaign = content
    ? mockCampaigns.find((c) => c.id === content.campaign_id)
    : null;

  if (!content || !account) return null;

  const platformColors: Record<string, string> = {
    facebook: "border-l-blue-500 bg-blue-50",
    instagram: "border-l-pink-500 bg-pink-50",
    threads: "border-l-gray-700 bg-gray-100",
    tiktok: "border-l-gray-900 bg-gray-100",
  };

  return (
    <div
      className={`rounded-lg border-l-4 p-2.5 text-xs ${
        platformColors[account.platform] || "border-l-gray-300 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <PlatformBadge platform={account.platform} />
        {entry.published_at ? (
          <StatusBadge status="published" />
        ) : (
          <StatusBadge status="scheduled" />
        )}
      </div>
      <p className="text-gray-700 line-clamp-2 mt-1">{content.body_text}</p>
      <p className="text-gray-400 mt-1">
        {campaign?.name} &middot; {account.account_name}
      </p>
    </div>
  );
}

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = getWeekDates(weekOffset);

  const formatDate = (d: Date) =>
    d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  const isToday = (d: Date) => {
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  // Group schedule entries by day
  const entriesByDay = weekDates.map((date) => {
    return mockSchedule.filter((entry) => {
      const entryDate = new Date(entry.scheduled_at);
      return entryDate.toDateString() === date.toDateString();
    });
  });

  return (
    <div>
      <PageHeader
        title="Lịch đăng bài"
        description="Quản lý thời gian đăng nội dung lên các nền tảng"
      />

      {/* Week navigation */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeekOffset(weekOffset - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeekOffset(0)}
          >
            Hôm nay
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700">
            {formatDate(weekDates[0])} — {formatDate(weekDates[6])}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-blue-400" /> Facebook
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-pink-400" /> Instagram
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-gray-600" /> Threads
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-gray-900" /> TikTok
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <Card>
        <div className="grid grid-cols-7 divide-x divide-gray-100">
          {weekDates.map((date, dayIndex) => (
            <div key={dayIndex} className="min-h-[500px]">
              {/* Day header */}
              <div
                className={`border-b border-gray-100 px-3 py-3 text-center ${
                  isToday(date) ? "bg-brand-50" : ""
                }`}
              >
                <p className="text-xs font-medium text-gray-500">
                  {DAYS[dayIndex]}
                </p>
                <p
                  className={`text-lg font-bold ${
                    isToday(date) ? "text-brand-600" : "text-gray-900"
                  }`}
                >
                  {date.getDate()}
                </p>
              </div>

              {/* Events */}
              <div className="space-y-2 p-2">
                {entriesByDay[dayIndex].map((entry) => (
                  <div key={entry.id}>
                    <div className="mb-1 flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.scheduled_at).toLocaleTimeString(
                        "vi-VN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                    <ScheduleEvent entry={entry} />
                  </div>
                ))}

                {entriesByDay[dayIndex].length === 0 && (
                  <p className="py-8 text-center text-xs text-gray-300">
                    Chưa có bài
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Upcoming list */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">
              Tất cả lịch đăng ({mockSchedule.length})
            </h3>
          </CardHeader>
          <div className="divide-y divide-gray-50">
            {mockSchedule.map((entry) => {
              const content = mockContent.find(
                (c) => c.id === entry.content_id
              );
              const account = mockPlatformAccounts.find(
                (a) => a.id === entry.platform_account_id
              );
              const campaign = content
                ? mockCampaigns.find((c) => c.id === content.campaign_id)
                : null;

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">
                        {new Date(entry.scheduled_at).getDate()}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(entry.scheduled_at).toLocaleString("vi-VN", {
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {account && (
                          <PlatformBadge platform={account.platform} />
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(entry.scheduled_at).toLocaleTimeString(
                            "vi-VN",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 line-clamp-1">
                        {content?.body_text}
                      </p>
                      <p className="text-xs text-gray-400">
                        {campaign?.name} &middot; {account?.account_name}
                      </p>
                    </div>
                  </div>
                  <div>
                    {entry.published_at ? (
                      <StatusBadge status="published" />
                    ) : (
                      <Button variant="secondary" size="sm">
                        Đổi lịch
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
