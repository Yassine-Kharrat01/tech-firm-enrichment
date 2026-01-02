/**
 * Technology taxonomy - maps technologies to high-level categories
 * This is a config-driven approach for easy updates
 */

export const CATEGORY_MAPPING: Record<string, string[]> = {
    analytics: [
        'Google Analytics',
        'Mixpanel',
        'Segment',
        'Amplitude',
        'Heap',
        'Hotjar',
        'Facebook Pixel',
        'LinkedIn Insight Tag',
        'Twitter Pixel',
        'TikTok Pixel',
    ],
    cms: [
        'WordPress',
        'Wix',
        'Squarespace',
        'Webflow',
        'Drupal',
        'Joomla',
        'Ghost',
    ],
    ecommerce: [
        'Shopify',
        'WooCommerce',
        'Magento',
        'BigCommerce',
        'PrestaShop',
    ],
    framework: [
        'React',
        'Vue.js',
        'Angular',
        'Next.js',
        'Nuxt.js',
        'Gatsby',
        'Svelte',
        'Astro',
        'Remix',
        'jQuery',
    ],
    css_framework: [
        'Bootstrap',
        'Tailwind CSS',
        'Material-UI',
        'Bulma',
    ],
    backend: [
        'Node.js',
        'PHP',
        'Ruby on Rails',
        'Laravel',
        'Django',
        'ASP.NET',
    ],
    server: [
        'Nginx',
        'Apache',
    ],
    cdn: [
        'Cloudflare',
        'Cloudinary',
        'Imgix',
        'Amazon Web Services',
    ],
    hosting: [
        'Vercel',
        'Netlify',
        'Amazon Web Services',
        'Google Cloud',
        'Azure',
    ],
    marketing: [
        'HubSpot',
        'Mailchimp',
        'Klaviyo',
        'Marketo',
        'ActiveCampaign',
    ],
    crm: [
        'Salesforce',
        'HubSpot',
        'Pipedrive',
        'Zoho CRM',
    ],
    chat: [
        'Intercom',
        'Zendesk',
        'Drift',
        'Crisp',
        'Tawk.to',
    ],
    payment: [
        'Stripe',
        'PayPal',
        'Square',
        'Braintree',
    ],
    tag_manager: [
        'Google Tag Manager',
    ],
    ab_testing: [
        'Optimizely',
        'VWO',
        'Google Optimize',
    ],
    monitoring: [
        'Sentry',
        'Datadog',
        'New Relic',
        'LogRocket',
    ],
    security: [
        'reCAPTCHA',
        'hCaptcha',
        'Cloudflare',
    ],
    database: [
        'Firebase',
        'Supabase',
        'MongoDB',
        'PostgreSQL',
    ],
    search: [
        'Algolia',
        'Elasticsearch',
    ],
    maps: [
        'Google Maps',
        'Mapbox',
    ],
    video: [
        'YouTube',
        'Vimeo',
        'Wistia',
    ],
    fonts: [
        'Google Fonts',
        'Font Awesome',
        'Adobe Fonts',
    ],
    advertising: [
        'Google Ads',
        'Facebook Pixel',
        'LinkedIn Insight Tag',
        'Twitter Pixel',
        'TikTok Pixel',
    ],
    forms: [
        'Typeform',
        'Calendly',
        'JotForm',
    ],
};

/**
 * Reverse lookup: technology name -> normalized category
 */
export function getTechCategory(techName: string): string | null {
    for (const [category, techs] of Object.entries(CATEGORY_MAPPING)) {
        if (techs.includes(techName)) {
            return category;
        }
    }
    return null;
}

/**
 * Get display name for category
 */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
    analytics: 'Analytics',
    cms: 'CMS',
    ecommerce: 'E-commerce',
    framework: 'JavaScript Framework',
    css_framework: 'CSS Framework',
    backend: 'Backend',
    server: 'Web Server',
    cdn: 'CDN',
    hosting: 'Hosting',
    marketing: 'Marketing Automation',
    crm: 'CRM',
    chat: 'Live Chat',
    payment: 'Payment',
    tag_manager: 'Tag Manager',
    ab_testing: 'A/B Testing',
    monitoring: 'Monitoring',
    security: 'Security',
    database: 'Database',
    search: 'Search',
    maps: 'Maps',
    video: 'Video',
    fonts: 'Fonts',
    advertising: 'Advertising',
    forms: 'Forms',
};
