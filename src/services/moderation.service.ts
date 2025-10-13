import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface ModerationResult {
    isSpam: boolean;
    isToxic: boolean;
    spamScore: number;
    toxicScore: number;
    tags: string[];
    message?: string;
    autoDecision?: 'approve' | 'reject' | 'manual';
    reason?: string;
    hasImageContent?: boolean; // Flag để biết nội dung có hình ảnh hay không
    imageAnalysisSuccess?: boolean; // Flag để biết việc phân tích hình ảnh có thành công hay không
    categories?: Record<string, boolean>; // Danh sách các category từ Gemini API
    content?: string; // Nội dung được phân tích
    language?: string; // Ngôn ngữ của nội dung
}

// Template cho prompt gửi đến Gemini API
// const GEMINI_MODERATION_PROMPT_TEMPLATE = `
// Bạn là hệ thống KIỂM DUYỆT cho ứng dụng Confession.
// NHIỆM VỤ: Phân tích nội dung (và HÌNH ẢNH nếu có) theo tiêu chí dưới đây:

// Tiêu chí phân loại:
// - APPROVE: Nội dung tích cực, chia sẻ cá nhân lành mạnh, xin thông tin ai đó, chia sẻ học tập, công nghệ, giáo dục, đời sống, tình cảm, tình yêu, công việc, sức khỏe, các chủ đề xã hội tích cực
// - REJECT: Nội dung quấy rối, thù địch, spam, từ ngữ tục tĩu, xúc phạm nặng, bạo lực, nội dung 18+, nội dung nguy hiểm, tự tử, ma túy, vũ khí, khủng bố

// Yêu cầu đánh giá:
// 1) Hiểu teencode/lách chữ, đa ngôn ngữ, emoji, ẩn ý/mỉa mai.
// 2) Với hình ảnh/meme/screenshot: đọc chữ trong ảnh (OCR), xem ngữ cảnh biểu tượng/cử chỉ, check trang phục/hành vi 18+ hoặc bạo lực/ma túy/vũ khí.
// 3) Ưu tiên an toàn người dùng; nếu nghi ngờ có vi phạm rõ rệt → REJECT.
// Gán nhãn nội dung tags nếu có, ví dụ: ["love", "school", "family", "friends", "study", "work", "health"...]. Nếu không có thể gán rỗng.
// Trả về kết quả dưới dạng JSON đơn giản với các trường:
// - decision: "APPROVE" hoặc "REJECT"
// - reason: lý do ngắn gọn cho quyết định
// - tags: mảng các từ khóa/chủ đề liên quan đến nội dung 

// Nội dung cần phân tích: "$CONTENT"
// `;
const GEMINI_MODERATION_PROMPT_TEMPLATE = `

Bạn là hệ thống KIỂM DUYỆT cho ứng dụng Confession.

NHIỆM VỤ: Phân tích nội dung (và HÌNH ẢNH nếu có) với mức độ kiểm duyệt nhẹ nhàng, ngoại trừ các nội dung liên quan đến chính trị, tôn giáo, và chủ quyền lãnh thổ Việt Nam (kiểm duyệt mạnh).

Tiêu chí phân loại:

- APPROVE: Nội dung lành mạnh, tích cực, bao gồm chia sẻ cá nhân, hỏi thông tin, học tập, công nghệ, giáo dục, đời sống, tình cảm, tình yêu, công việc, sức khỏe, hoặc các chủ đề xã hội không nhạy cảm. Những nội dung 18+, tục tĩu, bạo lực ở mức độ nhẹ thì vẫn cho phép.

- REJECT:

  - Nội dung chứa quấy rối, thù địch, spam, từ ngữ tục tĩu nghiêm trọng, xúc phạm nặng, bạo lực, nội dung 18+, nội dung nguy hiểm (tự tử, ma túy, vũ khí, khủng bố).

  - Nội dung liên quan đến chính trị, tôn giáo, hoặc chủ quyền lãnh thổ Việt Nam có dấu hiệu kích động, gây tranh cãi, hoặc vi phạm pháp luật.

Yêu cầu đánh giá:

1. Hiểu teencode, lách chữ, đa ngôn ngữ, emoji, ẩn ý, hoặc mỉa mai.

2. Với hình ảnh/meme/screenshot:

   - Đọc chữ trong ảnh (OCR).

   - Phân tích ngữ cảnh, biểu tượng, cử chỉ.

   - Kiểm tra trang phục/hành vi liên quan đến nội dung 18+, bạo lực, ma túy, vũ khí, hoặc các chủ đề nhạy cảm về chính trị, tôn giáo, chủ quyền lãnh thổ Việt Nam.

3. Ưu tiên trải nghiệm người dùng; chỉ REJECT khi nội dung vi phạm rõ ràng hoặc thuộc các chủ đề nhạy cảm (chính trị, tôn giáo, chủ quyền lãnh thổ).

4. Gán nhãn nội dung bằng các tag (nếu có), ví dụ: ["love", "school", "family", "friends", "study", "work", "health"]. Nếu không có tag phù hợp, để mảng rỗng.

Định dạng trả về: JSON với các trường:

    - decision: "APPROVE" hoặc "REJECT".

    - reason: Lý do ngắn gọn cho quyết định.

    - tags: Mảng các từ khóa/chủ đề liên quan đến nội dung.

Nội dung cần phân tích: "$CONTENT"

`;

