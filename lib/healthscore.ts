import type { HealthScoreComponents, Grade } from "@/lib/supabase/types";

// ─── Spec weights ─────────────────────────────────────────────────────────────
// Hard bounce 20% | Spam complaint 15% | Open rate 20% | CTR 15%
// Unsubscribe 15% | CTOR 10% | Delivery rate 5%
const WEIGHTS: Record<keyof HealthScoreComponents, number> = {
  hard_bounce:    0.20,
  spam_complaint: 0.15,
  open_rate:      0.20,
  ctr:            0.15,
  unsubscribe:    0.15,
  ctor:           0.10,
  delivery:       0.05,
};

// ─── Thresholds ───────────────────────────────────────────────────────────────
// Each metric: [excellent, critical] — linear interpolation between the two.
// For "lower is better" metrics the excellent value is the lower bound.

const THRESHOLDS = {
  // Lower is better
  hard_bounce:    { excellent: 0.002, critical: 0.02,  lowerIsBetter: true  },
  spam_complaint: { excellent: 0.0005, critical: 0.003, lowerIsBetter: true  },
  unsubscribe:    { excellent: 0.001, critical: 0.005,  lowerIsBetter: true  },
  // Higher is better
  open_rate:      { excellent: 0.25,  critical: 0.10,  lowerIsBetter: false },
  ctr:            { excellent: 0.03,  critical: 0.005, lowerIsBetter: false },
  ctor:           { excellent: 0.12,  critical: 0.03,  lowerIsBetter: false },
  delivery:       { excellent: 0.98,  critical: 0.90,  lowerIsBetter: false },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthScoreInput {
  // All values are ratios (0–1), except null when data unavailable
  hard_bounce_rate:    number | null;
  spam_complaint_rate: number | null;
  open_rate:           number | null;
  ctr:                 number | null;
  ctor:                number | null;
  unsubscribe_rate:    number | null;
  delivery_rate:       number | null;
}

export interface HealthScoreResult {
  score:            number;   // 0–100 integer
  grade:            Grade;
  label:            "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  components:       HealthScoreComponents; // 0–100 per component
  topIssue:         string | null;
  colorClass:       string;  // Tailwind text-color
  ringColor:        string;  // hex for SVG ring
}

// ─── Core scorer ──────────────────────────────────────────────────────────────

function scoreMetric(
  value: number | null,
  key: keyof typeof THRESHOLDS
): number {
  // If data is missing, assume benchmark (neutral 50)
  if (value === null || value === undefined) return 50;

  const { excellent, critical, lowerIsBetter } = THRESHOLDS[key];

  let raw: number;
  if (lowerIsBetter) {
    if (value <= excellent) return 100;
    if (value >= critical) return 0;
    raw = 1 - (value - excellent) / (critical - excellent);
  } else {
    if (value >= excellent) return 100;
    if (value <= critical) return 0;
    raw = (value - critical) / (excellent - critical);
  }

  return Math.round(Math.max(0, Math.min(100, raw * 100)));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const components: HealthScoreComponents = {
    hard_bounce:    scoreMetric(input.hard_bounce_rate,    "hard_bounce"),
    spam_complaint: scoreMetric(input.spam_complaint_rate, "spam_complaint"),
    open_rate:      scoreMetric(input.open_rate,           "open_rate"),
    ctr:            scoreMetric(input.ctr,                 "ctr"),
    unsubscribe:    scoreMetric(input.unsubscribe_rate,    "unsubscribe"),
    ctor:           scoreMetric(input.ctor,                "ctor"),
    delivery:       scoreMetric(input.delivery_rate,       "delivery"),
  };

  const score = Math.round(
    (Object.keys(WEIGHTS) as Array<keyof HealthScoreComponents>).reduce(
      (sum, key) => sum + components[key] * WEIGHTS[key],
      0
    )
  );

  const grade: Grade =
    score >= 85 ? "A" :
    score >= 70 ? "B" :
    score >= 55 ? "C" :
    score >= 40 ? "D" : "F";

  const label: HealthScoreResult["label"] =
    score >= 85 ? "Excellent" :
    score >= 70 ? "Good" :
    score >= 55 ? "Fair" :
    score >= 40 ? "Poor" : "Critical";

  const colorClass =
    score >= 70 ? "text-emerald-500" :
    score >= 55 ? "text-yellow-500" :
    score >= 40 ? "text-orange-500" : "text-red-500";

  const ringColor =
    score >= 70 ? "#10B981" :
    score >= 55 ? "#F59E0B" :
    score >= 40 ? "#F97316" : "#EF4444";

  // Surface the worst-performing component as the top issue
  const topIssue = findTopIssue(components, input);

  return { score, grade, label, components, topIssue, colorClass, ringColor };
}

// ─── Convenience: score from campaign_metrics row ─────────────────────────────

export function calculateHealthScoreFromMetrics(m: {
  hard_bounce_rate:    number | null;
  spam_complaint_rate: number | null;
  open_rate:           number | null;
  ctr:                 number | null;
  ctor:                number | null;
  unsubscribe_rate:    number | null;
  delivery_rate:       number | null;
}): HealthScoreResult {
  return calculateHealthScore(m);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ISSUE_LABELS: Record<keyof HealthScoreComponents, string> = {
  hard_bounce:    "Hard bounce rate is too high",
  spam_complaint: "Spam complaint rate exceeds threshold",
  open_rate:      "Open rate is below benchmark",
  ctr:            "Click-through rate is below benchmark",
  unsubscribe:    "Unsubscribe rate is elevated",
  ctor:           "Click-to-open rate is low",
  delivery:       "Delivery rate is below acceptable range",
};

function findTopIssue(
  components: HealthScoreComponents,
  _input: HealthScoreInput
): string | null {
  const worst = (Object.keys(components) as Array<keyof HealthScoreComponents>)
    .filter((k) => components[k] < 70)
    .sort((a, b) => {
      // Weight-adjusted badness: lowest weighted score = biggest problem
      const scoreA = components[a] * WEIGHTS[a];
      const scoreB = components[b] * WEIGHTS[b];
      return scoreA - scoreB;
    })[0];

  return worst ? ISSUE_LABELS[worst] : null;
}

// ─── Label helpers for UI ─────────────────────────────────────────────────────

export const COMPONENT_LABELS: Record<keyof HealthScoreComponents, string> = {
  hard_bounce:    "Hard Bounce",
  spam_complaint: "Spam Complaints",
  open_rate:      "Open Rate",
  ctr:            "Click-Through Rate",
  unsubscribe:    "Unsubscribes",
  ctor:           "Click-to-Open",
  delivery:       "Delivery Rate",
};

export const COMPONENT_WEIGHTS_DISPLAY: Record<keyof HealthScoreComponents, string> = {
  hard_bounce:    "20%",
  spam_complaint: "15%",
  open_rate:      "20%",
  ctr:            "15%",
  unsubscribe:    "15%",
  ctor:           "10%",
  delivery:       "5%",
};
