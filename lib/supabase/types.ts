export type Platform = "sfmc" | "mailchimp" | "klaviyo" | "sendgrid";
export type CampaignStatus = "draft" | "scheduled" | "sent" | "cancelled";
export type ContactStatus = "active" | "unsubscribed" | "bounced" | "lapsed";
export type InsightType = "opportunity" | "warning" | "critical" | "positive";
export type InsightStatus = "open" | "dismissed" | "actioned";
export type InsightEffort = "Low" | "Medium" | "High";
export type SpfResult = "pass" | "fail" | "softfail" | "neutral" | "unknown";
export type DkimResult = "pass" | "fail" | "unknown";
export type DmarcResult = "pass" | "fail" | "unknown";
export type InsightSeverity = "critical" | "warning" | "info" | "positive";
export type Grade = "A" | "B" | "C" | "D" | "F";
export type DiagnosticLayer = 1 | 2 | 3;

// ─── Table row types ──────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectedPlatform {
  id: string;
  user_id: string;
  platform: Platform;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown>;
  connected_at: string;
}

export interface Workspace {
  id: string;
  user_id: string;
  platform: Platform;
  subdomain: string;
  client_id: string;
  client_secret_enc: string;
  bu_name: string | null;
  account_id: string | null;
  is_active: boolean;
  connected_at: string;
  last_synced_at: string | null;
}

export interface Campaign {
  id: string;
  user_id: string;
  platform_id: string | null;
  external_id: string | null;
  name: string;
  subject: string | null;
  status: CampaignStatus;
  sent_at: string | null;
  created_at: string;
}

export interface CampaignMetrics {
  id: string;
  campaign_id: string;
  total_sent: number;
  delivered: number;
  opens: number;
  unique_opens: number;
  clicks: number;
  unique_clicks: number;
  unsubscribes: number;
  bounces: number;
  hard_bounces: number;
  soft_bounces: number;
  spam_complaints: number;
  revenue: number;
  open_rate: number | null;
  ctr: number | null;
  ctor: number | null;
  bounce_rate: number | null;
  unsubscribe_rate: number | null;
  spam_complaint_rate: number | null;
  delivery_rate: number | null;
  updated_at: string;
}

export interface Benchmark {
  id: string;
  campaign_id: string;
  acct_open_rate: number | null;
  acct_ctr: number | null;
  acct_ctor: number | null;
  acct_bounce_rate: number | null;
  acct_unsub_rate: number | null;
  acct_spam_rate: number | null;
  acct_delivery_rate: number | null;
  ind_open_rate: number | null;
  ind_ctr: number | null;
  ind_ctor: number | null;
  ind_bounce_rate: number | null;
  ind_unsub_rate: number | null;
  ind_spam_rate: number | null;
  ind_delivery_rate: number | null;
  updated_at: string;
}

export interface HealthScoreComponents {
  hard_bounce: number;
  spam_complaint: number;
  open_rate: number;
  ctr: number;
  unsubscribe: number;
  ctor: number;
  delivery: number;
}

export interface HealthScore {
  id: string;
  campaign_id: string;
  score: number;
  previous_score: number | null;
  delta: number | null;
  component_scores: HealthScoreComponents;
  grade: Grade | null;
  calculated_at: string;
}

export interface InsightResult {
  id: string;
  campaign_id: string;
  layer: DiagnosticLayer;
  severity: InsightSeverity;
  diagnosis: string;
  recommendation: string;
  metric_key: string | null;
  metric_value: number | null;
  benchmark_value: number | null;
  created_at: string;
}

export interface DeliverabilityCheck {
  id: string;
  campaign_id: string;
  spf: SpfResult;
  dkim: DkimResult;
  dmarc: DmarcResult;
  sender_score: number | null;
  blocklist_clean: boolean;
  blocklists_hit: string[] | null;
  checked_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  email: string;
  status: ContactStatus;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  created_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  campaign_id: string | null;
  type: InsightType;
  title: string;
  description: string | null;
  impact: string | null;
  impact_score: number | null;
  effort: InsightEffort | null;
  status: InsightStatus;
  created_at: string;
}

// ─── Joined types ─────────────────────────────────────────────────────────────

export interface CampaignWithMetrics extends Campaign {
  metrics: CampaignMetrics | null;
}

export interface CampaignFull extends Campaign {
  metrics: CampaignMetrics | null;
  health_score: HealthScore | null;
  benchmark: Benchmark | null;
  insight_results: InsightResult[];
  deliverability_check: DeliverabilityCheck | null;
}

// ─── Supabase database type ───────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Profile>;
      };
      connected_platforms: {
        Row: ConnectedPlatform;
        Insert: Omit<ConnectedPlatform, "id" | "connected_at">;
        Update: Partial<ConnectedPlatform>;
      };
      workspaces: {
        Row: Workspace;
        Insert: Omit<Workspace, "id" | "connected_at">;
        Update: Partial<Workspace>;
      };
      campaigns: {
        Row: Campaign;
        Insert: Omit<Campaign, "id" | "created_at">;
        Update: Partial<Campaign>;
      };
      campaign_metrics: {
        Row: CampaignMetrics;
        Insert: Omit<CampaignMetrics, "id" | "updated_at">;
        Update: Partial<CampaignMetrics>;
      };
      benchmarks: {
        Row: Benchmark;
        Insert: Omit<Benchmark, "id" | "updated_at">;
        Update: Partial<Benchmark>;
      };
      health_scores: {
        Row: HealthScore;
        Insert: Omit<HealthScore, "id" | "calculated_at">;
        Update: Partial<HealthScore>;
      };
      insight_results: {
        Row: InsightResult;
        Insert: Omit<InsightResult, "id" | "created_at">;
        Update: Partial<InsightResult>;
      };
      deliverability_checks: {
        Row: DeliverabilityCheck;
        Insert: Omit<DeliverabilityCheck, "id" | "checked_at">;
        Update: Partial<DeliverabilityCheck>;
      };
      contacts: {
        Row: Contact;
        Insert: Omit<Contact, "id" | "created_at">;
        Update: Partial<Contact>;
      };
      insights: {
        Row: Insight;
        Insert: Omit<Insight, "id" | "created_at">;
        Update: Partial<Insight>;
      };
    };
  };
};
