-- Script để xóa tất cả tin tức trong bảng news
-- Database: PostgreSQL
-- Table: news

-- Xóa tất cả tin tức
DELETE FROM news;

-- Kiểm tra số lượng còn lại (sẽ trả về 0)
SELECT COUNT(*) as remaining_news FROM news;


