export type PlatformEnum = "facebook" | "instagram" | "threads" | "tiktok" | "google_app_campaigns";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type ContentType = "social_post" | "video_script" | "image_ad" | "caption" | "google_app_asset";

export type ContentStatus =
  | "generating"
  | "pending_review"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type ApprovalAction = "approved" | "rejected" | "revision_requested" | "edited";

export interface Brand {
  id: string;
  game_name: string;
  app_store_url: string | null;
  play_store_url: string | null;
  tone_of_voice: string;
  target_audience: string;
  brand_guidelines: Record<string, unknown>;
  hashtags: string[];
  sample_posts: string[];
  system_prompt_override: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformAccount {
  id: string;
  platform: PlatformEnum;
  account_name: string;
  platform_user_id: string;
  brand_id: string;
  is_active: boolean;
  token_expires_at: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  target_platforms: string[];
  content_types: string[];
  start_date: string;
  end_date: string;
  posting_frequency: Record<string, number> | null;
  ab_test_enabled: boolean;
  variations_per_piece: number;
  created_by: string;
  created_at: string;
}

export interface ContentPiece {
  id: string;
  campaign_id: string;
  content_type: ContentType;
  platform: string;
  status: ContentStatus;
  body_text: string | null;
  hashtags: string[] | null;
  script_json: Record<string, unknown> | null;
  template_id: string | null;
  rendered_image_url: string | null;
  media_urls: string[] | null;
  variant_group: string | null;
  variant_label: string | null;
  llm_model: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRecord {
  id: string;
  content_id: string;
  reviewer_id: string;
  action: ApprovalAction;
  feedback: string | null;
  edited_body_text: string | null;
  created_at: string;
}

export interface ScheduleEntry {
  id: string;
  content_id: string;
  platform_account_id: string;
  scheduled_at: string;
  timezone: string;
  published_at: string | null;
  created_at: string;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string | null;
  content_type: ContentType;
  platform: string | null;
  structure: { sections: TemplateSection[] };
  example_output: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateSection {
  name: string;
  description: string;
  char_limit?: number;
}

export interface ContentPlan {
  id: string;
  campaign_id: string;
  status: "draft" | "confirmed" | "in_progress" | "completed";
  ai_reasoning: string | null;
  phases: string[] | null;
  items: ContentPlanItem[];
  created_at: string;
}

export interface ContentPlanItem {
  id: string;
  order_index: number;
  phase: string | null;
  platform: string;
  content_type: ContentType;
  topic: string;
  description: string | null;
  suggested_date: string | null;
  template_id: string | null;
  status: "pending" | "generating" | "generated" | "approved" | "skipped";
  content_piece_id: string | null;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  content_snapshot: Record<string, unknown> | null;
  created_at: string;
}
