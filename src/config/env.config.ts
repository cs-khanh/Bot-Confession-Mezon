import * as dotenv from "dotenv";

const ENV = process.env.ENV;
export const envFilePath = `.env.${ENV ?? "local"}`;

dotenv.config({ path: envFilePath });

export default () => ({
    POSTGRES_HOST: process.env.POSTGRES_HOST || "",
    POSTGRES_PORT: process.env.POSTGRES_PORT || 5432,
    POSTGRES_USER: process.env.POSTGRES_USER || "",
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || "",
    POSTGRES_DB: process.env.POSTGRES_DB || "",
    BOT_ID: process.env.BOT_ID || "",
    MEZON_TOKEN: process.env.MEZON_TOKEN || "",
    
    // Confession Bot Configuration
    CONFESSION_CHANNEL_ID: process.env.CONFESSION_CHANNEL_ID || "",
    MODERATION_CHANNEL_ID: process.env.MODERATION_CHANNEL_ID || "",
    ANNOUNCEMENT_CHANNEL_ID: process.env.ANNOUNCEMENT_CHANNEL_ID || "",
    ADMIN_USER_IDS: (process.env.ADMIN_USER_IDS || "").split(",").filter(id => id.trim() !== ""),
    
    // Auto moderation configuration
    AUTO_MODERATION_ENABLED: process.env.AUTO_MODERATION_ENABLED || "false",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    USE_GEMINI: process.env.USE_GEMINI || "false", // Sử dụng Gemini API thay vì OpenAI
    NEWS_RSS_FEED_URL: process.env.NEWS_RSS_FEED_URL || "",
    WEEKLY_REPORT_CRON: process.env.WEEKLY_REPORT_CRON || "0 18 * * SUN", // Default: Sunday at 18:00
    MODERATION_ENABLED: process.env.MODERATION_ENABLED === "true",
    AI_MODERATION_ENABLED: process.env.AI_MODERATION_ENABLED === "true",
    AI_SUMMARY_ENABLED: process.env.AI_SUMMARY_ENABLED === "true",
    NEWS_CHANNEL_ID: process.env.NEWS_CHANNEL_ID || "",
    TIKTOK_ACCESS_TOKEN: process.env.TIKTOK_ACCESS_TOKEN || "",
    TIKTOK_CHANNEL_ID: process.env.TIKTOK_CHANNEL_ID || "",
});
