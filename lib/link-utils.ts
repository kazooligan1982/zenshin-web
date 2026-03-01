export type LinkService =
  | "github"
  | "clickup"
  | "notion"
  | "figma"
  | "slack"
  | "jira"
  | "linear"
  | "google_docs"
  | "google_sheets"
  | "google_slides"
  | "trello"
  | "asana"
  | "other";

const SERVICE_PATTERNS: { pattern: RegExp; service: LinkService }[] = [
  { pattern: /github\.com/, service: "github" },
  { pattern: /app\.clickup\.com/, service: "clickup" },
  { pattern: /notion\.so/, service: "notion" },
  { pattern: /figma\.com/, service: "figma" },
  { pattern: /slack\.com/, service: "slack" },
  { pattern: /atlassian\.net|jira\./, service: "jira" },
  { pattern: /linear\.app/, service: "linear" },
  { pattern: /docs\.google\.com/, service: "google_docs" },
  { pattern: /sheets\.google\.com/, service: "google_sheets" },
  { pattern: /slides\.google\.com/, service: "google_slides" },
  { pattern: /trello\.com/, service: "trello" },
  { pattern: /app\.asana\.com/, service: "asana" },
];

export function detectService(url: string): LinkService {
  for (const { pattern, service } of SERVICE_PATTERNS) {
    if (pattern.test(url)) return service;
  }
  return "other";
}

export const SERVICE_LABELS: Record<LinkService, string> = {
  github: "GitHub",
  clickup: "ClickUp",
  notion: "Notion",
  figma: "Figma",
  slack: "Slack",
  jira: "Jira",
  linear: "Linear",
  google_docs: "Google Docs",
  google_sheets: "Google Sheets",
  google_slides: "Google Slides",
  trello: "Trello",
  asana: "Asana",
  other: "Link",
};
