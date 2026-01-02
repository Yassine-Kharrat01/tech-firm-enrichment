# Techstack Enrichment Service

A NestJS-based backend service that analyzes websites to detect technologies and extract technographic/firmographic data.

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Testing
npm run test
npm run test:e2e
```

**API runs on:** `http://localhost:3000`

---

## Solution Approach

The service solves technographic enrichment through a **multi-stage pipeline with intelligent optimization**:

### 1. **Tiered Crawling Strategy**
Intelligently escalates fetching based on content type:
- **Tier 2 (HTTP):** Fast HTTP GET + HTML parsing with Cheerio (~200-500ms)
- **Tier 3 (Browser):** Playwright browser rendering (~3-8s) - auto-escalates when SPAs detected

This avoids unnecessary browser overhead for static sites while capturing JavaScript-rendered SPAs.

### 2. **Multi-Source Pattern Detection**
Detects technologies using Wappalyzer fingerprints across **5 independent sources**:
- HTTP Headers (server, caching, framework signatures)
- Cookies (session/tracking frameworks)
- Script Tags (library sources, analytics)
- HTML Content (regex patterns in markup)
- Meta Tags (generator, X-UA-Compatible, etc.)

**Plus Implications:** Applies transitive rules (e.g., jQuery → JavaScript)

### 3. **Taxonomic Normalization**
Standardizes raw detections into clean categories:
- Groups by standardized taxonomy (Frontend, Backend, Server, etc.)
- Calculates **per-category confidence scores** (average of detection confidence)
- Deduplicates and alphabetizes results
- Fallback logic for unknown technologies

### 4. **Parallel Enrichment**
Simultaneoulsy extracts:
- Technology detections
- Company metadata (country via TLD, company name, contact info)

Reduces latency through parallel execution.

---

## Technical Implementation

### Tier Detection & Escalation
The CrawlerService starts with **Tier 2 HTTP fetching**:
1. Issues GET request to normalize URL
2. Parses HTML with Cheerio
3. Checks for SPA indicators:
   - Empty root divs (id="app", id="root", id="container")
   - Vue/React/Angular script patterns
   - JavaScript-only content with no initial markup
4. **Escalates to Tier 3 (Playwright)** only if SPA detected
5. Returns CrawlResult with tier indicator and timing

**Performance benefit:** Avoids 5-10s browser overhead for 80% of static websites.

### Multi-Source Detection Engine
DetectorService loads Wappalyzer fingerprint database and executes detection loop:

```
For each Technology in database:
  ├─ Check Headers (regex against HTTP headers)
  ├─ Check Cookies (pattern matching on Set-Cookie)
  ├─ Check Scripts (src attributes and inline content)
  ├─ Check HTML (DOM selectors and content regex)
  ├─ Check Meta (meta tag content)
  └─ If matched: Create Detection object with {name, category, confidence, source}

After all detections:
  └─ Process Implications (transitive rules: jQuery → JavaScript)
```

Each source produces independent detections. Multiple sources matching same tech increases confidence.

### Taxonomic Normalization Pipeline
NormalizerService transforms raw detections:

```
Input: Detection[] with raw categories like "JavaScript Frameworks", "Web Servers"

1. Category Mapping: getTechCategory(techName) → standardized category
   Fallback: category.toLowerCase().replace(/\s+/g, '_')

2. Deduplication: Use Map<techName, Detection> to prevent duplicates

3. Confidence Aggregation: 
   For each category: avgConfidence = sum(confidence) / count
   Rounds to 2 decimals

4. Alphabetization: Sort tech names within each category

Output: Structured Record<category, techName[]> with confidence scores
```

### Execution Flow (EnrichmentService)
```typescript
1. crawl(domain) → CrawlResult
2. Promise.all([
     detector.detect(crawlResult),    // Parallel
     firmographics.infer(crawlResult)  // Parallel
   ])
3. normalizer.normalize(detections)
4. Return EnrichResponseDto
```

**Timeline:** 1-3 seconds (Tier 2) or 5-10 seconds (Tier 3)

---

## Architecture

