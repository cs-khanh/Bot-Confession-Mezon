import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private genAI: GoogleGenerativeAI;
    private model: any;
    private lastApiCall: number = 0;
    private readonly minDelayBetweenCalls = 3000; // 3 giây giữa các lần gọi (20 requests/phút)

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY not found in environment variables');
        } else {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        }
    }

    /**
     * Delay để rate limiting cho Gemini API
     */
    private async rateLimitDelay(): Promise<void> {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        
        if (timeSinceLastCall < this.minDelayBetweenCalls) {
            const waitTime = this.minDelayBetweenCalls - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastApiCall = Date.now();
    }

    /**
     * Retry với exponential backoff khi gặp rate limit
     */
    private async retryWithBackoff<T>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 5000
    ): Promise<T> {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                const isRateLimit = error.message?.includes('429') || 
                                   error.message?.includes('RATE_LIMIT_EXCEEDED') ||
                                   error.message?.includes('Quota exceeded');
                
                if (isRateLimit && attempt < maxRetries - 1) {
                    const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
                    this.logger.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }
        throw new Error('Max retries exceeded');
    }

    /**
     * Tạo tóm tắt tin tức từ nội dung
     */
    async summarizeNews(title: string, content: string): Promise<string> {
        if (!this.model) {
            this.logger.warn('Gemini model not initialized, returning original title');
            return title;
        }

        // Rate limiting: delay trước khi gọi API
        await this.rateLimitDelay();

        try {
            const prompt = `Bạn là một biên tập viên tin tức chuyên nghiệp. Hãy tạo một đoạn tóm tắt ngắn gọn, hấp dẫn (khoảng 2-3 câu, tối đa 150 từ) từ tiêu đề và nội dung tin tức sau đây. Tóm tắt phải súc tích, dễ hiểu và thu hút người đọc.

            Tiêu đề: ${title}

            Nội dung: ${content}

            Tóm tắt (chỉ trả về nội dung tóm tắt, không thêm bất kỳ chú thích nào):`;

            const summary = await this.retryWithBackoff(async () => {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                if (!text || text.trim().length === 0) {
                    this.logger.warn('Empty summary received from Gemini');
                    return title;
                }

                return text.trim();
            });

            return summary;
        } catch (error) {
            this.logger.error(`Error generating summary with Gemini: ${error.message}`);
            // Fallback to title if Gemini fails
            return title;
        }
    }

    /**
     * Tạo tóm tắt ngắn từ HTML content
     */
    async summarizeFromHtml(title: string, htmlContent: string): Promise<string> {
        // Remove HTML tags and extract text
        const textContent = htmlContent
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 1000); // Limit to first 1000 characters

        return this.summarizeNews(title, textContent);
    }

    /**
     * Phân loại chủ đề tin tức
     */
    async categorizeNews(title: string, content: string): Promise<string> {
        if (!this.model) {
            this.logger.warn('Gemini model not initialized, returning default category');
            return 'Tổng hợp';
        }

        // Rate limiting: delay trước khi gọi API
        await this.rateLimitDelay();

        try {
            const prompt = `Bạn là một chuyên gia phân loại tin tức. Hãy phân loại tin tức sau đây vào MỘT trong các chủ đề sau:
- Công Nghệ (Technology)
- Kinh Doanh (Business)
- Giải Trí (Entertainment)
- Thể Thao (Sports)
- Đời Sống (Lifestyle)
- Giáo Dục (Education)
- Sức Khỏe (Health)
- Du Lịch (Travel)
- Tổng hợp (General)

Tiêu đề: ${title}
Nội dung: ${content}

Chỉ trả về TÊN CHỦ ĐỀ bằng tiếng Việt (ví dụ: "Công Nghệ", "Giải Trí"), không giải thích gì thêm:`;

            const category = await this.retryWithBackoff(async () => {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().trim();

                // Validate category
                const validCategories = [
                    'Công Nghệ',
                    'Kinh Doanh',
                    'Giải Trí',
                    'Thể Thao',
                    'Đời Sống',
                    'Giáo Dục',
                    'Sức Khỏe',
                    'Du Lịch',
                    'Tổng hợp',
                ];

                if (validCategories.includes(text)) {
                    return text;
                }

                this.logger.warn(`Invalid category received: ${text}, using default`);
                return 'Tổng hợp';
            });

            return category;
        } catch (error) {
            this.logger.error(`Error categorizing news with Gemini: ${error.message}`);
            return 'Tổng hợp';
        }
    }
}


