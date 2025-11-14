import { Injectable, Logger } from '@nestjs/common';
import * as Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { NewsService } from './news.service';
import { GeminiService } from './gemini.service';
import axios from 'axios';

export interface NewsSource {
    name: string;
    url: string;
    category?: string;
}

@Injectable()
export class NewsCrawlerService {
    private readonly logger = new Logger(NewsCrawlerService.name);
    private parser: Parser;

    // Các nguồn tin RSS của Việt Nam
    private readonly newsSources: NewsSource[] = [
        // VNExpress
        { name: 'VNExpress - Công Nghệ', url: 'https://vnexpress.net/rss/so-hoa.rss', category: 'Công Nghệ' },
        { name: 'VNExpress - Giải Trí', url: 'https://vnexpress.net/rss/giai-tri.rss', category: 'Giải Trí' },
        { name: 'VNExpress - Thể Thao', url: 'https://vnexpress.net/rss/the-thao.rss', category: 'Thể Thao' },
        { name: 'VNExpress - Sức Khỏe', url: 'https://vnexpress.net/rss/suc-khoe.rss', category: 'Sức Khỏe' },
        { name: 'VNExpress - Du Lịch', url: 'https://vnexpress.net/rss/du-lich.rss', category: 'Du Lịch' },
        { name: 'VNExpress - Kinh Doanh', url: 'https://vnexpress.net/rss/kinh-doanh.rss', category: 'Kinh Doanh' },
        { name: 'VNExpress - Đời Sống', url: 'https://vnexpress.net/rss/gia-dinh.rss', category: 'Đời Sống' },

        // Tuổi Trẻ
        { name: 'Tuổi Trẻ - Công Nghệ', url: 'https://tuoitre.vn/rss/cong-nghe.rss', category: 'Công Nghệ' },
        { name: 'Tuổi Trẻ - Giải Trí', url: 'https://tuoitre.vn/rss/giai-tri.rss', category: 'Giải Trí' },
        { name: 'Tuổi Trẻ - Thể Thao', url: 'https://tuoitre.vn/rss/the-thao.rss', category: 'Thể Thao' },
        { name: 'Tuổi Trẻ - Du Lịch', url: 'https://tuoitre.vn/rss/du-lich.rss', category: 'Du Lịch' },
        { name: 'Tuổi Trẻ - Kinh Doanh', url: 'https://tuoitre.vn/rss/kinh-doanh.rss', category: 'Kinh Doanh' },

        // Dân Trí
        { name: 'Dân Trí - Công Nghệ', url: 'https://dantri.com.vn/rss/suc-manh-so.rss', category: 'Công Nghệ' },
        { name: 'Dân Trí - Giải Trí', url: 'https://dantri.com.vn/rss/giai-tri.rss', category: 'Giải Trí' },
        { name: 'Dân Trí - Thể Thao', url: 'https://dantri.com.vn/rss/the-thao.rss', category: 'Thể Thao' },
        { name: 'Dân Trí - Sức Khỏe', url: 'https://dantri.com.vn/rss/suc-khoe.rss', category: 'Sức Khỏe' },
        { name: 'Dân Trí - Du Lịch', url: 'https://dantri.com.vn/rss/du-lich.rss', category: 'Du Lịch' },

        // VietnamNet
        { name: 'VietnamNet - Công Nghệ', url: 'https://vietnamnet.vn/rss/cong-nghe.rss', category: 'Công Nghệ' },
        { name: 'VietnamNet - Giải Trí', url: 'https://vietnamnet.vn/rss/giai-tri.rss', category: 'Giải Trí' },
        { name: 'VietnamNet - Thể Thao', url: 'https://vietnamnet.vn/rss/the-thao.rss', category: 'Thể Thao' },
        { name: 'VietnamNet - Đời Sống', url: 'https://vietnamnet.vn/rss/doi-song.rss', category: 'Đời Sống' },
        { name: 'VietnamNet - Kinh Doanh', url: 'https://vietnamnet.vn/rss/kinh-doanh.rss', category: 'Kinh Doanh' },

        // Thanh Niên
        { name: 'Thanh Niên - Công Nghệ', url: 'https://thanhnien.vn/rss/cong-nghe.rss', category: 'Công Nghệ' },
        { name: 'Thanh Niên - Giải Trí', url: 'https://thanhnien.vn/rss/giai-tri.rss', category: 'Giải Trí' },
        { name: 'Thanh Niên - Thể Thao', url: 'https://thanhnien.vn/rss/the-thao.rss', category: 'Thể Thao' },
        { name: 'Thanh Niên - Sức Khỏe', url: 'https://thanhnien.vn/rss/suc-khoe.rss', category: 'Sức Khỏe' },
        { name: 'Thanh Niên - Đời Sống', url: 'https://thanhnien.vn/rss/doi-song.rss', category: 'Đời Sống' },
        
        // CafeF (chuyên Kinh Doanh)
        { name: 'CafeF - Kinh Doanh', url: 'https://cafef.vn/thi-truong.rss', category: 'Kinh Doanh' },
        { name: 'CafeF - Bất Động Sản', url: 'https://cafef.vn/bat-dong-san.rss', category: 'Kinh Doanh' },
    ];

