import { Controller, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';
import { EnrichRequestDto } from './dto/enrich-request.dto';
import { EnrichResponseDto } from './dto/enrich-response.dto';

@Controller()
export class EnrichmentController {
    private readonly logger = new Logger(EnrichmentController.name);

    constructor(private readonly enrichmentService: EnrichmentService) { }

    /**
     * POST /enrich
     * Enrich a domain with technographic data
     */
    @Post('enrich')
    async enrich(@Body() dto: EnrichRequestDto): Promise<EnrichResponseDto> {
        this.logger.log(`Received enrichment request for: ${dto.domain}`);

        // Basic domain validation
        if (!this.isValidDomain(dto.domain)) {
            throw new HttpException(
                { error: 'Invalid domain format', domain: dto.domain },
                HttpStatus.BAD_REQUEST,
            );
        }

        try {
            const result = await this.enrichmentService.enrich(dto.domain);
            return result;
        } catch (error) {
            this.logger.error(`Enrichment failed: ${error.message}`);

            // Return appropriate error status
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new HttpException(
                    { error: 'Domain unreachable', domain: dto.domain, details: error.message },
                    HttpStatus.BAD_GATEWAY,
                );
            }

            if (error.message?.includes('timeout')) {
                throw new HttpException(
                    { error: 'Request timeout', domain: dto.domain },
                    HttpStatus.GATEWAY_TIMEOUT,
                );
            }

            throw new HttpException(
                { error: 'Enrichment failed', domain: dto.domain, details: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    /**
     * Basic domain validation
     */
    private isValidDomain(domain: string): boolean {
        // Remove protocol if present
        const cleaned = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

        // Basic domain regex
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        return domainRegex.test(cleaned);
    }
}
