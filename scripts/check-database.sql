-- Script to check database status
-- This will show counts and some sample data from each table

-- Count records in each table
SELECT 'confession' as table_name, COUNT(*) as record_count FROM "confession"
UNION ALL
SELECT 'reaction_log' as table_name, COUNT(*) as record_count FROM "reaction_log"
UNION ALL
SELECT 'reaction' as table_name, COUNT(*) as record_count FROM "reaction"
UNION ALL
SELECT 'weekly_stats' as table_name, COUNT(*) as record_count FROM "weekly_stats";


-- Check the latest confession
SELECT 
    id, 
    LEFT(content, 100) as content_preview, 
    status,
    reaction_count,
    created_at
FROM "confession"
ORDER BY created_at DESC
LIMIT 3;

-- Check the latest reaction log
SELECT 
    id,
    message_id,
    confession_id,
    reactions,
    total_count,
    created_at
FROM "reaction_log"
ORDER BY created_at DESC
LIMIT 3;

-- Check the latest weekly stats
SELECT 
    id,
    week,
    year,
    "startDate" as start_date,
    "endDate" as end_date,
    "totalConfessions" as total_confessions,
    "approvedConfessions" as approved_confessions,
    "rejectedConfessions" as rejected_confessions,
    "totalReactions" as total_reactions,
    "createdAt" as created_at
FROM "weekly_stats"
ORDER BY "createdAt" DESC
LIMIT 3;