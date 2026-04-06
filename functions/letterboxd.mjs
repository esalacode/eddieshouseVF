
export default async (request) => {
  const url = new URL(request.url);
  const username = (url.searchParams.get('user') || process.env.LETTERBOXD_USERNAME || 'eddieslb').trim();
  const maxPages = Math.max(1, Math.min(30, Number(url.searchParams.get('pages') || 20)));

  const headers = {
    'user-agent': 'Mozilla/5.0 (compatible; MyHouseLetterboxd/1.0; +https://www.netlify.com/)',
    'accept-language': 'en-US,en;q=0.9'
  };

  try {
    const reviews = await fetchRecentReviews(username, headers);
    return json({ username, source: 'rss', reviews });
  } catch (rssError) {
    try {
      const reviews = await fetchPagedReviews(username, maxPages, headers);
      return json({ username, source: 'html', reviews });
    } catch (htmlError) {
      return json(
        {
          username,
          error: 'Unable to fetch Letterboxd reviews.',
          details: {
            rss: String(rssError && rssError.message || rssError),
            html: String(htmlError && htmlError.message || htmlError)
          },
          reviews: []
        },
        502
      );
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300'
    }
  });
}

async function fetchRecentReviews(username, headers) {
  const rssUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
  const res = await fetch(rssUrl, { headers });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((m) => m[1]);
  if (!items.length) throw new Error('RSS contained no items');

  const reviews = items.map((item, index) => {
    const titleRaw = decodeXml(extractTag(item, 'title') || '');
    const link = decodeXml(extractTag(item, 'link') || '');
    const pubDate = decodeXml(extractTag(item, 'pubDate') || '');
    const description = decodeXml(extractTag(item, 'description') || '');
    const content = decodeXml(extractNamespacedTag(item, 'content:encoded') || description || '');

    const film = titleRaw
      .replace(/\s+reviewed by.*$/i, '')
      .replace(/\s+\(\d{4}\).*$/, '')
      .trim() || cleanFilmFromLink(link);

    const yearMatch = titleRaw.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : '';

    const ratingMatch = titleRaw.match(/[★½]+/);
    const rating = ratingMatch ? ratingMatch[0] : '';

    const plain = htmlToText(content || description);
    return {
      id: `rss-${index + 1}`,
      film,
      year,
      rating,
      date: pubDate,
      watchedDate: formatDate(pubDate),
      snippet: firstSentence(plain, 180),
      body: plain,
      url: link
    };
  }).filter((r) => r.film && r.body);

  if (!reviews.length) throw new Error('RSS parse returned no usable reviews');
  return reviews;
}

async function fetchPagedReviews(username, maxPages, headers) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = page === 1
      ? `https://letterboxd.com/${encodeURIComponent(username)}/reviews/`
      : `https://letterboxd.com/${encodeURIComponent(username)}/reviews/films/page/${page}/`;

    const res = await fetch(pageUrl, { headers });
    if (res.status === 404) break;
    if (!res.ok) throw new Error(`HTML ${res.status} on page ${page}`);

    const html = await res.text();
    const pageReviews = parseHtmlReviews(html, page);
    if (!pageReviews.length) break;
    all.push(...pageReviews);

    if (!/Older|page\/\d+/i.test(html)) break;
  }

  if (!all.length) throw new Error('HTML parse returned no reviews');
  return dedupeBy(all, (r) => `${r.film}|${r.date}|${r.body}`);
}

function parseHtmlReviews(html, pageNumber) {
  const blocks = [
    ...html.matchAll(/<article[\s\S]*?<\/article>/gi),
    ...html.matchAll(/<li[\s\S]*?<\/li>/gi)
  ].map((m) => m[0]);

  const reviews = [];
  for (const block of blocks) {
    if (!/(This review may contain spoilers|Translate|Liked|Watched|Added)/i.test(block)) continue;
    const film = findFirst(block, [
      /<h2[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h2>/i,
      /<h2[^>]*>([\s\S]*?)<\/h2>/i,
      /<img[^>]+alt="([^"]+)"/i
    ]);
    if (!film) continue;

    const year = findFirst(block, [/\b(19|20)\d{2}\b/]);
    const rating = findFirst(block, [/[★½]+/]);
    const date = findFirst(block, [
      /\b\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}\b/,
      /\b[A-Z][a-z]{2,8}\s+\d{1,2},\s+\d{4}\b/
    ]);

    let body = '';
    const bodyMatch = findFirst(block, [
      /<div[^>]*class="[^"]*body-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<p[^>]*class="[^"]*body-text[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
      /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i,
      /<p>([\s\S]*?)<\/p>/i
    ], true);

    if (bodyMatch) body = htmlToText(bodyMatch);
    body = body.replace(/^This review may contain spoilers\.?\s*/i, '').trim();
    if (!body) continue;

    const filmText = htmlToText(film).trim();
    if (!filmText || filmText.length > 160) continue;

    reviews.push({
      id: `page-${pageNumber}-${reviews.length + 1}`,
      film: filmText,
      year: year || '',
      rating: rating || '',
      date: date || '',
      watchedDate: date || '',
      snippet: firstSentence(body, 180),
      body
    });
  }

  return dedupeBy(reviews, (r) => `${r.film}|${r.date}|${r.body}`);
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1] : '';
}

function extractNamespacedTag(xml, tag) {
  const safe = tag.replace(':', '\\:');
  const match = xml.match(new RegExp(`<${safe}>([\\s\\S]*?)<\\/${safe}>`, 'i'));
  return match ? match[1] : '';
}

function cleanFilmFromLink(link) {
  try {
    const parts = new URL(link).pathname.split('/').filter(Boolean);
    const slug = parts[1] || '';
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return '';
  }
}

function firstSentence(text, maxLen = 180) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentence = clean.match(/^(.{1,180}?[.!?])(\s|$)/);
  if (sentence) return sentence[1];
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

function formatDate(input) {
  if (!input) return '';
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return input;
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function decodeXml(str) {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function htmlToText(html) {
  return decodeXml(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function findFirst(text, regexes, returnRaw = false) {
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match) return returnRaw ? match[1] || match[0] : htmlToText(match[1] || match[0]).trim();
  }
  return '';
}