    constructor(
        private newsService: NewsService,
        private geminiService: GeminiService,
    ) {
        this.parser = new Parser({
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
    }

    /**
     * Delay helper để rate limiting (30 requests/phút = 1 request/2 giây)
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Crawl tất cả các nguồn tin
     */
    async crawlAllSources(): Promise<void> {
        this.logger.log('Starting to crawl all news sources...');

        for (const source of this.newsSources) {
            try {
                await this.crawlSource(source);
                // Delay 2 giây giữa các nguồn RSS để rate limiting (30 requests/phút)
                await this.delay(5000);
            } catch (error) {
                this.logger.error(`Error crawling ${source.name}: ${error.message}`);
                // Vẫn delay ngay cả khi lỗi để tránh spam
                await this.delay(5000);
            }
        }

        this.logger.log('Finished crawling all news sources');
    }

    /**
     * Crawl một nguồn tin cụ thể
     */
    async crawlSource(source: NewsSource): Promise<void> {
        try {
            this.logger.log(`Crawling ${source.name}...`);

            // Parse RSS feed (1 request)
            const feed = await this.parser.parseURL(source.url);
            
            // Delay 2 giây sau khi parse RSS để rate limiting
            await this.delay(5000);

            if (!feed.items || feed.items.length === 0) {
                this.logger.warn(`No items found in ${source.name}`);
                return;
            }

            let newArticlesCount = 0;

            for (const item of feed.items.slice(0, 1)) { // Limit to 3 latest articles
                try {
                    // Check if article already exists
                    if (await this.newsService.existsByLink(item.link!)) {
                        // Delay ngay cả khi skip để đảm bảo rate limiting
                        await this.delay(5000);
                        continue;
                    }

                    // Clean title (decode HTML entities)
                    const cleanedTitle = this.cleanTitle(item.title);

                    // Extract content (có thể tạo request HTTP)
                    const content = await this.extractContent(item.link!, item.contentSnippet || '');
                    
                    // Delay 2 giây sau mỗi request để rate limiting (30 requests/phút)
                    await this.delay(5000);
                    
                    // Generate summary using Gemini
                    const summary = await this.geminiService.summarizeNews(
                        cleanedTitle,
                        content,
                    );

                    // Determine category (use source category or auto-categorize)
                    const category = source.category || await this.geminiService.categorizeNews(
                        cleanedTitle,
                        content,
                    );

                    // Extract image
                    const imageUrl = this.extractImageUrl(item);

                    // Save to database
                    await this.newsService.create({
                        link: item.link!,
                        title: cleanedTitle,
                        summary,
                        category,
                        source: source.name,
                        imageUrl,
                    });

                    newArticlesCount++;
                    this.logger.log(`Saved: ${cleanedTitle}`);
                } catch (error) {
                    const title = item.title ? this.cleanTitle(item.title) : 'Unknown';
                    this.logger.error(`Error processing article ${title}: ${error.message}`);
                    // Delay ngay cả khi lỗi để rate limiting
                    await this.delay(5000);
                }
            }

            this.logger.log(`Crawled ${source.name}: ${newArticlesCount} new articles`);
        } catch (error) {
            this.logger.error(`Error crawling source ${source.name}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Làm sạch tiêu đề: decode HTML entities và loại bỏ HTML tags
     */
    private cleanTitle(title: string | undefined): string {
        if (!title) {
            return 'Untitled';
        }

        let cleanedTitle = title;

        // Decode numeric HTML entities (&#039; -> ', &#8217; -> ', etc.)
        cleanedTitle = cleanedTitle.replace(/&#(\d+);/g, (match, dec) => {
            return String.fromCharCode(parseInt(dec, 10));
        });

        // Decode hexadecimal HTML entities (&#x27; -> ', etc.)
        cleanedTitle = cleanedTitle.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });

        // Bảng mapping đầy đủ các HTML entities (decode &amp; cuối cùng)
        const htmlEntities: { [key: string]: string } = {
            // Basic HTML entities
            '&quot;': '"',
            '&apos;': "'",
            '&#039;': "'",
            '&lt;': '<',
            '&gt;': '>',
            '&nbsp;': ' ',
            '&copy;': '©',
            '&reg;': '®',
            '&trade;': '™',
            '&hellip;': '…',
            '&mdash;': '—',
            '&ndash;': '–',
            '&lsquo;': '\u2018',
            '&rsquo;': '\u2019',
            '&ldquo;': '\u201C',
            '&rdquo;': '\u201D',
            '&sbquo;': '‚',
            '&bdquo;': '„',
            '&dagger;': '†',
            '&Dagger;': '‡',
            '&permil;': '‰',
            '&lsaquo;': '‹',
            '&rsaquo;': '›',
            '&oline;': '‾',
            '&euro;': '€',
            '&pound;': '£',
            '&yen;': '¥',
            '&cent;': '¢',
            '&curren;': '¤',
            '&brvbar;': '¦',
            '&sect;': '§',
            '&uml;': '¨',
            '&ordf;': 'ª',
            '&ordm;': 'º',
            '&not;': '¬',
            '&shy;': '',
            '&macr;': '¯',
            '&deg;': '°',
            '&plusmn;': '±',
            '&sup2;': '²',
            '&sup3;': '³',
            '&acute;': '´',
            '&micro;': 'µ',
            '&para;': '¶',
            '&middot;': '·',
            '&cedil;': '¸',
            '&sup1;': '¹',
            '&frac14;': '¼',
            '&frac12;': '½',
            '&frac34;': '¾',
            '&iquest;': '¿',
            '&times;': '×',
            '&divide;': '÷',
            // Vietnamese characters (lowercase)
            '&aacute;': 'á',
            '&agrave;': 'à',
            '&atilde;': 'ã',
            '&acirc;': 'â',
            '&auml;': 'ä',
            '&aring;': 'å',
            '&aelig;': 'æ',
            '&ccedil;': 'ç',
            '&eacute;': 'é',
            '&egrave;': 'è',
            '&ecirc;': 'ê',
            '&euml;': 'ë',
            '&iacute;': 'í',
            '&igrave;': 'ì',
            '&iuml;': 'ï',
            '&oacute;': 'ó',
            '&ograve;': 'ò',
            '&otilde;': 'õ',
            '&ocirc;': 'ô',
            '&ouml;': 'ö',
            '&oslash;': 'ø',
            '&uacute;': 'ú',
            '&ugrave;': 'ù',
            '&uuml;': 'ü',
            '&yacute;': 'ý',
            '&yuml;': 'ÿ',
            // Vietnamese characters (uppercase)
            '&Aacute;': 'Á',
            '&Agrave;': 'À',
            '&Atilde;': 'Ã',
            '&Acirc;': 'Â',
            '&Auml;': 'Ä',
            '&Aring;': 'Å',
            '&AElig;': 'Æ',
            '&Ccedil;': 'Ç',
            '&Eacute;': 'É',
            '&Egrave;': 'È',
            '&Ecirc;': 'Ê',
            '&Euml;': 'Ë',
            '&Iacute;': 'Í',
            '&Igrave;': 'Ì',
            '&Iuml;': 'Ï',
            '&Oacute;': 'Ó',
            '&Ograve;': 'Ò',
            '&Otilde;': 'Õ',
            '&Ocirc;': 'Ô',
            '&Ouml;': 'Ö',
            '&Oslash;': 'Ø',
            '&Uacute;': 'Ú',
            '&Ugrave;': 'Ù',
            '&Uuml;': 'Ü',
            '&Yacute;': 'Ý',
            // Special Vietnamese characters
            '&eth;': 'đ',
            '&ETH;': 'Đ',
            // Greek letters (common)
            '&alpha;': 'α',
            '&beta;': 'β',
            '&gamma;': 'γ',
            '&delta;': 'δ',
            '&epsilon;': 'ε',
            '&zeta;': 'ζ',
            '&eta;': 'η',
            '&theta;': 'θ',
            '&iota;': 'ι',
            '&kappa;': 'κ',
            '&lambda;': 'λ',
            '&mu;': 'μ',
            '&nu;': 'ν',
            '&xi;': 'ξ',
            '&pi;': 'π',
            '&rho;': 'ρ',
            '&sigma;': 'σ',
            '&tau;': 'τ',
            '&upsilon;': 'υ',
            '&phi;': 'φ',
            '&chi;': 'χ',
            '&psi;': 'ψ',
            '&omega;': 'ω',
            '&Alpha;': 'Α',
            '&Beta;': 'Β',
            '&Gamma;': 'Γ',
            '&Delta;': 'Δ',
            '&Epsilon;': 'Ε',
            '&Zeta;': 'Ζ',
            '&Eta;': 'Η',
            '&Theta;': 'Θ',
            '&Iota;': 'Ι',
            '&Kappa;': 'Κ',
            '&Lambda;': 'Λ',
            '&Mu;': 'Μ',
            '&Nu;': 'Ν',
            '&Xi;': 'Ξ',
            '&Pi;': 'Π',
            '&Rho;': 'Ρ',
            '&Sigma;': 'Σ',
            '&Tau;': 'Τ',
            '&Upsilon;': 'Υ',
            '&Phi;': 'Φ',
            '&Chi;': 'Χ',
            '&Psi;': 'Ψ',
            '&Omega;': 'Ω',
        };

        // Decode tất cả named HTML entities (trừ &amp; để decode cuối cùng)
        for (const [entity, char] of Object.entries(htmlEntities)) {
            cleanedTitle = cleanedTitle.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), char);
        }

        // Decode &amp; cuối cùng để tránh decode lại
        cleanedTitle = cleanedTitle.replace(/&amp;/g, '&');

        // Sử dụng cheerio để loại bỏ HTML tags nếu có
        const $ = cheerio.load(cleanedTitle);
        cleanedTitle = $.text().trim();

        // Loại bỏ khoảng trắng thừa và các ký tự đặc biệt không mong muốn
        cleanedTitle = cleanedTitle
            .replace(/\s+/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Loại bỏ zero-width characters
            .trim();

        return cleanedTitle || 'Untitled';
    }

    /**
     * Trích xuất nội dung từ URL
     */
    private async extractContent(url: string, fallbackContent: string): Promise<string> {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            const $ = cheerio.load(response.data);

            // Remove unwanted elements
            $('script, style, nav, footer, header, .ads, .advertisement').remove();

            // Try common content selectors
            let content = '';
            const selectors = [
                'article',
                '.article-content',
                '.content-detail',
                '.detail-content',
                '.fck_detail',
                '.content',
                'main',
            ];

            for (const selector of selectors) {
                const element = $(selector);
                if (element.length > 0) {
                    content = element.text().trim();
                    if (content.length > 100) {
                        break;
                    }
                }
            }

            // Fallback to body text if no content found
            if (!content || content.length < 100) {
                content = $('body').text().trim();
            }

            // Clean up content
            content = content
                .replace(/\s+/g, ' ')
                .substring(0, 2000); // Limit to 2000 characters

            return content || fallbackContent;
        } catch (error) {
            this.logger.warn(`Error extracting content from ${url}: ${error.message}`);
            return fallbackContent;
        }
    }

    /**
     * Trích xuất URL hình ảnh từ RSS item
     */
    private extractImageUrl(item: any): string | undefined {
        try {
            // Try to get image from enclosure
            if (item.enclosure && item.enclosure.url) {
                return item.enclosure.url;
            }

            // Try to get image from content
            if (item.content) {
                const $ = cheerio.load(item.content);
                const img = $('img').first();
                if (img.length > 0) {
                    return img.attr('src');
                }
            }

            // Try to get image from description
            if (item.description) {
                const $ = cheerio.load(item.description);
                const img = $('img').first();
                if (img.length > 0) {
                    return img.attr('src');
                }
            }

            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Lấy danh sách nguồn tin
     */
    getNewsSources(): NewsSource[] {
        return this.newsSources;
    }
}