@Injectable()
export class ModerationService {
    private readonly logger = new Logger(ModerationService.name);
    private readonly bannedWords: string[] = [
        'spam', 'scam', 'hack', 'crack', 'illegal', 'free download', 
        'tào lao', 'linh tinh', 'vô nghĩa', 'test', 'testing', 'kiểm tra', 'thử nghiệm',
        'aaaaaa', 'bbbbb', 'cccccc', 'ddddd', 'eeeee', 'fffff', 'ggggg', 'hhhhh',
        'jjjjj', 'kkkkk', 'lllll', 'mmmmm', 'nnnnn', 'ooooo', 'ppppp', 'qqqqq',
        'rrrrr', 'sssss', 'ttttt', 'uuuuu', 'vvvvv', 'wwwww', 'xxxxx', 'yyyyy', 'zzzzz',
        'asdfghjkl', 'qwertyuiop', 'zxcvbnm'
    ];
    private readonly toxicWords: string[] = [
        'hate', 'kill', 'attack', 'threat', 'abuse', 'đụ', 'đít', 'lồn', 'cặc', 'buồi', 'cu', 
        'địt', 'đéo', 'đĩ', 'cave', 'fuck', 'cunt', 'dick', 'pussy', 'penis', 'vagina', 'sex',
        'chết', 'giết', 'đấm', 'đánh', 'bắn'
    ];
    private readonly useAI: boolean;
    private readonly geminiApiKey: string;
    private genAI: GoogleGenerativeAI | null = null;

