# 🚀 Setup Nhanh Tính Năng Tin Tức

## ⚡ Quick Start (5 phút)

### Bước 1: Cấu hình Environment

Tạo/sửa file `.env.local`:

```bash
# Database (đã có)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=mezon_bot

# Mezon Bot (đã có)
MEZON_TOKEN=your_mezon_bot_token

# ===== MỚI: News Feature =====
# Lấy từ: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# ID của channel #HotNews hoặc channel bạn muốn đăng tin
NEWS_CHANNEL_ID=your_news_channel_id
```

### Bước 2: Chạy Migration

```bash
cd /home/adminphuc/Trong/mezon-bot-template
yarn db:run
```

### Bước 3: Khởi động Bot

```bash
yarn start:dev
```

### Bước 4: Test

Trong Mezon, gõ:
```
!news crawl
```

Đợi vài giây, sau đó:
```
!news status
```

Nếu có tin, đăng lên:
```
!news post
```

## ✅ Xong!

Bot sẽ tự động:
- ✅ Crawl tin mỗi 30 phút
- ✅ Đăng tin mỗi 1 giờ  
- ✅ Gửi tổng hợp lúc 8h sáng & 6h chiều
- ✅ Dọn dẹp tin cũ lúc 2h sáng

## 📚 Xem Thêm

Chi tiết đầy đủ: [NEWS_FEATURE.md](NEWS_FEATURE.md)

## 🆘 Gặp Vấn Đề?

### Không crawl được tin?
- Kiểm tra internet connection
- Xem logs để debug

### Không đăng được tin?
- Kiểm tra `NEWS_CHANNEL_ID` đúng chưa
- Kiểm tra bot có quyền post trong channel không

### Gemini không hoạt động?
- Kiểm tra `GEMINI_API_KEY` đúng chưa
- Bot vẫn chạy được nhưng sẽ dùng title làm summary

---

**Thời gian setup:** ~5 phút  
**Khó:** ⭐ Dễ


