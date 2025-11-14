#!/bin/bash
# Script để fix bảng news

echo "🔧 Đang fix bảng news..."

# Tìm container postgres
CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -n 1)

if [ -z "$CONTAINER" ]; then
    echo "❌ Không tìm thấy container postgres. Hãy chạy: docker ps"
    exit 1
fi

echo "✅ Tìm thấy container: $CONTAINER"

# Chạy SQL để tạo bảng
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

-- Kiểm tra
SELECT 'Bảng news đã được tạo thành công!' as message;
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_name = 'news';
EOF

echo ""
echo "✅ Hoàn tất! Bảng news đã được tạo."
echo ""
echo "📋 Các bước tiếp theo:"
echo "1. Kill bot cũ: pkill -9 -f 'nest start'"
echo "2. Thêm Gemini key vào .env.local"
echo "3. Restart: yarn start:dev"


