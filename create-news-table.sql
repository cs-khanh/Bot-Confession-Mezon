-- Script để tạo bảng news thủ công
-- Chạy: psql -h localhost -U postgres -d mezon_bot -f create-news-table.sql

-- Xóa migration record cũ
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
INSERT INTO migrations (timestamp, name) VALUES (1759974246345, 'CreateNewsTable1759974246345');

SELECT 'Bảng news đã được tạo thành công!' as message;