    constructor(private configService: ConfigService) {
        this.useAI = this.configService.get<string>('AI_MODERATION_ENABLED') === 'true';
        this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
        
        // Khởi tạo Gemini API
        if (this.useAI && this.geminiApiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
                // Kiểm tra API key bằng cách tạo một model đơn giản
                const testModel = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                this.logger.log('Initialized Gemini API for moderation successfully');
            } catch (error) {
                this.logger.error(`Failed to initialize Gemini API: ${error.message}`);
                this.useAI = false;
                this.logger.warn('AI moderation disabled due to Gemini initialization failure');
            }
        } else {
            this.logger.warn('AI moderation disabled - missing API key or disabled in config');
        }
    }

    async moderateContent(content: string, attachments?: any[]): Promise<ModerationResult> {
        // Đảm bảo attachments là một mảng, ngay cả khi là null hoặc undefined
        const safeAttachments = attachments || [];
        const hasAttachments = safeAttachments.length > 0;
        
        // Log thông tin về message đang được kiểm duyệt
        this.logger.log(`Moderating content: text length=${content.length}, hasAttachments=${hasAttachments}, attachmentsCount=${safeAttachments.length}`);
        
        if (hasAttachments) {
            this.logger.log(`Attachment details: ${JSON.stringify(safeAttachments.map(a => 
                ({url: a.url ? 'exists' : 'missing', type: a.mime_type || a.mimeType || a.type || 'unknown'})))}`);
        }
        
        const normalizedContent = content.toLowerCase();
        // Trích xuất tags từ nội dung trước khi dùng AI
        const extractedTags = this.extractTags(content);
        this.logger.debug(`Extracted tags from content: ${JSON.stringify(extractedTags)}`);
        
        const result: ModerationResult = {
            isSpam: false,
            isToxic: false,
            spamScore: 0,
            toxicScore: 0,
            tags: extractedTags, // Gán tags trích xuất từ nội dung
            autoDecision: 'manual', // Mặc định là cần kiểm duyệt thủ công
            hasImageContent: hasAttachments // Thêm flag để theo dõi có hình ảnh hay không
        };

        // Rule-based moderation for text content
        result.spamScore = this.calculateSpamScore(normalizedContent);
        result.toxicScore = this.calculateToxicScore(normalizedContent);
        result.isSpam = result.spamScore > 0.7;
        result.isToxic = result.toxicScore > 0.7;

        // AI-based moderation if enabled
        if (this.useAI) {
            try {
                let aiResult: ModerationResult;
                
                // Sử dụng Gemini API
                if (hasAttachments) {
                    // For content with attachments, use multimodal moderation
                    aiResult = await this.moderateWithGeminiMultimodal(content, safeAttachments);
                } else {
                    // For text-only content, use standard text moderation
                    aiResult = await this.moderateWithGemini(content);
                }
                
                // Combine rule-based and AI results
                result.isSpam = result.isSpam || aiResult.isSpam;
                result.isToxic = result.isToxic || aiResult.isToxic;
                result.spamScore = Math.max(result.spamScore, aiResult.spamScore);
                result.toxicScore = Math.max(result.toxicScore, aiResult.toxicScore);
                if (aiResult.message) {
                    result.message = aiResult.message;
                }
                
                // Thêm quyết định tự động dựa trên kết quả AI
                if (aiResult.autoDecision) {
                    result.autoDecision = aiResult.autoDecision;
                    result.reason = aiResult.reason;
                }
            } catch (error) {
                this.logger.error('Error in AI moderation', error);
                // Fall back to rule-based results
            }
        }
        
        // Quyết định tự động dựa trên rule-based moderation nếu không có quyết định từ AI
        if (result.autoDecision === 'manual') {
            // Auto-reject nếu là spam hoặc toxic
            if (result.isSpam || result.isToxic) {
                result.autoDecision = 'reject';
                result.reason = result.isSpam ? 'Nội dung spam bị từ chối tự động' : 'Nội dung độc hại bị từ chối tự động';
            }
            // Auto-approve nếu nội dung an toàn (score thấp)
            else if (result.spamScore < 0.2 && result.toxicScore < 0.2) { // Giảm ngưỡng phê duyệt tự động
                // Thêm kiểm tra nội dung ngắn nhưng vẫn quyết định tự động
                if (content.length > 20 || (content.length > 0 && hasAttachments)) {
                    result.autoDecision = 'approve';
                    result.reason = 'Nội dung an toàn được phê duyệt tự động';
                } else {
                    // Nội dung quá ngắn, nhưng vẫn quyết định tự động - từ chối vì có thể là spam/test
                    result.autoDecision = 'reject';
                    result.reason = 'Nội dung quá ngắn, từ chối tự động';
                }
            }
            // Thử phân tích nội dung bằng các rule thêm nếu có nội dung dài
            else if (content.length > 100 && !hasAttachments && result.spamScore < 0.4 && result.toxicScore < 0.4) {
                // Nội dung dài (>100 ký tự) và không chứa nhiều từ ngữ tiêu cực có thể được approve
                result.autoDecision = 'approve';
                result.reason = 'Nội dung dài và không chứa từ ngữ tiêu cực được phê duyệt tự động';
            }
            // Còn lại sẽ được quyết định tự động theo nguyên tắc nghiêng về an toàn
            else {
                // Nếu có điểm rủi ro cao, từ chối
                if (result.spamScore > 0.4 || result.toxicScore > 0.4) {
                    result.autoDecision = 'reject';
                    result.reason = 'Nội dung có khả năng không phù hợp, từ chối tự động';
                } 
                // Còn lại, duyệt
                else {
                    result.autoDecision = 'approve';
                    result.reason = 'Nội dung thông thường được phê duyệt tự động';
                }
            }
        }
        
        // Log kết quả cuối cùng để debug
        this.logger.log(`Final moderation decision: ${result.autoDecision}, reason: ${result.reason}`);

        return result;
    }

    private calculateSpamScore(content: string): number {
        const normalizedContent = content.toLowerCase();
        let score = 0;
        
        // Check for suspicious patterns, loại trừ YouTube và các domain phổ biến
        if ((normalizedContent.includes('http') || normalizedContent.includes('www.')) &&
            !normalizedContent.includes('youtube.com') && !normalizedContent.includes('youtu.be')) {
            score += 0.3;
        }
        
        // Check for banned words
        const bannedWordCount = this.bannedWords.filter(word => 
            normalizedContent.includes(word.toLowerCase())
        ).length;
        
        score += bannedWordCount * 0.2;
        
        // Kiểm tra nội dung quá ngắn (dưới 10 ký tự)
        if (normalizedContent.trim().length < 10) {
            score += 0.5; // Nội dung quá ngắn có khả năng cao là spam/test
        }
        
        // Kiểm tra lặp lại ký tự (ví dụ: "aaaaaaa", "hahahaha")
        // Nhưng chỉ tính nếu toàn bộ nội dung chỉ là ký tự lặp lại
        const repeatedCharsRegex = /(.)\1{4,}/g;
        const onlyRepeatedChars = /^[a-z0-9\s]*?((.)\2{4,})[a-z0-9\s]*?$/i.test(normalizedContent);
        if (repeatedCharsRegex.test(normalizedContent) && 
            (onlyRepeatedChars || normalizedContent.length < 15)) {
            score += 0.4;
        }
        
        // Kiểm tra nếu toàn bộ nội dung là chữ hoa
        if (content.length > 5 && content === content.toUpperCase() && /[A-Z]/.test(content)) {
            score += 0.3;
        }
        
        return Math.min(score, 1);
    }

    private calculateToxicScore(content: string): number {
        const normalizedContent = content.toLowerCase();
        let score = 0;
        
        // Check for toxic words
        const toxicWordCount = this.toxicWords.filter(word => 
            normalizedContent.includes(word.toLowerCase())
        ).length;
        
        score += toxicWordCount * 0.25;
        
        return Math.min(score, 1);
    }

    private extractTags(content: string): string[] {
        const tags: string[] = [];
        const normalizedContent = content.toLowerCase();
        
        // Extract hashtags
        const hashtagRegex = /#(\w+)/g;
        let match;
        while ((match = hashtagRegex.exec(content)) !== null) {
            tags.push(match[1].toLowerCase());
        }
        
        // Định nghĩa các category tags và từ khóa liên quan
        const tagCategories = {
            'love': ['crush', 'tình cảm', 'yêu', 'thích', 'tình yêu', 'người yêu', 'hẹn hò', 'dating', 'tỏ tình', 'thả thính', 'tình đầu'],
            'school': ['học', 'trường', 'lớp', 'giáo viên', 'thầy', 'cô', 'bài tập', 'điểm', 'thi', 'kì thi', 'đại học', 'sinh viên', 'học sinh'],
            'family': ['gia đình', 'ba mẹ', 'bố mẹ', 'anh chị em', 'ông bà', 'bố', 'mẹ', 'chị', 'anh', 'em'],
            'work': ['công việc', 'làm việc', 'sếp', 'đồng nghiệp', 'công ty', 'nghề nghiệp', 'nhân viên', 'lương', 'thăng tiến', 'nghỉ việc', 'lương'],
            'health': ['sức khỏe', 'bệnh', 'khỏe', 'bác sĩ', 'bệnh viện', 'ốm', 'đau', 'thuốc', 'điều trị', 'thể thao'],
            'friendship': ['bạn bè', 'bạn', 'tình bạn', 'hội', 'nhóm', 'mối quan hệ', 'bạn thân', 'bạn cùng phòng', 'bạn học'],
            'entertainment': ['phim', 'nhạc', 'game', 'chơi', 'giải trí', 'xem', 'nghe', 'hát', 'ca sĩ', 'diễn viên', 'idol'],
            'food': ['đồ ăn', 'thức ăn', 'món ăn', 'ăn', 'uống', 'nhà hàng', 'quán', 'đói', 'đồ uống', 'ẩm thực'],
            'stress': ['áp lực', 'căng thẳng', 'mệt mỏi', 'stress', 'lo lắng', 'buồn', 'chán nản', 'mệt']
        };
        
        // Kiểm tra từng category và thêm tag tương ứng nếu nội dung chứa từ khóa
        Object.entries(tagCategories).forEach(([tag, keywords]) => {
            if (keywords.some(keyword => normalizedContent.includes(keyword))) {
                tags.push(tag);
            }
        });
        
        return [...new Set(tags)]; // Loại bỏ các tags trùng lặp
    }

    private async retryAxiosRequest(requestFn: () => Promise<any>, maxRetries = 3, delayMs = 1000): Promise<any> {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                this.logger.warn(`Request failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                
                if (attempt < maxRetries) {
                    this.logger.log(`Retrying in ${delayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    // Exponential backoff
                    delayMs *= 2;
                }
            }
        }
        
        throw lastError;
    }
    
    private async retryGeminiRequest(requestFn: () => Promise<any>, maxRetries = 3, delayMs = 1000): Promise<any> {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                this.logger.warn(`Gemini API request failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
                
                if (attempt < maxRetries) {
                    this.logger.log(`Retrying Gemini API in ${delayMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    // Exponential backoff
                    delayMs *= 2;
                }
            }
        }
        
        throw lastError;
    }

    private handleFallbackModeration(content: string, moderationResult: ModerationResult): ModerationResult {
        // Bổ sung đánh giá dựa trên rule-based moderation nếu AI thất bại
        const normalizedContent = content.toLowerCase();
        
        // Sử dụng các hàm có sẵn để đánh giá
        const spamScore = this.calculateSpamScore(normalizedContent);
        const toxicScore = this.calculateToxicScore(normalizedContent);
        
        // Bổ sung vào kết quả hiện tại
        moderationResult.spamScore = Math.max(moderationResult.spamScore, spamScore);
        moderationResult.toxicScore = Math.max(moderationResult.toxicScore, toxicScore);
        moderationResult.isSpam = moderationResult.isSpam || spamScore > 0.7;
        moderationResult.isToxic = moderationResult.isToxic || toxicScore > 0.7;
        
        // Đưa ra quyết định - đảm bảo luôn có quyết định tự động, không có manual
        if (moderationResult.isSpam || moderationResult.isToxic) {
            moderationResult.autoDecision = 'reject';
            moderationResult.reason = moderationResult.reason || 
                (moderationResult.isSpam ? 'Nội dung spam bị từ chối tự động' : 'Nội dung độc hại bị từ chối tự động');
        } else if (moderationResult.autoDecision === 'manual' || !moderationResult.autoDecision) {
            // Nếu không có quyết định hoặc là manual, thì tự động approve nếu nội dung đủ dài
            if (content.length > 20) {
                moderationResult.autoDecision = 'approve';
                moderationResult.reason = 'Nội dung không có dấu hiệu vi phạm, được phê duyệt tự động';
            } else {
                moderationResult.autoDecision = 'reject';
                moderationResult.reason = 'Nội dung quá ngắn hoặc không rõ ràng, từ chối tự động';
            }
        }
        
        return moderationResult;
    }

    private async moderateWithGeminiMultimodal(content: string, attachments: any[]): Promise<ModerationResult> {
        // Generate a unique request ID for tracking this specific moderation request through logs
        const requestId = `gemini-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        this.logger.log(`[${requestId}] Starting multimodal moderation request with content length ${content?.length || 0} and ${attachments?.length || 0} attachments`);
        
        // Kết quả mặc định
        const moderationResult: ModerationResult = {
            isSpam: false,
            isToxic: false,
            spamScore: 0,
            toxicScore: 0,
            tags: [],
            autoDecision: 'manual',
            reason: '',
            hasImageContent: attachments && attachments.length > 0,
            imageAnalysisSuccess: false 
        };
        
        // Kiểm tra nếu Gemini API không được khởi tạo
        if (!this.genAI) {
            this.logger.error(`[${requestId}] Gemini API not initialized, returning manual decision`);
            moderationResult.reason = 'Gemini API not initialized, manual review required';
            return moderationResult;
        }
        
        // Kiểm tra hình ảnh
        if (!attachments || attachments.length === 0) {
            this.logger.warn(`[${requestId}] Called multimodal moderation but no attachments provided, falling back to text-only moderation`);
            // Nếu không có hình ảnh, chuyển sang phương thức moderateWithGemini
            return await this.moderateWithGemini(content);
        }
        
        // Kiểm tra nếu có hình ảnh không hợp lệ
        const validAttachments = attachments.filter(a => a && a.url);
        
        // Log chi tiết về attachments để debug
        this.logger.log(`[${requestId}] Attachment details: Total=${attachments.length}, Valid=${validAttachments.length}`);
        attachments.forEach((att, index) => {
            if (att && att.url) {
                const urlPreview = att.url.substring(0, 30) + (att.url.length > 30 ? '...' : '');
                const mimeType = att.mime_type || att.mimeType || att.type || att.content_type || 'unknown';
                this.logger.log(`[${requestId}] Attachment #${index+1}: URL=${urlPreview}, MimeType=${mimeType}, Size=${att.size || 'unknown'}`);
            } else {
                this.logger.warn(`[${requestId}] Invalid attachment #${index+1}: ${JSON.stringify(att || 'undefined')}`);
            }
        });
        
        if (validAttachments.length === 0) {
            this.logger.error(`[${requestId}] No valid attachments with URLs found`);
            moderationResult.reason = 'No valid attachment URLs found, manual review required';
            return moderationResult;
        }

        try {
            // Kiểm tra xem genAI đã được khởi tạo thành công chưa
            if (!this.genAI) {
                this.logger.error(`[${requestId}] Gemini API not initialized`);
                moderationResult.reason = 'AI service not initialized properly';
                return this.handleFallbackModeration(content, moderationResult);
            }
            
            // Cấu hình model đơn giản hơn, chỉ tập trung vào việc gọi API
            const model = this.genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash", // Model hỗ trợ cả văn bản và hình ảnh
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    }
                ]
            });
            
            // Sử dụng template prompt
            const prompt = GEMINI_MODERATION_PROMPT_TEMPLATE.replace('$CONTENT', content);
            
            // Tạo parts cho yêu cầu multimodal (text + image)
            const parts = [
                { text: prompt }
            ];

            // Xử lý hình ảnh và thêm vào parts
            for (const attachment of validAttachments) {
                try {
                    // Fetch hình ảnh
                    const imageResponse = await this.retryAxiosRequest(() => 
                        axios.get(attachment.url, { responseType: 'arraybuffer' })
                    );
                    
                    // Convert image data to base64
                    const imageBuffer = Buffer.from(imageResponse.data);
                    
                    // Xác định MIME type
                    let mimeType = attachment.mime_type || attachment.mimeType || attachment.type || attachment.content_type;
                    if (!mimeType || mimeType === 'unknown') {
                        // Thử đoán MIME type từ URL
                        if (attachment.url.match(/\.(jpg|jpeg)$/i)) {
                            mimeType = 'image/jpeg';
                        } else if (attachment.url.match(/\.png$/i)) {
                            mimeType = 'image/png';
                        } else if (attachment.url.match(/\.gif$/i)) {
                            mimeType = 'image/gif';
                        } else if (attachment.url.match(/\.(webp)$/i)) {
                            mimeType = 'image/webp';
                        } else {
                            mimeType = 'image/jpeg'; // Mặc định
                        }
                    }
                    
                    // Đảm bảo mimeType có định dạng đúng
                    if (!mimeType.startsWith('image/')) {
                        mimeType = `image/${mimeType}`;
                    }
                    
                    // Thêm vào parts - dùng any để tránh lỗi type
                    parts.push({
                        inlineData: {
                            data: imageBuffer.toString('base64'),
                            mime_type: mimeType
                        }
                    } as any);
                    
                    this.logger.log(`[${requestId}] Successfully processed image: ${attachment.url.substring(0, 30)}...`);
                } catch (imageError) {
                    this.logger.error(`[${requestId}] Failed to process image: ${imageError.message}`);
                }
            }
            
            // Chỉ tiếp tục nếu có ít nhất một hình ảnh được xử lý thành công
            if (parts.length <= 1) {
                this.logger.error(`[${requestId}] No images could be processed successfully`);
                moderationResult.reason = 'Failed to process image attachments, manual review required';
                return this.handleFallbackModeration(content, moderationResult);
            }

            // Gọi API Gemini với cả nội dung văn bản và hình ảnh
            this.logger.log(`[${requestId}] Sending request to Gemini API with ${parts.length - 1} images`);
            
            // Sử dụng hàm retry để tăng tính ổn định
            const result = await this.retryGeminiRequest(() => model.generateContent(parts));
            const response = result.response;
            const text = response.text();
            
            // Kiểm tra phản hồi
            if (!text || text.trim().length === 0) {
                this.logger.error(`[${requestId}] Empty response from Gemini API`);
                
                return this.handleFallbackModeration(content, moderationResult);
            }
            
            // Kiểm tra nếu response quá ngắn để chứa JSON hợp lệ
            if (text.length < 10) {
                this.logger.error(`[${requestId}] Received suspiciously short response from Gemini API: "${text}"`);
                moderationResult.reason = 'Invalid response format from AI moderation service';
                return this.handleFallbackModeration(content, moderationResult);
            }

            try {
                // Phân tích kết quả trả về từ Gemini
                const jsonStartIndex = text.indexOf('{');
                const jsonEndIndex = text.lastIndexOf('}') + 1;
                
                // Kiểm tra nếu không tìm thấy JSON trong response
                if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                    this.logger.error('No JSON found in Gemini API response');
                    moderationResult.reason = 'Invalid response format from AI moderation';
                    return this.handleFallbackModeration(content, moderationResult);
                }
                
                const jsonText = text.substring(jsonStartIndex, jsonEndIndex);
                const analysis = JSON.parse(jsonText);
                
                this.logger.log(`Gemini Analysis result: ${JSON.stringify(analysis)}`);
                
                // Xác định quyết định từ API response
                if (analysis.decision === 'APPROVE') {
                    moderationResult.autoDecision = 'approve';
                    moderationResult.reason = analysis.reason || 'Nội dung phù hợp';
                    
                    // Đặt các giá trị spam/toxic để tương thích với mã gốc
                    moderationResult.isSpam = false;
                    moderationResult.isToxic = false;
                    moderationResult.spamScore = 0.0;
                    moderationResult.toxicScore = 0.0;
                } else if (analysis.decision === 'REJECT') {
                    moderationResult.autoDecision = 'reject';
                    moderationResult.reason = analysis.reason || 'Nội dung không phù hợp';
                    
                    // Nếu bị từ chối, đánh dấu là có vấn đề
                    moderationResult.isSpam = analysis.reason?.toLowerCase().includes('spam') || false;
                    moderationResult.isToxic = analysis.reason?.toLowerCase().includes('tiêu cực') || 
                                            analysis.reason?.toLowerCase().includes('độc hại') || 
                                            analysis.reason?.toLowerCase().includes('không phù hợp') || false;
                    
                    // Đặt giá trị score để tương thích
                    moderationResult.spamScore = moderationResult.isSpam ? 0.8 : 0.0;
                    moderationResult.toxicScore = moderationResult.isToxic ? 0.8 : 0.0;
                } else {
                    moderationResult.autoDecision = 'manual';
                    moderationResult.reason = analysis.reason || 'Cần xem xét thủ công';
                }
                
                // Đánh dấu xác nhận đã phân tích hình ảnh thành công
                moderationResult.imageAnalysisSuccess = moderationResult.hasImageContent;
                
                // Cập nhật các tags
                if (analysis.tags && Array.isArray(analysis.tags)) {
                    moderationResult.tags = analysis.tags;
                }
                
                // Thêm category vào tags nếu có
                if (analysis.category && typeof analysis.category === 'string') {
                    moderationResult.tags.push(analysis.category.toLowerCase());
                }
            } catch (parseError) {
                this.logger.error('Error parsing Gemini analysis result', parseError);
                return this.handleFallbackModeration(content, moderationResult);
            }
            
            return moderationResult;
        } catch (error) {
            this.logger.error('Error calling Gemini API for multimodal content', error);
            return this.handleFallbackModeration(content, moderationResult);
        }
    }

    private async moderateWithGemini(content: string): Promise<ModerationResult> {
        if (!this.genAI) {
            throw new Error('Gemini API not initialized');
        }

        try {
            const moderationResult: ModerationResult = {
                isSpam: false,
                isToxic: false,
                spamScore: 0,
                toxicScore: 0,
                tags: [],
                autoDecision: 'manual',
                reason: ''
            };

            // Sử dụng Gemini Safety Settings để kiểm tra nội dung
            const model = this.genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                    }
                ]
            });

            // Đơn giản hóa prompt
            // Sử dụng template prompt
            const prompt = GEMINI_MODERATION_PROMPT_TEMPLATE.replace('$CONTENT', content);

            // Sử dụng retry để xử lý lỗi từ Gemini API
            const requestId = `gemini-text-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            this.logger.log(`[${requestId}] Sending text-only request to Gemini API`);
            
            const result = await this.retryGeminiRequest(() => model.generateContent(prompt));
            const response = result.response;
            const text = response.text();
            
            this.logger.log(`[${requestId}] Gemini text-only response received, length: ${text?.length || 0}`);

            try {
                // Phân tích kết quả trả về từ Gemini
                const jsonStartIndex = text.indexOf('{');
                const jsonEndIndex = text.lastIndexOf('}') + 1;
                
                if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                    this.logger.error(`[${requestId}] No JSON found in Gemini API response`);
                    return this.handleFallbackModeration(content, moderationResult);
                }
                
                const jsonText = text.substring(jsonStartIndex, jsonEndIndex);
                const analysis = JSON.parse(jsonText);
                
                this.logger.log(`Gemini Analysis result: ${JSON.stringify(analysis)}`);
                
                // Set decision based on Gemini analysis
                if (analysis.decision === 'APPROVE') {
                    moderationResult.autoDecision = 'approve';
                    moderationResult.reason = analysis.reason || 'Nội dung phù hợp';
                    
                    // For approved content, set low risk scores
                    moderationResult.isSpam = false;
                    moderationResult.isToxic = false;
                    moderationResult.spamScore = 0.0;
                    moderationResult.toxicScore = 0.0;
                } else if (analysis.decision === 'REJECT') {
                    moderationResult.autoDecision = 'reject';
                    moderationResult.reason = analysis.reason || 'Nội dung không phù hợp';
                    
                    // For rejected content, determine if it's spam or toxic based on reason
                    moderationResult.isSpam = analysis.reason?.toLowerCase().includes('spam') || false;
                    moderationResult.isToxic = analysis.reason?.toLowerCase().includes('tiêu cực') || 
                                             analysis.reason?.toLowerCase().includes('độc hại') || 
                                             analysis.reason?.toLowerCase().includes('không phù hợp') || false;
                    
                    // Set risk scores
                    moderationResult.spamScore = moderationResult.isSpam ? 0.8 : 0.0;
                    moderationResult.toxicScore = moderationResult.isToxic ? 0.8 : 0.0;
                } else {
                    // Manual review case
                    moderationResult.autoDecision = 'manual';
                    moderationResult.reason = analysis.reason || 'Cần xem xét thủ công';
                }
                
                // Set tags if available in response
                if (analysis.tags && Array.isArray(analysis.tags)) {
                    this.logger.log(`Tags from Gemini: ${JSON.stringify(analysis.tags)}`);
                    // Kết hợp tags từ AI với tags đã trích xuất trước đó
                    moderationResult.tags = [...new Set([
                        ...moderationResult.tags,
                        ...analysis.tags.map(tag => tag.toLowerCase().trim())
                    ])];
                } else {
                    this.logger.warn(`No tags in Gemini response, using only extracted tags: ${JSON.stringify(moderationResult.tags)}`);
                }
                
                // Add category as tag if available
                if (analysis.category && typeof analysis.category === 'string') {
                    moderationResult.tags.push(analysis.category.toLowerCase());
                }
                
                // Kiểm tra lại tags sau khi xử lý
                this.logger.log(`Final tags after AI processing: ${JSON.stringify(moderationResult.tags)}`)
                
                return moderationResult;
            } catch (parseError) {
                this.logger.error('Error parsing Gemini analysis result', parseError);
                return this.handleFallbackModeration(content, moderationResult);
            }
        } catch (error) {
            this.logger.error('Error calling Gemini API', error);
            // Tạo đối tượng mới nếu không có moderationResult - mặc định APPROVE khi lỗi
            const fallbackResult: ModerationResult = {
                isSpam: false,
                isToxic: false,
                spamScore: 0,
                toxicScore: 0,
                tags: [],
                message: "Lỗi khi phân tích nội dung với Gemini",
                autoDecision: "approve",  // Mặc định approve khi AI lỗi, nhưng sẽ được handleFallbackModeration xem xét lại
                reason: "Lỗi phân tích nội dung, quyết định tự động dựa trên rule",
                hasImageContent: false,
                imageAnalysisSuccess: false
            };
            return this.handleFallbackModeration(content, fallbackResult);
        }
    }
}
