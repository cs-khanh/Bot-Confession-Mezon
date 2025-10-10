# 🏗️ Architecture - News Feature

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MEZON BOT                             │
│                     (NestJS Application)                     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Bot Module  │  │ News Module  │  │ Mezon Module │
    └──────────────┘  └──────────────┘  └──────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    News      │     │    News      │     │    News      │
│   Command    │────▶│  Scheduler   │────▶│   Crawler    │
└──────────────┘     └──────────────┘     └──────────────┘
        │                     │                     │
        │                     │                     ▼
        │                     │            ┌──────────────┐
        │                     │            │   Gemini     │
        │                     │            │   Service    │
        │                     │            └──────────────┘
        │                     │                     │
        │                     ▼                     ▼
        │            ┌──────────────┐     ┌──────────────┐
        │            │    News      │────▶│    News      │
        └───────────▶│   Service    │     │   Posting    │
                     └──────────────┘     └──────────────┘
                              │                     │
                              ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  PostgreSQL  │     │    Mezon     │
                     │   Database   │     │   Channel    │
                     └──────────────┘     └──────────────┘
```

## 🔄 Data Flow

### 1. Crawl Flow
```
RSS Feeds → NewsCrawlerService
                 │
                 ├─→ Parse RSS
                 ├─→ Extract Content (Cheerio)
                 ├─→ Generate Summary (Gemini)
                 ├─→ Categorize (Gemini)
                 └─→ Save to DB (NewsService)
                        │
                        ▼
                   PostgreSQL
```

### 2. Post Flow
```
NewsScheduler → Get Unposted (NewsService)
                        │
                        ▼
                  Group by Category
                        │
                        ▼
             NewsPostingService
                        │
                        ├─→ Create Thread
                        ├─→ Post Articles
                        └─→ Mark as Posted
                               │
                               ▼
                          Mezon Channel
```

### 3. Command Flow
```
User Message → CommandService → NewsCommand
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
                 crawl()           post()          status()
                    │                 │                 │
                    ▼                 ▼                 ▼
              NewsScheduler     NewsScheduler     NewsService
                    │                 │                 │
                    ▼                 ▼                 ▼
            NewsCrawlerService  NewsPostingService  Database
                    │                 │                 │
                    └─────────────────┴─────────────────┘
                                      │
                                      ▼
                                Reply to User
```

## 📦 Module Dependencies

```
AppModule
  │
  ├─→ ConfigModule (Global)
  ├─→ TypeOrmModule (Global)
  ├─→ EventEmitterModule (Global)
  ├─→ MezonModule
  │     └─→ MezonClientService
  │
  ├─→ BotModule
  │     ├─→ Commands (Help, Ping, About, News)
  │     ├─→ Listeners
  │     └─→ NewsModule (imported)
  │
  └─→ NewsModule
        ├─→ TypeOrmModule.forFeature([News])
        ├─→ ScheduleModule
        ├─→ MezonModule (imported)
        │
        ├─→ Services:
        │     ├─→ NewsService
        │     ├─→ GeminiService
        │     ├─→ NewsCrawlerService
        │     ├─→ NewsPostingService
        │     └─→ NewsScheduler
        │
        └─→ Entity:
              └─→ News
```

## 🗄️ Database Schema

```sql
┌─────────────────────────────────────────────┐
│                 news                        │
├─────────────────┬───────────────────────────┤
│ id              │ uuid (PK)                 │
│ link            │ varchar(1000) UNIQUE      │ ◄─── Index
│ title           │ varchar(500)              │
│ summary         │ text                      │
│ category        │ varchar(100)              │ ◄─── Index
│ source          │ varchar(200)              │
│ imageUrl        │ varchar (nullable)        │
│ posted          │ boolean (default: false)  │ ◄─── Index
│ createdAt       │ timestamp                 │
│ updatedAt       │ timestamp                 │
└─────────────────┴───────────────────────────┘

Indexes:
- IDX_NEWS_LINK (link)
- IDX_NEWS_CATEGORY (category)
- IDX_NEWS_POSTED (posted)
```

## ⏰ Scheduled Tasks

```
┌──────────────────────────────────────────────────────┐
│              NewsScheduler Service                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  @Cron('0 */30 * * * *')                           │
│  ├─→ handleNewsCrawling()                          │
│  │   └─→ crawlerService.crawlAllSources()         │
│  │                                                  │
│  @Cron('0 0 */1 * * *')                           │
│  ├─→ handleNewsPosting()                           │
│  │   └─→ postingService.postUnpostedNews()        │
│  │                                                  │
│  @Cron('0 0 8,18 * * *')                          │
│  ├─→ handleDailySummary()                          │
│  │   └─→ postingService.sendDailySummary()        │
│  │                                                  │
│  @Cron('0 0 2 * * *')                             │
│  └─→ handleCleanup()                               │
│      └─→ newsService.deleteOldNews(30)            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## 🔌 External Integrations

