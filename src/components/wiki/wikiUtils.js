// Wiki helpers: slugs and titles.

// Mirrors Taiga's slugify closely enough for typical titles ("Meeting notes" -> "meeting-notes").
export const slugify = (text) => String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const titleFromSlug = (slug) => {
    if (!slug) return 'Untitled';
    const s = String(slug).replace(/[-_]+/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export const HOME_SLUG = 'home';

// If the page starts with a level-1 heading, that heading is its display title.
export const leadingHeading = (content) => {
    const m = String(content || '').match(/^\s*#\s+(.+?)\s*#*\s*$/m);
    if (!m) return null;
    const firstLine = String(content).trim().split('\n')[0];
    return firstLine.startsWith('# ') ? m[1].trim() : null;
};

export const pageTitle = (page) => (page ? leadingHeading(page.content) || titleFromSlug(page.slug) : '');
