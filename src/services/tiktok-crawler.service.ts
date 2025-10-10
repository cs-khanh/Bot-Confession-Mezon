import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as dayjs from 'dayjs';
import { TikTokService } from './tiktok.service';

interface TikTokApiVideo {
    id: string;
    title?: string;
    create_time?: string;
    like_count?: number;
    view_count?: number;
    share_count?: number;
    comment_count?: number;
    video_description?: string;
    author?: {
        unique_id?: string;
        display_name?: string;
    };
}

@Injectable()
export class TikTokCrawlerService {
    private readonly logger = new Logger(TikTokCrawlerService.name);
    private readonly apiUrl = 'https://open.tiktokapis.com/v2/research/video/query/';

    constructor(
        private tiktokService: TikTokService,
        private configService: ConfigService,
    ) {}

    /**
     * Crawl video hot trong ngày hôm nay
     */
    async crawlHotVideosToday(): Promise<number> {
        const accessToken = this.configService.get<string>('TIKTOK_ACCESS_TOKEN');
        
        if (!accessToken || accessToken === 'your_tiktok_access_token_here') {
            this.logger.warn('⚠️ TIKTOK_ACCESS_TOKEN not configured, skipping TikTok crawl');
            return 0;
        }

        const today = dayjs().format('YYYY-MM-DD');
        const startTime = `${today}T00:00:00Z`;
        const endTime = `${today}T23:59:59Z`;

        try {
            this.logger.log(`🎵 Crawling hot TikTok videos for ${today}...`);

            const response = await axios.post(
                this.apiUrl,
                {
                    query: {
                        and: [
                            { field_name: 'create_time', filter_type: 'GTE', value: startTime },
                            { field_name: 'create_time', filter_type: 'LTE', value: endTime },
                        ],
                    },
                    fields: [
                        'id',
                        'title',
                        'video_description',
                        'create_time',
                        'like_count',
                        'view_count',
                        'share_count',
                        'comment_count',
                        'author',
                    ],
                    max_count: 100, // Lấy top 100 để filter
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            const videos: TikTokApiVideo[] = response.data.data?.videos || [];

            if (videos.length === 0) {
                this.logger.log('❌ No TikTok videos found for today');
                return 0;
            }

            this.logger.log(`📊 Found ${videos.length} TikTok videos, processing...`);

            // Sắp xếp theo engagement (like + view + share + comment)
            const sortedVideos = videos.sort((a, b) => {
                const scoreA = (a.like_count || 0) + (a.view_count || 0) / 10 + (a.share_count || 0) * 2;
                const scoreB = (b.like_count || 0) + (b.view_count || 0) / 10 + (b.share_count || 0) * 2;
                return scoreB - scoreA;
            });

            // Lấy top 20 video hot nhất
            const topVideos = sortedVideos.slice(0, 20);
            let savedCount = 0;

            for (const video of topVideos) {
                try {
                    const saved = await this.tiktokService.saveVideo({
                        videoId: video.id,
                        title: video.title || video.video_description || 'Untitled',
                        authorUsername: video.author?.unique_id || 'Unknown',
                        authorDisplayName: video.author?.display_name || 'Unknown',
                        likeCount: video.like_count || 0,
                        viewCount: video.view_count || 0,
                        shareCount: video.share_count || 0,
                        commentCount: video.comment_count || 0,
                        videoUrl: `https://www.tiktok.com/@${video.author?.unique_id}/video/${video.id}`,
                        tiktokCreatedAt: video.create_time ? new Date(video.create_time) : new Date(),
                    });

                    if (saved) {
                        savedCount++;
                        this.logger.log(`✅ Saved: ${video.title || video.id} (❤️ ${video.like_count})`);
                    }
                } catch (error) {
                    this.logger.error(`Error saving TikTok video ${video.id}: ${error.message}`);
                }
            }

            this.logger.log(`🎉 TikTok crawl completed: ${savedCount} new videos saved`);
            return savedCount;

        } catch (error) {
            if (error.response?.status === 401) {
                this.logger.error('❌ TikTok API authentication failed - check your access token');
            } else if (error.response?.status === 429) {
                this.logger.error('❌ TikTok API rate limit exceeded');
            } else {
                this.logger.error(`Error crawling TikTok: ${error.message}`);
            }
            return 0;
        }
    }

    /**
     * Crawl video hot trong khoảng thời gian tùy chỉnh
     */
    async crawlHotVideosCustomRange(startDate: Date, endDate: Date): Promise<number> {
        const accessToken = this.configService.get<string>('TIKTOK_ACCESS_TOKEN');
        
        if (!accessToken || accessToken === 'your_tiktok_access_token_here') {
            this.logger.warn('⚠️ TIKTOK_ACCESS_TOKEN not configured');
            return 0;
        }

        const startTime = dayjs(startDate).format('YYYY-MM-DD') + 'T00:00:00Z';
        const endTime = dayjs(endDate).format('YYYY-MM-DD') + 'T23:59:59Z';

        this.logger.log(`🎵 Crawling TikTok videos from ${startTime} to ${endTime}...`);

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    query: {
                        and: [
                            { field_name: 'create_time', filter_type: 'GTE', value: startTime },
                            { field_name: 'create_time', filter_type: 'LTE', value: endTime },
                        ],
                    },
                    fields: [
                        'id',
                        'title',
                        'video_description',
                        'create_time',
                        'like_count',
                        'view_count',
                        'share_count',
                        'comment_count',
                        'author',
                    ],
                    max_count: 50,
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }
            );

            const videos: TikTokApiVideo[] = response.data.data?.videos || [];
            let savedCount = 0;

            for (const video of videos) {
                const saved = await this.tiktokService.saveVideo({
                    videoId: video.id,
                    title: video.title || video.video_description || 'Untitled',
                    authorUsername: video.author?.unique_id || 'Unknown',
                    authorDisplayName: video.author?.display_name || 'Unknown',
                    likeCount: video.like_count || 0,
                    viewCount: video.view_count || 0,
                    shareCount: video.share_count || 0,
                    commentCount: video.comment_count || 0,
                    videoUrl: `https://www.tiktok.com/@${video.author?.unique_id}/video/${video.id}`,
                    tiktokCreatedAt: video.create_time ? new Date(video.create_time) : new Date(),
                });

                if (saved) savedCount++;
            }

            return savedCount;

        } catch (error) {
            this.logger.error(`Error in custom range crawl: ${error.message}`);
            return 0;
        }
    }
}

