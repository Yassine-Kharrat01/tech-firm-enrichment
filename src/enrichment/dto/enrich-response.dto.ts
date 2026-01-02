import { Detection } from '../../detector/interfaces/detection.interface';
import { Firmographics } from '../../firmographics/interfaces/firmographics.interface';

export class EnrichResponseDto {
    domain: string;
    firmographics: Firmographics;
    technologies: Record<string, string[]>;
    confidence: Record<string, number>;
    detectedAt: Date;
    meta: {
        totalTechnologies: number;
        tier: number;
        timeTakenMs: number;
    };
}
