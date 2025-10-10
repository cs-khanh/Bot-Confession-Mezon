#!/bin/bash
# Script setup hoàn chỉnh database và bảng news

echo "🔧 Đang setup database..."

CONTAINER="mezon-bot-template-postgres-1"

echo "✅ Sử dụng container: $CONTAINER"

# Bước 1: Tạo database mezon_bot
echo ""
echo "📦 Bước 1: Tạo database mezon_bot..."
docker exec -i $CONTAINER psql -U postgres << 'EOF'
-- Tạo database nếu chưa có
SELECT 'CREATE DATABASE mezon_bot'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mezon_bot')\gexec

\c mezon_bot

-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

SELECT 'Database mezon_bot đã sẵn sàng!' as message;
EOF

# Bước 2: Tạo bảng migrations
echo ""
echo "📦 Bước 2: Tạo bảng migrations..."
docker exec -i $CONTAINER psql -U postgres -d mezon_bot << 'EOF'
-- Tạo bảng migrations
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL
);

SELECT 'Bảng migrations đã được tạo!' as message;
EOF

# Bước 3: Tạo bảng news
echo ""
echo "📦 Bước 3: Tạo bảng news..."
docker exec -i $CONTAINER psql -U postgres -d mezon_bot << 'EOF'
-- Xóa migration record cũ (nếu có)
DELETE FROM migrations WHERE name = 'CreateNewsTable1759974246345';

-- Tạo bảng news
CREATE TABLE IF NOT EXISTS news (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    link varchar(1000) UNIQUE NOT NULL,
    summary text NOT NULL,
    title varchar(500) NOT NULL,
    category varchar(100) NOT NULL,
    source varchar(200) NOT NULL,
    "imageUrl" varchar,
    posted boolean NOT NULL DEFAULT false,
    "createdAt" timestamp NOT NULL DEFAULT now(),
    "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Tạo indexes
CREATE INDEX IF NOT EXISTS "IDX_NEWS_LINK" ON news (link);
CREATE INDEX IF NOT EXISTS "IDX_NEWS_CATEGORY" ON news (category);
CREATE INDEX IF NOT EXISTS "IDX_NEWS_POSTED" ON news (posted);

-- Insert migration record
INSERT INTO migrations (timestamp, name) 
VALUES (1759974246345, 'CreateNewsTable1759974246345')
ON CONFLICT DO NOTHING;

-- Kiểm tra kết quả
\dt

SELECT 'Bảng news đã được tạo thành công!' as message;
SELECT COUNT(*) as total_news FROM news;
EOF

echo ""
echo "✅ ✅ ✅ Hoàn tất! Database và bảng news đã sẵn sàng."
echo ""
echo "📋 Các bước tiếp theo:"
echo "1. Thêm Gemini key vào .env.local:"
echo "   echo 'GEMINI_API_KEY=AIzaSyAPD5HKA0bBXKWYedFZPRSAcdrVmjNoRJY' >> .env.local"
echo "   echo 'NEWS_CHANNEL_ID=your_channel_id' >> .env.local"
echo ""
echo "2. Restart bot:"
echo "   pkill -9 -f 'nest start'"
echo "   yarn start:dev"
echo ""
echo "3. Test trong Mezon:"
echo "   !news crawl"


