import { Module } from '@nestjs/common';
import { EnrichmentController } from './enrichment.controller';
import { EnrichmentService } from './enrichment.service';
import { CrawlerModule } from '../crawler/crawler.module';
import { DetectorModule } from '../detector/detector.module';
import { NormalizerModule } from '../normalizer/normalizer.module';
import { FirmographicsModule } from '../firmographics/firmographics.module';

@Module({
    imports: [CrawlerModule, DetectorModule, NormalizerModule, FirmographicsModule],
    controllers: [EnrichmentController],
    providers: [EnrichmentService],
})
export class EnrichmentModule { }
