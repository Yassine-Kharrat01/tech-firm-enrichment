import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium, Browser, BrowserContext } from 'playwright';
import { CrawlResult } from './interfaces/crawl-result.interface';

@Injectable()
export class CrawlerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(CrawlerService.name);
    private browser: Browser | null = null;

    async onModuleInit() {
        // Browser is lazily initialized only when Tier 3 is needed
        this.logger.log('CrawlerService initialized');
    }

    async onModuleDestroy() {
        if (this.browser) {
            await this.browser.close();
            this.logger.log('Browser closed');
        }
    }

    /**
     * Main crawl method - implements tiered fetching strategy
     * Tier 1: HEAD request (fast, headers only)
     * Tier 2: GET request + HTML parsing
     * Tier 3: Playwright browser (only if SPA detected)
     */
    async crawl(domain: string): Promise<CrawlResult> {
        const url = this.normalizeUrl(domain);
        const startTime = Date.now();

        try {
            // Tier 2: GET request with HTML (skip Tier 1 for simplicity, GET gives us everything)
            const tier2Result = await this.fetchWithHttp(url);

            // Check if we need Tier 3 (browser rendering)
            if (this.needsBrowser(tier2Result.html)) {
                this.logger.log(`SPA detected for ${domain}, escalating to Tier 3`);
                const tier3Result = await this.fetchWithBrowser(url);
                return {
                    ...tier3Result,
                    tier: 3,
                    timeTakenMs: Date.now() - startTime,
                };
            }

            return {
                ...tier2Result,
                tier: 2,
                timeTakenMs: Date.now() - startTime,
            };
        } catch (error) {
            this.logger.error(`Crawl failed for ${domain}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Normalize domain to full URL
     */
    private normalizeUrl(domain: string): string {
        let url = domain.trim().toLowerCase();

        // Remove protocol if present
        url = url.replace(/^https?:\/\//, '');

        // Remove trailing slash
        url = url.replace(/\/$/, '');

        // Remove www. for consistency
        url = url.replace(/^www\./, '');

        return `https://${url}`;
    }

    /**
     * Tier 2: Fetch using HTTP GET + parse HTML
     */
    private async fetchWithHttp(url: string): Promise<Omit<CrawlResult, 'tier' | 'timeTakenMs'>> {
        const response = await axios.get<string>(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
            validateStatus: (status: number) => status < 500,
            responseType: 'text',
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract scripts
        const scripts: string[] = [];
        $('script[src]').each((_, el) => {
            const src = $(el).attr('src');
            if (src) scripts.push(src);
        });

        // Extract meta tags
        const meta: Record<string, string> = {};
        $('meta').each((_, el) => {
            const name = $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv');
            const content = $(el).attr('content');
            if (name && content) {
                meta[name.toLowerCase()] = content;
            }
        });

        // Extract headers (lowercase keys)
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(response.headers)) {
            if (typeof value === 'string') {
                headers[key.toLowerCase()] = value;
            }
        }

        // Extract cookies from Set-Cookie header
        const cookies: string[] = [];
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
            if (Array.isArray(setCookie)) {
                cookies.push(...setCookie);
            } else if (typeof setCookie === 'string') {
                cookies.push(setCookie);
            }
        }

        // Get final URL after redirects (response.request exists at runtime but not in types)
        const axiosResponse = response as unknown as { request?: { res?: { responseUrl?: string } } };
        const finalUrl = axiosResponse.request?.res?.responseUrl || url;

        return {
            url,
            finalUrl,
            statusCode: response.status,
            headers,
            html,
            scripts,
            meta,
            cookies,
        };
    }

    /**
     * Detect if page is a Single Page Application that needs browser rendering
     */
    private needsBrowser(html: string): boolean {
        const spaSignals = [
            // Empty root containers (React, Vue, Angular)
            /<div[^>]*id=["']root["'][^>]*>\s*<\/div>/i,
            /<div[^>]*id=["']app["'][^>]*>\s*<\/div>/i,
            /<div[^>]*id=["']__next["'][^>]*>\s*<\/div>/i,

            // Noscript with content warnings
            /<noscript[^>]*>.*?enable javascript/i,
            /<noscript[^>]*>.*?javascript is required/i,

            // Very short body (likely JS-rendered)
            // Check if body has less than 500 chars of actual content
        ];

        for (const pattern of spaSignals) {
            if (pattern.test(html)) {
                return true;
            }
        }

        // Additional check: if HTML body is suspiciously short
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            const bodyContent = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim();
            if (bodyContent.length < 200) {
                return true;
            }
        }

        return false;
    }

    /**
     * Tier 3: Fetch using Playwright headless browser
     */
    private async fetchWithBrowser(url: string): Promise<Omit<CrawlResult, 'tier' | 'timeTakenMs'>> {
        // Lazy initialize browser
        if (!this.browser) {
            this.logger.log('Initializing Playwright browser...');
            this.browser = await chromium.launch({
                headless: true,
            });
        }

        const context: BrowserContext = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        const page = await context.newPage();

        try {
            // Navigate and wait for network to be idle
            const response = await page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 15000,
            });

            // Wait a bit more for any lazy-loaded content
            await page.waitForTimeout(1000);

            // Get final HTML after JS execution
            const html = await page.content();
            const $ = cheerio.load(html);

            // Extract scripts
            const scripts: string[] = [];
            $('script[src]').each((_, el) => {
                const src = $(el).attr('src');
                if (src) scripts.push(src);
            });

            // Extract meta tags
            const meta: Record<string, string> = {};
            $('meta').each((_, el) => {
                const name = $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv');
                const content = $(el).attr('content');
                if (name && content) {
                    meta[name.toLowerCase()] = content;
                }
            });

            // Get response headers
            const headers: Record<string, string> = {};
            const responseHeaders = response?.headers() || {};
            for (const [key, value] of Object.entries(responseHeaders)) {
                headers[key.toLowerCase()] = value;
            }

            // Get cookies
            const cookies = await context.cookies();
            const cookieStrings = cookies.map(c => `${c.name}=${c.value}`);

            return {
                url,
                finalUrl: page.url(),
                statusCode: response?.status() || 200,
                headers,
                html,
                scripts,
                meta,
                cookies: cookieStrings,
            };
        } finally {
            await context.close();
        }
    }
}