```
┌─────────────────────────────────────────────────────┐
│                External Services                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📰 RSS Feeds                                      │
│  ├─→ VNExpress (6 feeds)                          │
│  ├─→ Zing News (3 feeds)                          │
│  ├─→ Thanh Niên (3 feeds)                         │
│  └─→ Kenh14 (1 feed)                              │
│      │                                              │
│      └─→ NewsCrawlerService                        │
│                                                     │
│  🤖 Google Gemini API                             │
│  ├─→ Summarization                                 │
│  └─→ Categorization                                │
│      │                                              │
│      └─→ GeminiService                             │
│                                                     │
│  💬 Mezon Platform                                 │
│  ├─→ Post Messages                                 │
│  ├─→ Create Threads                                │
│  └─→ Reply to Commands                             │
│      │                                              │
│      └─→ MezonClientService                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🎯 Service Responsibilities

### NewsService
```
┌─────────────────────────────────────┐
│         NewsService                 │
├─────────────────────────────────────┤
│ • CRUD operations for news          │
│ • Check duplicate by link           │
│ • Get unposted news                 │
│ • Get news by category              │
│ • Mark as posted                    │
│ • Delete old news                   │
│ • Get all categories                │
└─────────────────────────────────────┘
```

### GeminiService
```
┌─────────────────────────────────────┐
│        GeminiService                │
├─────────────────────────────────────┤
│ • Summarize news content            │
│ • Summarize from HTML               │
│ • Auto categorize news              │
│ • Fallback handling                 │
└─────────────────────────────────────┘
```

### NewsCrawlerService
```
┌─────────────────────────────────────┐
│     NewsCrawlerService              │
├─────────────────────────────────────┤
│ • Crawl from RSS feeds              │
│ • Parse feed items                  │
│ • Extract article content           │
│ • Extract images                    │
│ • Manage news sources               │
└─────────────────────────────────────┘
```

### NewsPostingService
```
┌─────────────────────────────────────┐
│     NewsPostingService              │
├─────────────────────────────────────┤
│ • Post unposted news                │
│ • Create category threads           │
│ • Post articles to threads          │
│ • Send breaking news                │
│ • Send daily summary                │
│ • Format messages with emojis       │
└─────────────────────────────────────┘
```

### NewsScheduler
```
┌─────────────────────────────────────┐
│       NewsScheduler                 │
├─────────────────────────────────────┤
│ • Schedule crawling (30 min)        │
│ • Schedule posting (1 hour)         │
│ • Schedule daily summary (8h, 18h)  │
│ • Schedule cleanup (2h)             │
│ • Manual trigger methods            │
└─────────────────────────────────────┘
```

## 🔐 Security & Best Practices

### Environment Variables
```
✅ Sensitive data in .env files
✅ Validation with Joi schema
✅ Type-safe config service
```

### Error Handling
```
✅ Try-catch blocks in all services
✅ Logger for debugging
✅ Graceful fallbacks (Gemini → title)
✅ User-friendly error messages
```

### Performance
```
✅ Database indexes (link, category, posted)
✅ Batch operations
✅ Rate limiting (sleep between posts)
✅ Cleanup old data
```

### Code Quality
```
✅ TypeScript strict mode
✅ Modular architecture
✅ Dependency injection
✅ Single responsibility principle
✅ Clean code practices
```

## 📊 Performance Metrics

### Expected Performance
```
Crawl Time:     ~30-60 seconds (13 sources)
Post Time:      ~10-20 seconds (per category)
Summary Gen:    ~2-5 seconds (Gemini API)
DB Operations:  <100ms (with indexes)
```

### Scalability
```
RSS Sources:    Easily add more feeds
Categories:     Dynamic from DB
Concurrent:     NestJS async/await
Database:       PostgreSQL scales well
```

## 🎨 Design Patterns Used

1. **Dependency Injection**: NestJS IoC container
2. **Repository Pattern**: TypeORM repositories
3. **Service Layer**: Business logic separation
4. **Command Pattern**: Bot commands
5. **Observer Pattern**: Event emitters
6. **Factory Pattern**: Entity creation
7. **Singleton Pattern**: Services
8. **Strategy Pattern**: Different news sources

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Complexity**: Medium  
**Maintainability**: High ⭐⭐⭐⭐⭐


