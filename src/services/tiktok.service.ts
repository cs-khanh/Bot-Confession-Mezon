import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TikTokVideo } from '../entities/tiktok-video.entity';

@Injectable()
export class TikTokService {
    private readonly logger = new Logger(TikTokService.name);

    constructor(
        @InjectRepository(TikTokVideo)
        private tiktokVideoRepository: Repository<TikTokVideo>,
    ) {}

    /**
     * Lưu video TikTok mới
     */
    async saveVideo(videoData: Partial<TikTokVideo>): Promise<TikTokVideo> {
        try {
            // Tính hot score
            const hotScore = this.calculateHotScore(
                videoData.likeCount || 0,
                videoData.viewCount || 0,
                videoData.shareCount || 0,
                videoData.commentCount || 0,
            );

            const video = this.tiktokVideoRepository.create({
                ...videoData,
                hotScore,
            });

            return await this.tiktokVideoRepository.save(video);
        } catch (error) {
            if (error.code === '23505') {
                // Duplicate key - video đã tồn tại
                this.logger.debug(`Video ${videoData.videoId} already exists`);
                return null;
            }
            throw error;
        }
    }

    /**
     * Tính điểm hot score
     */
    private calculateHotScore(
        likeCount: number,
        viewCount: number,
        shareCount: number,
        commentCount: number,
    ): number {
        return Math.floor(
            Number(likeCount) +
            Number(viewCount) / 10 +
            Number(shareCount) * 2 +
            Number(commentCount) * 1.5
        );
    }

    /**
     * Lấy video chưa đăng, sắp xếp theo hot score
     */
    async getUnpostedVideos(limit: number = 10): Promise<TikTokVideo[]> {
        return this.tiktokVideoRepository.find({
            where: { posted: false },
            order: { hotScore: 'DESC', tiktokCreatedAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Lấy video hot nhất trong ngày chưa đăng
     */
    async getHottestVideoToday(): Promise<TikTokVideo | null> {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        return this.tiktokVideoRepository.findOne({
            where: {
                posted: false,
                tiktokCreatedAt: LessThan(new Date()),
            },
            order: { hotScore: 'DESC' },
        });
    }

    /**
     * Đánh dấu video đã đăng
     */
    async markAsPosted(videoId: string): Promise<void> {
        await this.tiktokVideoRepository.update(
            { videoId },
            { posted: true },
        );
    }

    /**
     * Lấy tổng số video chưa đăng
     */
    async getUnpostedCount(): Promise<number> {
        return this.tiktokVideoRepository.count({
            where: { posted: false },
        });
    }

    /**
     * Xóa video cũ (hơn X ngày)
     */
    async deleteOldVideos(daysOld: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.tiktokVideoRepository.delete({
            createdAt: LessThan(cutoffDate),
        });

        return result.affected || 0;
    }

    /**
     * Lấy thống kê
     */
    async getStats() {
        const [total, unposted, posted] = await Promise.all([
            this.tiktokVideoRepository.count(),
            this.tiktokVideoRepository.count({ where: { posted: false } }),
            this.tiktokVideoRepository.count({ where: { posted: true } }),
        ]);

        return { total, unposted, posted };
    }
}

