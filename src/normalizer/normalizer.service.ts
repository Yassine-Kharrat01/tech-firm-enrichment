import { Injectable } from '@nestjs/common';
import { Detection } from '../detector/interfaces/detection.interface';
import { getTechCategory, CATEGORY_DISPLAY_NAMES } from './taxonomy';

export interface NormalizedResult {
    technologies: Record<string, string[]>;
    confidence: Record<string, number>;
    rawCount: number;
}

@Injectable()
export class NormalizerService {
    /**
     * Normalize raw detections into categorized structure
     */
    normalize(detections: Detection[]): NormalizedResult {
        const technologies: Record<string, string[]> = {};
        const confidence: Record<string, number> = {};
        const categoryConfidences: Record<string, number[]> = {};

        for (const detection of detections) {
            // Get normalized category from taxonomy, fallback to raw category
            let category = getTechCategory(detection.name);

            if (!category) {
                // Use the category from fingerprint database (lowercase, snake_case)
                category = detection.category.toLowerCase().replace(/\s+/g, '_');
            }

            // Initialize category arrays if needed
            if (!technologies[category]) {
                technologies[category] = [];
                categoryConfidences[category] = [];
            }

            // Add technology to category (avoid duplicates)
            if (!technologies[category].includes(detection.name)) {
                technologies[category].push(detection.name);
                categoryConfidences[category].push(detection.confidence);
            }
        }

        // Calculate average confidence per category
        for (const [category, scores] of Object.entries(categoryConfidences)) {
            const avgConfidence = scores.reduce((a, b) => a + b, 0) / scores.length;
            confidence[category] = Number(avgConfidence.toFixed(2));
        }

        // Sort technologies alphabetically within each category
        for (const category of Object.keys(technologies)) {
            technologies[category].sort();
        }

        return {
            technologies,
            confidence,
            rawCount: detections.length
        };
    }

    /**
     * Get display-friendly category name
     */
    getCategoryDisplayName(category: string): string {
        return CATEGORY_DISPLAY_NAMES[category] || category;
    }
}
