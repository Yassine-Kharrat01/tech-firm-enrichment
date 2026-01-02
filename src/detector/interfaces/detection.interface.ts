export interface Detection {
    name: string;
    category: string;
    categoryId: number;
    version?: string;
    confidence: number;
    source: 'header' | 'html' | 'script' | 'meta' | 'cookie' | 'js' | 'implied';
    pattern?: string;
}

export interface TechnologyFingerprint {
    name: string;
    cats: number[];
    website?: string;
    icon?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    html?: string | string[];
    scripts?: string | string[];
    meta?: Record<string, string>;
    implies?: string | string[];
    excludes?: string | string[];
}

export interface FingerprintDatabase {
    technologies: Record<string, TechnologyFingerprint>;
    categories: Record<string, { name: string }>;
}
