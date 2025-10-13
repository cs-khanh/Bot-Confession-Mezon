-- Script to clear all data from the database tables
-- WARNING: This will delete ALL data from these tables. Use with caution!

-- Clear reaction logs first (due to foreign key constraints)
TRUNCATE TABLE "reaction_log" CASCADE;

-- Clear confessions
TRUNCATE TABLE "confession" CASCADE;

-- If there are any weekly stats or other tables you want to clear:
TRUNCATE TABLE "weekly_stats" CASCADE;

-- Optionally reset the sequence counters
ALTER SEQUENCE "reaction_log_id_seq" RESTART WITH 1;
ALTER SEQUENCE "weekly_stats_id_seq" RESTART WITH 1;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'All data has been cleared successfully.';
END $$;