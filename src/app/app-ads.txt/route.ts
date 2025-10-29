import { NextResponse } from 'next/server';
import { dataCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Always fetch fresh

function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            // Toggle quote state, but handle escaped double quotes ""
            if (inQuote && line[i + 1] === '"') {
                cur += '"';
                i++; // skip escaped quote
            } else {
                inQuote = !inQuote;
            }
            continue;
        }
        if (ch === ',' && !inQuote) {
            fields.push(cur);
            cur = '';
            continue;
        }
        cur += ch;
    }
    fields.push(cur);
    return fields.map(f => f.trim());
}

function normalizeAppAds(raw: string): string {
    const lines = raw.split(/\r?\n/);
    const out: string[] = [];

    for (const rawLine of lines) {
        if (!rawLine) {
            out.push('');
            continue;
        }

        const trimmed = rawLine.trim();
        if (!trimmed) { out.push(''); continue; }

        // Preserve comments
        if (trimmed.startsWith('#')) {
            out.push(trimmed);
            continue;
        }

        // If line looks like HTML, skip it (should be handled earlier)
        if (/<html|<head|<body|<a\s+/i.test(trimmed)) {
            continue;
        }

        // Parse respecting quoted commas
        const fields = parseCsvLine(trimmed).map(f => {
            // strip surrounding quotes if present
            if ((f.startsWith('"') && f.endsWith('"')) || (f.startsWith("'") && f.endsWith("'"))) {
                return f.substring(1, f.length - 1).replace(/""/g, '"');
            }
            return f.replace(/"/g, '').replace(/'/g, '');
        }).filter(f => f !== '');

        if (fields.length === 0) continue;

        // Expected format: domain, publisher id, DIRECT|RESELLER, certification_authority_id (optional 4th field)
        let domain = fields[0] || '';
        let pubId = fields[1] || '';
        let rel = (fields[2] || '').toUpperCase();
        let certAuthId = fields[3] || ''; // Optional 4th field

        // If the line was a single CSV cell that contains commas (e.g. the whole row wrapped in quotes),
        // attempt to split by commas inside that value as fallback
        if (!pubId && domain.includes(',')) {
            const parts = domain.split(',').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
                domain = parts[0];
                pubId = parts[1];
                rel = (parts[2] || rel).toUpperCase();
                certAuthId = parts[3] || '';
            }
        }

        if (!domain || !pubId) continue; // invalid row

        // Normalize relation
        if (rel !== 'DIRECT' && rel !== 'RESELLER') {
            // Try to infer or default to DIRECT
            if (/direct/i.test(rel)) rel = 'DIRECT';
            else if (/resell/i.test(rel)) rel = 'RESELLER';
            else rel = 'DIRECT';
        }

        // Final sanitize: remove internal whitespace from domain, publisher id, and cert auth id
        domain = domain.trim();
        pubId = pubId.trim();
        certAuthId = certAuthId.trim();

        // Include the 4th field if present
        if (certAuthId) {
            out.push(`${domain}, ${pubId}, ${rel}, ${certAuthId}`);
        } else {
            out.push(`${domain}, ${pubId}, ${rel}`);
        }
    }

    return out.join('\n');
}

export async function GET() {
    const url = process.env.APP_ADS_URL;

    if (!url) {
        return new NextResponse('APP_ADS_URL environment variable is not configured', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
            }
        });
    }

    try {
        const data = await dataCache.fetchData('app-ads', url, false, true); // skipCache=true

        // Normalize CSV-style responses where each entry may be wrapped in quotes
        const normalized = normalizeAppAds(data);

        return new NextResponse(normalized, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error fetching app-ads.txt:', error);
        return new NextResponse('Failed to fetch app-ads.txt content', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
            }
        });
    }
}