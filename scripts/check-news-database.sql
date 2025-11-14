-- Script to check news database status
-- This will show detailed statistics about the news table

SELECT '========================================' as info;
SELECT '      NEWS DATABASE STATUS REPORT' as info;
SELECT '========================================' as info;
SELECT '' as info;

-- Total news count
SELECT '📊 TỔNG QUAN:' as info;
SELECT 
    COUNT(*) as total_news,
    COUNT(*) FILTER (WHERE posted = true) as posted_news,
    COUNT(*) FILTER (WHERE posted = false) as unposted_news,
    COUNT(DISTINCT category) as total_categories,
    COUNT(DISTINCT source) as total_sources
FROM news;

SELECT '' as info;
SELECT '📰 PHÂN LOẠI THEO CHỦ ĐỀ:' as info;
SELECT 
    category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE posted = true) as posted,
    COUNT(*) FILTER (WHERE posted = false) as unposted
FROM news
GROUP BY category
ORDER BY total DESC;

SELECT '' as info;
SELECT '📰 PHÂN LOẠI THEO NGUỒN:' as info;
SELECT 
    source,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE posted = true) as posted,
    COUNT(*) FILTER (WHERE posted = false) as unposted
FROM news
GROUP BY source
ORDER BY total DESC;

SELECT '' as info;
SELECT '📅 TIN TỨC THEO NGÀY (7 ngày gần nhất):' as info;
SELECT 
    DATE("createdAt") as date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE posted = true) as posted,
    COUNT(*) FILTER (WHERE posted = false) as unposted
FROM news
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY DATE("createdAt")
ORDER BY date DESC;

SELECT '' as info;
SELECT '🆕 5 TIN TỨC MỚI NHẤT (CHƯA ĐĂNG):' as info;
SELECT 
    id,
    LEFT(title, 80) as title_preview,
    category,
    source,
    "createdAt"
FROM news
WHERE posted = false
ORDER BY "createdAt" DESC
LIMIT 5;

SELECT '' as info;
SELECT '✅ 5 TIN TỨC MỚI NHẤT (ĐÃ ĐĂNG):' as info;
SELECT 
    id,
    LEFT(title, 80) as title_preview,
    category,
    source,
    "createdAt"
FROM news
WHERE posted = true
ORDER BY "createdAt" DESC
LIMIT 5;

SELECT '' as info;
SELECT '📈 THỐNG KÊ TỔNG HỢP:' as info;
SELECT 
    MIN("createdAt") as oldest_news,
    MAX("createdAt") as newest_news,
    ROUND(AVG(LENGTH(title))) as avg_title_length,
    ROUND(AVG(LENGTH(summary))) as avg_summary_length,
    COUNT(*) FILTER (WHERE "imageUrl" IS NOT NULL) as news_with_image
FROM news;

SELECT '' as info;
SELECT '✅ Hoàn tất kiểm tra!' as info;

