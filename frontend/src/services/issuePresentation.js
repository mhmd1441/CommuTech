export const STATUS_LABELS = {
  pending: "Submitted",
  under_review: "Being Assessed",
  awaiting_funding: "Community Funding Open",
  in_progress: "Work In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
  under_investigation: "Under Investigation",
  funded: "Fully Funded",
  expired: "Funding Period Ended",
};

export function issueStatusKey(issue) {
  if (!issue || typeof issue === "string") return issue || "pending";
  if (issue.funding_status === "funded") return "funded";
  if (issue.funding_status === "expired") return "expired";
  return issue.status || "pending";
}

export function issueStatusLabel(issue) {
  const key = issueStatusKey(issue);
  return STATUS_LABELS[key] || key?.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Submitted";
}

export function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
}

export function fundingPercent(issue) {
  const goal = Number(issue?.funding_goal || 0);
  const raised = Number(issue?.funding_raised || 0);
  if (!goal) return 0;
  return Math.min(100, Math.round((raised / goal) * 100));
}
