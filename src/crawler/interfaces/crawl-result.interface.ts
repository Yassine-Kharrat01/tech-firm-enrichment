export interface CrawlResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  headers: Record<string, string>;
  html: string;
  scripts: string[];
  meta: Record<string, string>;
  cookies: string[];
  tier: 1 | 2 | 3;
  timeTakenMs: number;
}
