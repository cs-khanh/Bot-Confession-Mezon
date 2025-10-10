# 🚀 Quick Start - Chạy Bot với Tính Năng Tin Tức

## ⚡ 3 Bước Đơn Giản

### 1️⃣ Cấu hình (.env.local)

```bash
# Copy file này:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=mezon_bot
MEZON_TOKEN=your_mezon_bot_token

# Thêm 2 dòng này:
GEMINI_API_KEY=AIza...    # Lấy từ https://makersuite.google.com/app/apikey
NEWS_CHANNEL_ID=123456789  # ID channel #HotNews trong Mezon
```

### 2️⃣ Chạy Migration

```bash
cd /home/adminphuc/Trong/mezon-bot-template
yarn db:run
```

### 3️⃣ Khởi động

```bash
yarn start:dev
```

## ✅ Xong! Bây giờ test:

```
!news crawl    → Crawl tin ngay
!news status   → Xem có bao nhiêu tin
!news post     → Đăng tin lên channel
```

## 📋 File Tài Liệu

| File | Nội dung |
|------|----------|
| `SETUP_NEWS.md` | Hướng dẫn setup chi tiết |
| `NEWS_FEATURE.md` | Tài liệu đầy đủ về tính năng |
| `ARCHITECTURE.md` | Kiến trúc hệ thống |
| `IMPLEMENTATION_SUMMARY.md` | Tổng hợp những gì đã làm |

## 🤔 Câu Hỏi Thường Gặp

**Q: Không có Gemini API key có chạy được không?**  
A: Có! Bot vẫn crawl và đăng được, chỉ là sẽ dùng title làm summary thay vì AI.

**Q: Có thể thêm nguồn tin khác không?**  
A: Có! Sửa file `src/services/news-crawler.service.ts`, thêm vào mảng `newsSources`.

**Q: Thay đổi lịch crawl/post?**  
A: Sửa các `@Cron()` trong `src/services/news-scheduler.service.ts`.

## 📞 Support

Có vấn đề? Check:
1. Logs trong terminal
2. `TROUBLESHOOTING` section trong NEWS_FEATURE.md
3. Database có chạy không: `yarn db:run`

---

**Happy Coding!** 🎉


