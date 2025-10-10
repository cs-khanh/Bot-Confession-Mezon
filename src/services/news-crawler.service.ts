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
     * Crawl tất cả các nguồn tin
     */
    async crawlAllSources(): Promise<void> {
        this.logger.log('Starting to crawl all news sources...');

        for (const source of this.newsSources) {
            try {
                await this.crawlSource(source);
            } catch (error) {
                this.logger.error(`Error crawling ${source.name}: ${error.message}`);
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

            const feed = await this.parser.parseURL(source.url);

            if (!feed.items || feed.items.length === 0) {
                this.logger.warn(`No items found in ${source.name}`);
                return;
            }

            let newArticlesCount = 0;

            for (const item of feed.items.slice(0, 10)) { // Limit to 10 latest articles
                try {
                    // Check if article already exists
                    if (await this.newsService.existsByLink(item.link!)) {
                        continue;
                    }

                    // Extract content
                    const content = await this.extractContent(item.link!, item.contentSnippet || '');
                    
                    // Generate summary using Gemini
                    const summary = await this.geminiService.summarizeNews(
                        item.title || '',
                        content,
                    );

                    // Determine category (use source category or auto-categorize)
                    const category = source.category || await this.geminiService.categorizeNews(
                        item.title || '',
                        content,
                    );

                    // Extract image
                    const imageUrl = this.extractImageUrl(item);

                    // Save to database
                    await this.newsService.create({
                        link: item.link!,
                        title: item.title || 'Untitled',
                        summary,
                        category,
                        source: source.name,
                        imageUrl,
                    });

                    newArticlesCount++;
                    this.logger.log(`Saved: ${item.title}`);
                } catch (error) {
                    this.logger.error(`Error processing article ${item.title}: ${error.message}`);
                }
            }

            this.logger.log(`Crawled ${source.name}: ${newArticlesCount} new articles`);
        } catch (error) {
            this.logger.error(`Error crawling source ${source.name}: ${error.message}`);
            throw error;
        }
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

