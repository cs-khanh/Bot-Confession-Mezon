import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News } from '@app/entities/news.entity';

export interface CreateNewsDto {
    link: string;
    summary: string;
    title: string;
    category: string;
    source: string;
    imageUrl?: string;
}

@Injectable()
export class NewsService {
    private readonly logger = new Logger(NewsService.name);

    constructor(
        @InjectRepository(News)
        private newsRepository: Repository<News>,
    ) {}

    /**
     * Tạo tin tức mới
     */
    async create(newsData: CreateNewsDto): Promise<News> {
        try {
            const news = this.newsRepository.create(newsData);
            return await this.newsRepository.save(news);
        } catch (error) {
            this.logger.error(`Error creating news: ${error.message}`);
            throw error;
        }
    }

    /**
     * Kiểm tra xem link đã tồn tại chưa
     */
    async existsByLink(link: string): Promise<boolean> {
        const count = await this.newsRepository.count({ where: { link } });
        return count > 0;
    }

    /**
     * Lấy tin chưa đăng
     */
    async getUnpostedNews(limit: number = 10): Promise<News[]> {
        return await this.newsRepository.find({
            where: { posted: false },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Lấy tin chưa đăng theo chủ đề
     */
    async getUnpostedNewsByCategory(category: string, limit: number = 5): Promise<News[]> {
        return await this.newsRepository.find({
            where: { posted: false, category },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Đánh dấu tin đã đăng
     */
    async markAsPosted(newsId: string): Promise<void> {
        await this.newsRepository.update(newsId, { posted: true });
    }

    /**
     * Đánh dấu nhiều tin đã đăng
     */
    async markMultipleAsPosted(newsIds: string[]): Promise<void> {
        await this.newsRepository.update(newsIds, { posted: true });
    }

    /**
     * Lấy tin theo category
     */
    async getNewsByCategory(category: string, limit: number = 10): Promise<News[]> {
        return await this.newsRepository.find({
            where: { category },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Xóa tin cũ (hơn X ngày)
     */
    async deleteOldNews(daysOld: number = 30): Promise<number> {
        const date = new Date();
        date.setDate(date.getDate() - daysOld);

        const result = await this.newsRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :date', { date })
            .execute();

        return result.affected || 0;
    }

    /**
     * Lấy tất cả categories
     */
    async getAllCategories(): Promise<string[]> {
        const result = await this.newsRepository
            .createQueryBuilder('news')
            .select('DISTINCT news.category', 'category')
            .getRawMany();

        return result.map(r => r.category);
    }

    /**
     * Xóa tất cả tin tức
     */
    async deleteAll(): Promise<number> {
        const result = await this.newsRepository
            .createQueryBuilder()
            .delete()
            .execute();

        return result.affected || 0;
    }

    /**
     * Đếm tổng số tin tức
     */
    async countAll(): Promise<number> {
        return await this.newsRepository.count();
    }

    /**
     * Đếm số tin đã đăng
     */
    async countPosted(): Promise<number> {
        return await this.newsRepository.count({ where: { posted: true } });
    }

    /**
     * Đếm số tin chưa đăng
     */
    async countUnposted(): Promise<number> {
        return await this.newsRepository.count({ where: { posted: false } });
    }
}


