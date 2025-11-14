#!/bin/bash

# Create TikTok Videos table

docker exec -i mezon-bot-template-postgres-1 psql -U postgres -d mezon_bot << 'EOF'

-- Drop table if exists (for clean slate)
DROP TABLE IF EXISTS tiktok_videos CASCADE;

-- Create tiktok_videos table
CREATE TABLE tiktok_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "videoId" VARCHAR UNIQUE NOT NULL,
    title VARCHAR(500),
    "authorUsername" VARCHAR(200),
    "authorDisplayName" VARCHAR(200),
    "likeCount" BIGINT DEFAULT 0,
    "viewCount" BIGINT DEFAULT 0,
    "shareCount" BIGINT DEFAULT 0,
    "commentCount" BIGINT DEFAULT 0,
    "videoUrl" VARCHAR,
    "coverImageUrl" VARCHAR,
    "tiktokCreatedAt" TIMESTAMP,
    posted BOOLEAN DEFAULT false,
    "hotScore" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE UNIQUE INDEX "IDX_TIKTOK_VIDEO_ID" ON tiktok_videos("videoId");
CREATE INDEX "IDX_TIKTOK_POSTED" ON tiktok_videos(posted);
CREATE INDEX "IDX_TIKTOK_HOT_SCORE" ON tiktok_videos("hotScore");

-- Insert migration record
INSERT INTO migrations (timestamp, name) 
VALUES (1759987000000, 'CreateTikTokVideosTable1759987000000')
ON CONFLICT DO NOTHING;

SELECT 'TikTok videos table created successfully!' as status;

\dt tiktok_videos;

EOF

echo "✅ Done!"

