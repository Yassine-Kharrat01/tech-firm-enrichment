import { Injectable, Logger } from '@nestjs/common';
import { CrawlerService } from '../crawler/crawler.service';
import { DetectorService } from '../detector/detector.service';
import { NormalizerService, NormalizedResult } from '../normalizer/normalizer.service';
import { FirmographicsService } from '../firmographics/firmographics.service';
import { EnrichResponseDto } from './dto/enrich-response.dto';

@Injectable()
export class EnrichmentService {
    private readonly logger = new Logger(EnrichmentService.name);

    constructor(
        private readonly crawler: CrawlerService,
        private readonly detector: DetectorService,
        private readonly normalizer: NormalizerService,
        private readonly firmographics: FirmographicsService,
    ) { }

    async enrich(domain: string): Promise<EnrichResponseDto> {
        const startTime = Date.now();

        // 1. Crawl
        const crawlResult = await this.crawler.crawl(domain);

        this.logger.debug(`Detecting technologies...`);

        // 2. Parallel Detection & Firmographics
        const [rawDetections, firmographicsData] = await Promise.all([
            this.detector.detect(crawlResult),
            this.firmographics.infer(crawlResult)
        ]);

        this.logger.debug(`Found ${rawDetections.length} technologies`);

        // 3. Normalize
        const normalized: NormalizedResult = this.normalizer.normalize(rawDetections);

        const timeTaken = Date.now() - startTime;
        this.logger.log(`Enrichment complete for ${domain}: ${rawDetections.length} technologies found in ${timeTaken}ms`);

        return {
            domain,
            firmographics: firmographicsData,
            technologies: normalized.technologies,
            confidence: normalized.confidence,
            detectedAt: new Date(),
            meta: {
                totalTechnologies: normalized.rawCount,
                tier: crawlResult.tier,
                timeTakenMs: timeTaken
            }
        };
    }
}