```
EnrichmentController
    ↓
EnrichmentService (Orchestrator)
    ├→ CrawlerService (tiered fetching with SPA detection)
    ├→ [PARALLEL] DetectorService (multi-source pattern matching)
    ├→ [PARALLEL] FirmographicsService (company metadata)
    └→ NormalizerService (deduplication + taxonomic grouping)
```

---

## API Endpoints

### POST `/enrich`

Enrich a domain with technographic and firmographic data.

**Request:**
```json
{
  "domain": "example.com",
  "forceBrowser": false  // optional: force Playwright rendering
}
```

**Response:**
```json
{
  "domain": "example.com",
  "firmographics": {
    "country": "United States",
    "companyName": "Example Inc",
    "description": "..."
  },
  "technologies": {
    "Frontend": ["React", "TypeScript"],
    "Backend": ["Node.js", "Express"],
    "Server": ["Nginx"]
  },
  "confidence": {
    "Frontend": 0.92,
    "Backend": 0.88,
    "Server": 0.95
  },
  "detectedAt": "2026-01-02T10:30:00Z",
  "meta": {
    "totalTechnologies": 8,
    "tier": 2,
    "timeTakenMs": 2450
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid domain format
- `502 Bad Gateway` - Domain unreachable
- `504 Gateway Timeout` - Request timeout

---

## Services

### EnrichmentService
**Location:** `src/enrichment/enrichment.service.ts`

Main orchestrator that coordinates the enrichment pipeline:
1. Crawls the domain
2. Detects technologies (parallel with firmographics)
3. Normalizes results
4. Returns comprehensive response

**Methods:**
- `enrich(domain: string): Promise<EnrichResponseDto>` - Main enrichment method

---

### CrawlerService
**Location:** `src/crawler/crawler.service.ts`

Implements tiered fetching strategy for optimal performance:

| Tier | Strategy | Use Case |
|------|----------|----------|
| 2 | HTTP GET + Cheerio parsing | Standard websites |
| 3 | Playwright browser | SPAs (Single Page Apps) |

**Key Methods:**
- `crawl(domain: string): Promise<CrawlResult>` - Fetches and parses website
- `fetchWithHttp(url: string)` - HTTP GET with HTML parsing
- `fetchWithBrowser(url: string)` - Playwright rendering
- `needsBrowser(html: string): boolean` - Detects SPA requirement

**Returns (`CrawlResult`):**
- `html` - Raw HTML content
- `headers` - HTTP response headers
- `cookies` - Set-Cookie headers
- `scripts` - Extracted script tags
- `meta` - Meta tag content
- `tier` - Which tier was used (2 or 3)

---

### DetectorService
**Location:** `src/detector/detector.service.ts`

Pattern-matching engine using Wappalyzer fingerprints. Detects technologies by checking:
- HTTP headers
- Cookies
- Script sources & content
- DOM selectors
- Meta tags

**Key Methods:**
- `detect(crawlResult: CrawlResult): Promise<Detection[]>` - Identify all technologies
- Pattern matching methods: `matchHeaders()`, `matchCookies()`, `matchScripts()`, etc.

**Fingerprints:** Loaded from `src/detector/fingerprints/technologies.json` (Wappalyzer database)

---

### FirmographicsService
**Location:** `src/firmographics/firmographics.service.ts`

Extracts company/organization metadata from website data:
- Country inference from TLD (domain extension)
- Company name extraction from HTML
- Email/contact information
- Social media links

**Key Methods:**
- `infer(crawlResult: CrawlResult): Promise<Firmographics>` - Extract company data
- `extractCompanyName()` - Parse company from HTML
- `extractCountry()` - Map TLD to country

---

### NormalizerService
**Location:** `src/normalizer/normalizer.service.ts`

Standardizes and categorizes raw detections:
- Groups technologies by category (Frontend, Backend, Server, etc.)
- Calculates confidence scores
- Deduplicates results
- Applies taxonomy rules

**Key Methods:**
- `normalize(detections: Detection[]): NormalizedResult` - Normalize detection data
- `categorizeByType()` - Group by technology category

---

## Interfaces & DTOs

### Request DTOs

**`EnrichRequestDto`** (`src/enrichment/dto/enrich-request.dto.ts`)
```typescript
{
  domain: string;        // Required, validated domain
  forceBrowser?: boolean; // Optional, force browser rendering
}
```

---

### Response DTOs

**`EnrichResponseDto`** (`src/enrichment/dto/enrich-response.dto.ts`)
```typescript
{
  domain: string;
  firmographics: Firmographics;
  technologies: Record<string, string[]>;  // Category → [Tech names]
  confidence: Record<string, number>;      // Category → avg confidence score
  detectedAt: Date;
  meta: {
    totalTechnologies: number;
    tier: number;        // 2 or 3
    timeTakenMs: number;
  };
}
```

---

### Core Interfaces

**`CrawlResult`** (`src/crawler/interfaces/crawl-result.interface.ts`)
```typescript
{
  url: string;
  html: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  scripts: { src?: string; content?: string }[];
  meta: Record<string, string>;
  tier: 2 | 3;
  timeTakenMs: number;
}
```

**`Detection`** (`src/detector/interfaces/detection.interface.ts`)
```typescript
{
  name: string;
  category: string;
  categoryId: number;
  confidence: number;    // 0-1
  source: string;        // 'header' | 'cookie' | 'script' | 'dom' | 'meta'
}
```

**`Firmographics`** (`src/firmographics/interfaces/firmographics.interface.ts`)
```typescript
{
  country?: string;
  companyName?: string;
  description?: string;
  email?: string[];
  social?: Record<string, string>;
}
```

**`WappalyzerDatabase`** (`src/detector/interfaces/wappalyzer.interface.ts`)
```typescript
{
  technologies: Record<string, WappalyzerTechnology>;
  categories: Record<string, string>;
}

