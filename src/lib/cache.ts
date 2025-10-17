interface CacheEntry {
  data: string;
  timestamp: number;
}

class DataCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  private extractTextContent(html: string): string {
    // Remove script and style tags first
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Extract text from specific content areas (common in Google Sites)
    const contentPatterns = [
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<div[^>]*role="main"[^>]*>([\s\S]*?)<\/div>/gi
    ];
    
    let extractedContent = '';
    for (const pattern of contentPatterns) {
      const matches = html.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          extractedContent += match[1] + '\n';
        }
      }
    }
    
    // If no specific content areas found, extract all text
    if (!extractedContent) {
      // Remove all HTML tags but keep the text
      text = text.replace(/<[^>]*>/g, ' ');
      // Clean up excessive whitespace
      text = text.replace(/\s+/g, ' ').trim();
      extractedContent = text;
    } else {
      // Clean the extracted content
      extractedContent = extractedContent.replace(/<[^>]*>/g, ' ');
      extractedContent = extractedContent.replace(/\s+/g, ' ').trim();
    }
    
    return extractedContent;
  }

  private wrapInCleanHtml(content: string, title: string = 'Privacy Policy'): string {
    // Create a clean HTML page with no JavaScript
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        p {
            margin: 15px 0;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
</body>
</html>`;
  }

  async fetchData(key: string, url: string, isHtml: boolean = false, skipCache: boolean = false): Promise<string> {
    const cached = skipCache ? undefined : this.cache.get(key);
    const now = Date.now();

    if (!skipCache && cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AppAdsBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${url}: ${response.statusText}`);
      }

      let data = await response.text();
      
      // For HTML content, extract text and wrap in clean HTML
      if (isHtml) {
        const textContent = this.extractTextContent(data);
        data = this.wrapInCleanHtml(textContent);
      }
      
      if (!skipCache) {
        this.cache.set(key, {
          data,
          timestamp: now
        });
      }

      return data;
    } catch (error) {
      if (!skipCache && cached) {
        console.error(`Error fetching data from ${url}, using cached version:`, error);
        return cached.data;
      }
      throw error;
    }
  }
}

export const dataCache = new DataCache();