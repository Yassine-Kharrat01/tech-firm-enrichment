import { Injectable, Logger } from '@nestjs/common';
import { CrawlResult } from '../crawler/interfaces/crawl-result.interface';
import { Firmographics } from './interfaces/firmographics.interface';
import * as cheerio from 'cheerio';

@Injectable()
export class FirmographicsService {
    private readonly logger = new Logger(FirmographicsService.name);

    // Simple TLD to Country mapping
    private readonly tldMap: Record<string, string> = {
        us: 'United States',
        uk: 'United Kingdom',
        co: 'Colombia', // Or widely used for commercial
        io: 'British Indian Ocean Territory', // Startup TLD
        fr: 'France',
        de: 'Germany',
        ca: 'Canada',
        au: 'Australia',
        jp: 'Japan',
        cn: 'China',
        in: 'India',
        br: 'Brazil',
        ru: 'Russia',
        it: 'Italy',
        es: 'Spain',
        nl: 'Netherlands',
        se: 'Sweden',
        ch: 'Switzerland',
        pl: 'Poland',
        za: 'South Africa',
        mx: 'Mexico',
        sg: 'Singapore',
        hk: 'Hong Kong',
        kr: 'South Korea',
        ie: 'Ireland',
        // Generic TLDs
        com: 'United States', // Default assumption often used
        org: 'United States',
        net: 'United States',
    };

    // Industry keywords
    private readonly industryKeywords: Record<string, string[]> = {
        ecommerce: ['shop', 'cart', 'checkout', 'store', 'buy', 'shipping', 'marketplace'],
        saas: ['software', 'platform', 'solution', 'dashboard', 'login', 'pricing', 'api', 'cloud'],
        media: ['news', 'blog', 'article', 'magazine', 'journal', 'tv', 'radio', 'podcast'],
        finance: ['bank', 'money', 'invest', 'crypto', 'loan', 'insurance', 'credit', 'payment'],
        education: ['learn', 'course', 'university', 'school', 'student', 'training', 'academy'],
        healthcare: ['health', 'doctor', 'medical', 'patient', 'clinic', 'hospital', 'care'],
        travel: ['travel', 'hotel', 'flight', 'booking', 'tour', 'vacation', 'trip'],
        real_estate: ['property', 'estate', 'house', 'apartment', 'rent', 'subsidy', 'realtor'],
    };

    /**
     * Infer firmographics from crawl result
     */
    async infer(crawlResult: CrawlResult): Promise<Firmographics> {
        const firmographics: Firmographics = {};
        const $ = cheerio.load(crawlResult.html);

        // 1. Infer Location from TLD
        const tld = this.extractTld(crawlResult.url);
        if (tld && this.tldMap[tld]) {
            firmographics.location = {
                country: this.tldMap[tld],
            };
        }

        // 2. Infer Industry from Keywords
        const textContent = (
            $('title').text() + ' ' +
            $('meta[name="description"]').attr('content') + ' ' +
            $('meta[name="keywords"]').attr('content')
        ).toLowerCase();

        for (const [industry, keywords] of Object.entries(this.industryKeywords)) {
            if (keywords.some(keyword => textContent.includes(keyword))) {
                firmographics.industry = this.formatIndustry(industry);
                break; // Stop at first match for MVP
            }
        }

        // 3. Extract Company Name
        // Try OG Site Name
        const ogSiteName = $('meta[property="og:site_name"]').attr('content');
        if (ogSiteName) {
            firmographics.name = ogSiteName;
        } else {
            // Try Copyright in footer
            const copyright = $('footer').text().match(/©\s*(?:\d{4}-)?\d{4}\s+([A-Za-z0-9\s.,]+)/);
            if (copyright && copyright[1]) {
                // Clean up name
                let name = copyright[1].trim();
                name = name.replace(/All rights reserved/i, '').trim();
                if (name.length < 50) { // Sanity check
                    firmographics.name = name;
                }
            }
        }

        // If still no name, use domain/title
        if (!firmographics.name) {
            const title = $('title').text().split(/[-|]/)[0].trim();
            if (title) firmographics.name = title;
        }

        // Description
        const description = $('meta[name="description"]').attr('content');
        if (description) {
            firmographics.description = description.substring(0, 200);
        }

        return firmographics;
    }

    private extractTld(url: string): string | null {
        try {
            const hostname = new URL(url).hostname;
            const parts = hostname.split('.');
            return parts.length > 1 ? parts[parts.length - 1] : null;
        } catch {
            return null;
        }
    }

    private formatIndustry(key: string): string {
        return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
}
