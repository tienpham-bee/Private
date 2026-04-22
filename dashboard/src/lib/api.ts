const API_BASE = "/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Brands
  brands: {
    list: () => request<any[]>("/brands"),
    get: (id: string) => request<any>(`/brands/${id}`),
    create: (data: any) => request<any>("/brands", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/brands/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  // Platforms
  platforms: {
    list: (brandId?: string) =>
      request<any[]>(`/platforms/accounts${brandId ? `?brand_id=${brandId}` : ""}`),
    create: (data: any) =>
      request<any>("/platforms/accounts", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/platforms/accounts/${id}`, { method: "DELETE" }),
  },

  // Campaigns
  campaigns: {
    list: (params?: { status?: string; brand_id?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<any[]>(`/campaigns${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<any>(`/campaigns/${id}`),
    create: (data: any) =>
      request<any>("/campaigns", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    generate: (id: string) =>
      request<any>(`/campaigns/${id}/generate`, { method: "POST" }),
  },

  // Content
  content: {
    list: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/content${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<any>(`/content/${id}`),
    update: (id: string, data: any) =>
      request<any>(`/content/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    regenerate: (id: string, feedback?: string) =>
      request<any>(`/content/${id}/regenerate${feedback ? `?feedback=${encodeURIComponent(feedback)}` : ""}`, { method: "POST" }),
  },

  // Approval
  approval: {
    queue: (platform?: string) =>
      request<any[]>(`/approval/queue${platform ? `?platform=${platform}` : ""}`),
    approve: (contentId: string, reviewerId: string) =>
      request<any>(`/approval/${contentId}/approve`, {
        method: "POST",
        body: JSON.stringify({ reviewer_id: reviewerId }),
      }),
    reject: (contentId: string, reviewerId: string, feedback: string) =>
      request<any>(`/approval/${contentId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reviewer_id: reviewerId, feedback }),
      }),
    requestRevision: (contentId: string, reviewerId: string, feedback: string) =>
      request<any>(`/approval/${contentId}/request-revision`, {
        method: "POST",
        body: JSON.stringify({ reviewer_id: reviewerId, feedback }),
      }),
    editAndApprove: (contentId: string, reviewerId: string, editedText: string) =>
      request<any>(`/approval/${contentId}/edit-and-approve`, {
        method: "POST",
        body: JSON.stringify({ reviewer_id: reviewerId, edited_body_text: editedText }),
      }),
    history: (contentId: string) => request<any[]>(`/approval/${contentId}/history`),
  },

  // Schedule
  schedule: {
    calendar: (start: string, end: string, platform?: string) => {
      let qs = `start=${start}&end=${end}`;
      if (platform) qs += `&platform=${platform}`;
      return request<any[]>(`/schedule/calendar?${qs}`);
    },
    create: (data: any) =>
      request<any>("/schedule", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/schedule/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/schedule/${id}`, { method: "DELETE" }),
  },

  // Templates
  templates: {
    list: (params?: { content_type?: string; platform?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<any[]>(`/templates${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<any>(`/templates/${id}`),
    create: (data: any) => request<any>("/templates", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/templates/${id}`, { method: "DELETE" }),
  },

  // Content Plan
  contentPlan: {
    generate: (campaignId: string) => request<any>(`/campaigns/${campaignId}/generate-plan`, { method: "POST" }),
    get: (campaignId: string) => request<any>(`/campaigns/${campaignId}/plan`),
    confirm: (campaignId: string) => request<any>(`/campaigns/${campaignId}/plan`, { method: "PATCH", body: JSON.stringify({ status: "confirmed" }) }),
    addItem: (campaignId: string, data: any) => request<any>(`/campaigns/${campaignId}/plan/items`, { method: "POST", body: JSON.stringify(data) }),
    updateItem: (itemId: string, data: any) => request<any>(`/plan-items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }),
    deleteItem: (itemId: string) => request<void>(`/plan-items/${itemId}`, { method: "DELETE" }),
  },

  // Generation
  generation: {
    generate: (planItemId: string) => request<any>(`/plan-items/${planItemId}/generate`, { method: "POST" }),
    quickGenerate: (data: { platform: string; content_type: string; topic: string; description?: string; brand_id?: string; campaign_id?: string; plan_item_id?: string }) =>
      request<any>("/generate/quick", { method: "POST", body: JSON.stringify(data) }),
    getConversation: (contentId: string) => request<any>(`/content/${contentId}/conversation`),
    chat: (contentId: string, message: string) => request<any>(`/content/${contentId}/chat`, { method: "POST", body: JSON.stringify({ message }) }),
    approve: (contentId: string) => request<any>(`/content/${contentId}/approve-interactive`, { method: "POST" }),
    regenerateFresh: (contentId: string) => request<any>(`/content/${contentId}/regenerate-fresh`, { method: "POST" }),
  },

  // Image Generation
  images: {
    generate: (data: { prompt: string; campaign_id?: string; content_piece_id?: string; model?: string }) =>
      request<any>("/images/generate", { method: "POST", body: JSON.stringify(data) }),
    list: (params?: { campaign_id?: string; content_piece_id?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<any[]>(`/images${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<any>(`/images/${id}`),
    delete: (id: string) => request<void>(`/images/${id}`, { method: "DELETE" }),
    fileUrl: (id: string) => `${API_BASE}/images/${id}/file`,
  },

  // Publishing
  publishing: {
    publishNow: (contentId: string) =>
      request<any>(`/publish/${contentId}`, { method: "POST" }),
    retry: (contentId: string) =>
      request<any>(`/publish/retry/${contentId}`, { method: "POST" }),
    logs: (params?: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/publish/logs${qs ? `?${qs}` : ""}`);
    },
  },
};
