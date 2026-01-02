import { Module } from '@nestjs/common';
import { EnrichmentModule } from './enrichment/enrichment.module';

@Module({
  imports: [EnrichmentModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