WappalyzerTechnology: {
  name: string;
  category: string | string[];
  headers?: Record<string, Pattern>;
  cookies?: Record<string, Pattern>;
  scripts?: Pattern[];
  dom?: Record<string, Pattern>;
  meta?: Record<string, Pattern>;
  js?: Record<string, Pattern>;
  confidence?: number;
}
```

---

## Pattern Types

All detection patterns support:
- **String matching:** `"value"`
- **Regex matching:** `"\\bpattern\\b"`
- **Exists check:** `""`
- **Array matching:** `["option1", "option2"]`

---

## Configuration

### Environment Variables
```
PORT=3000  # Server port (default: 3000)
```

### Validation Settings
- Whitelist: DTOs reject unknown properties
- Transform: Automatic type casting
- Domain: Lowercase + trimmed

### CORS
Enabled for development (configured in `main.ts`)

---

## Performance Notes

- **Tier 2 crawling:** ~200-500ms for typical websites
- **Tier 3 (browser):** ~3-8s for SPAs (Playwright overhead)
- **Detection:** ~50-100ms per domain
- **SPA detection:** Checks for common SPA indicators (Vue, React, Angular patterns)

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

Test files: `test/app.e2e-spec.ts`

---

## Development

```bash
# Format code
npm run format

# Lint with fixes
npm run lint

# Watch mode
npm run start:dev

# Debug mode
npm run start:debug
```

ESLint + Prettier configured. TypeScript strict mode enabled.

---

## Project Structure

```
src/
├── enrichment/          # API controller & service
│   ├── dto/            # Request/Response DTOs
│   └── enrichment.{controller,service,module}.ts
├── crawler/            # Website fetching (tiered strategy)
│   ├── interfaces/
│   └── crawler.{service,module}.ts
├── detector/           # Technology fingerprinting
│   ├── fingerprints/   # Wappalyzer database (technologies.json)
│   ├── interfaces/
│   └── detector.{service,module}.ts
├── firmographics/      # Company data extraction
│   ├── interfaces/
│   └── firmographics.{service,module}.ts
├── normalizer/         # Results standardization
│   └── normalizer.{service,module}.ts
├── app.module.ts       # Root module
└── main.ts            # Bootstrap

test/                  # E2E tests
```

---
