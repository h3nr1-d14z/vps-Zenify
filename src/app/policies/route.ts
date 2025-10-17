import { NextResponse } from 'next/server';
import { dataCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Always fetch fresh

export async function GET() {
  const url = process.env.POLICIES_URL;
  const renderMode = (process.env.POLICIES_MODE || 'embed').toLowerCase(); // 'embed' | 'text'

  if (!url) {
    return new NextResponse('POLICIES_URL environment variable is not configured', {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      }
    });
  }

  try {
    if (renderMode === 'text' || renderMode === 'clean' || renderMode === 'simple') {
      const html = await dataCache.fetchData('policies-clean', url, true, true); // skipCache=true
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Security-Policy': "default-src 'self'; img-src * data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; script-src 'none'; form-action 'none'",
          'Referrer-Policy': 'no-referrer',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AppPoliciesBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch policies page: ${res.status} ${res.statusText}`);
    }

    let html = await res.text();

    const { origin, href } = new URL(url);
    const baseHref = href.endsWith('/') ? href : href.substring(0, href.lastIndexOf('/') + 1);

    html = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\s(on[a-z]+)=("[^"]*"|'[^']*')/gi, '')
      .replace(/(href|src)=("|')\s*javascript:[^"']*(\2)/gi, '')
      .replace(/<meta[^>]+http-equiv=["']refresh["'][^>]*>/gi, '')
      .replace(/<base[^>]*>/gi, '')
      .replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '');

    html = html.replace(/(\s(?:href|src|action)=("|'))\/(?!\/)([^"']*)(\2)/gi, (_m, p1, q, path, p4) => {
      return `${p1}${origin}/${path}${p4}`;
    });

    html = html.replace(/<a(\s[^>]*)?>/gi, (m) => {
      if (!/href\s*=/.test(m)) return m;
      const out = m.replace(/\s(target|rel)=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      return out.replace(/>$/, " target=\"_blank\" rel=\"noopener noreferrer\">");
    });

    if (!/<head[\s>]/i.test(html)) {
      html = `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;
    }

    html = html.replace(/<head[^>]*>/i, match => `${match}<base href="${baseHref}">`);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'self'; img-src * data: blob:; style-src * 'unsafe-inline'; font-src * data:; connect-src 'none'; frame-ancestors *; object-src 'none'; script-src 'none'; form-action 'none'",
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error embedding policies:', error);
    return new NextResponse('<html><body><h1>Error</h1><p>Failed to load policy content.</p></body></html>', {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}