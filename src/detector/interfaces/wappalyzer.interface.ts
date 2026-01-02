export interface WappalyzerTechnology {
    cats: string[];
    description?: string;
    icon?: string;
    url?: string;
    website?: string;
    implies?: string | string[];
    headers?: Record<string, string>;
    meta?: Record<string, string | string[]>;
    html?: string | string[] | Record<string, string>;
    scripts?: string | string[] | Record<string, string>;
    cookies?: Record<string, string>;
    dom?: string | string[] | Record<string, Record<string, string>>;
    cpe?: string;
}

export interface WappalyzerCategory {
    name: string;
    priority?: number;
}

export interface WappalyzerDatabase {
    categories: Record<string, WappalyzerCategory>;
    technologies: Record<string, WappalyzerTechnology>;
}
