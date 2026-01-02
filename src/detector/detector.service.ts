import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { CrawlResult } from '../crawler/interfaces/crawl-result.interface';
import { Detection } from './interfaces/detection.interface';
import { WappalyzerDatabase, WappalyzerTechnology } from './interfaces/wappalyzer.interface';

@Injectable()
export class DetectorService implements OnModuleInit {
    private readonly logger = new Logger(DetectorService.name);
    private database: WappalyzerDatabase;

    onModuleInit() {
        this.loadFingerprints();
    }

    private loadFingerprints() {
        try {
            const filePath = path.join(__dirname, 'fingerprints', 'technologies.json');
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            this.database = JSON.parse(fileContent);
            this.logger.log(`Loaded ${Object.keys(this.database.technologies).length} Wappalyzer technologies`);
        } catch (error) {
            this.logger.error('Failed to load fingerprints', error);
            throw error;
        }
    }

    async detect(crawlResult: CrawlResult): Promise<Detection[]> {
        const detections: Map<string, Detection> = new Map();

        for (const [techName, tech] of Object.entries(this.database.technologies)) {
            // Headers
            if (tech.headers) {
                if (this.matchHeaders(tech.headers, crawlResult.headers)) {
                    this.addDetection(detections, techName, tech, 1, 'header');
                    continue;
                }
            }

            // Cookies
            if (tech.cookies) {
                if (this.matchCookies(tech.cookies, crawlResult.cookies)) {
                    this.addDetection(detections, techName, tech, 1, 'cookie');
                    continue;
                }
            }

            // Scripts
            if (tech.scripts) {
                if (this.matchScripts(tech.scripts, crawlResult.scripts)) {
                    this.addDetection(detections, techName, tech, 1, 'script');
                    continue;
                }
            }

            // HTML
            if (tech.html) {
                if (this.matchHtml(tech.html, crawlResult.html)) {
                    this.addDetection(detections, techName, tech, 1, 'html');
                    continue;
                }
            }

            // Meta
            if (tech.meta) {
                if (this.matchMeta(tech.meta, crawlResult.meta)) {
                    this.addDetection(detections, techName, tech, 1, 'meta');
                    continue;
                }
            }
        }

        // Process implications
        this.processImplications(detections);

        return Array.from(detections.values());
    }

    private addDetection(
        detections: Map<string, Detection>,
        name: string,
        tech: WappalyzerTechnology,
        confidence: number,
        source: Detection['source']
    ) {
        if (detections.has(name)) return;

        const catId = tech.cats?.[0] || "1";
        const categoryName = this.database.categories[catId]?.name || 'Miscellaneous';

        detections.set(name, {
            name,
            category: categoryName,
            categoryId: parseInt(catId),
            confidence,
            source
        });
    }

    private matchHeaders(
        patterns: Record<string, string>,
        headers: Record<string, string>
    ): boolean {
        for (const [key, pattern] of Object.entries(patterns)) {
            const headerValue = headers[key.toLowerCase()];
            if (headerValue) {
                try {
                    if (new RegExp(pattern, 'i').test(headerValue)) return true;
                } catch (e) { }
            }
        }
        return false;
    }

    private matchCookies(
        patterns: Record<string, string>,
        cookies: string[]
    ): boolean {
        for (const cookieStr of cookies) {
            const parts = cookieStr.split('=');
            const key = parts[0];
            const value = parts.slice(1).join('=');

            const pattern = patterns[key];
            if (pattern !== undefined) {
                if (pattern === "") return true;
                try {
                    if (new RegExp(pattern, 'i').test(value || '')) return true;
                } catch (e) { }
            }
        }
        return false;
    }

    private matchScripts(patterns: string | string[] | Record<string, string>, scripts: string[]): boolean {
        const patternArray = Array.isArray(patterns) ? patterns :
            (typeof patterns === 'string' ? [patterns] : []);

        for (const pattern of patternArray) {
            for (const script of scripts) {
                try {
                    if (new RegExp(pattern, 'i').test(script)) return true;
                } catch (e) { }
            }
        }
        return false;
    }

    private matchHtml(patterns: string | string[] | Record<string, string>, html: string): boolean {
        const patternArray = Array.isArray(patterns) ? patterns :
            (typeof patterns === 'string' ? [patterns] : []);

        for (const pattern of patternArray) {
            try {
                if (new RegExp(pattern, 'i').test(html)) return true;
            } catch (e) { }
        }
        return false;
    }

    private matchMeta(patterns: Record<string, string | string[]>, meta: Record<string, string>): boolean {
        for (const [key, pattern] of Object.entries(patterns)) {
            const metaValue = meta[key.toLowerCase()];
            if (metaValue) {
                const patList = Array.isArray(pattern) ? pattern : [pattern];
                for (const p of patList) {
                    try {
                        if (new RegExp(p, 'i').test(metaValue)) return true;
                    } catch (e) { }
                }
            }
        }
        return false;
    }

    private processImplications(detections: Map<string, Detection>) {
        let changed = true;
        while (changed) {
            changed = false;
            for (const det of Array.from(detections.values())) {
                const tech = this.database.technologies[det.name];
                if (tech && tech.implies) {
                    const implies = Array.isArray(tech.implies) ? tech.implies : [tech.implies];
                    for (const impliedName of implies) {
                        if (!detections.has(impliedName)) {
                            const impliedTech = this.database.technologies[impliedName];
                            if (impliedTech) {
                                this.addDetection(detections, impliedName, impliedTech, 1, 'implied');
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
    }
}
