# 📰 Tính Năng Crawl và Đăng Tin Tức

## 📋 Tổng Quan

Bot tự động crawl tin tức từ các trang báo Việt Nam (VNExpress, Zing News, Kenh14, Thanh Niên...), phân loại theo chủ đề, tạo tóm tắt bằng Gemini AI, và đăng lên Mezon theo dạng threads.

## 🎯 Tính Năng

### ✨ Chức Năng Chính

1. **Auto Crawling**: Tự động crawl tin từ RSS feeds
2. **AI Summarization**: Tóm tắt tin tức bằng Gemini API
3. **Categorization**: Phân loại theo 9 chủ đề
4. **Thread Posting**: Đăng tin theo threads trong channel
5. **Scheduled Tasks**: Tự động hóa hoàn toàn
6. **Manual Control**: Điều khiển bằng commands

### 📚 Chủ Đề Tin Tức

- 💻 **Công Nghệ** - Technology
- 💼 **Kinh Doanh** - Business  
- 🎬 **Giải Trí** - Entertainment
- ⚽ **Thể Thao** - Sports
- 🌸 **Đời Sống** - Lifestyle
- 📚 **Giáo Dục** - Education
- 🏥 **Sức Khỏe** - Health
- ✈️ **Du Lịch** - Travel
- 📰 **Tổng hợp** - General

## 🔧 Cài Đặt

### 1. Cấu Hình Environment Variables

Thêm vào file `.env.local`:

```env
# Gemini API Key (để tạo tóm tắt)
GEMINI_API_KEY=your_gemini_api_key_here

# Channel ID nơi đăng tin (lấy từ Mezon)
NEWS_CHANNEL_ID=your_channel_id_here
```

#### Lấy Gemini API Key:
1. Truy cập: https://makersuite.google.com/app/apikey
2. Tạo API key mới
3. Copy và dán vào `.env.local`

#### Lấy Channel ID:
1. Vào Mezon, chọn channel #HotNews (hoặc channel bạn muốn)
2. Copy Channel ID từ URL hoặc settings
3. Dán vào `.env.local`

### 2. Chạy Migration

```bash
yarn db:run
```

Migration sẽ tạo bảng `news` trong database với schema:
- `id` (uuid) - Primary key
- `link` (varchar) - Link bài viết (unique)
- `title` (varchar) - Tiêu đề
- `summary` (text) - Tóm tắt từ Gemini
- `category` (varchar) - Chủ đề
- `source` (varchar) - Nguồn tin
- `imageUrl` (varchar) - Ảnh thumbnail
- `posted` (boolean) - Đã đăng chưa
- `createdAt`, `updatedAt` - Timestamps

### 3. Khởi Động Bot

```bash
yarn start:dev
```

## 📝 Commands

### `!news` - Menu chính

Hiển thị hướng dẫn sử dụng commands

```
!news
```

### `!news crawl` - Crawl tin ngay

Crawl tin tức từ tất cả nguồn ngay lập tức

```
!news crawl
```

**Output:**
```
✅ Crawl hoàn tất!
📰 Tin chưa đăng: 45 bài
```

### `!news post` - Đăng tin ngay

Đăng tất cả tin chưa post lên channel

```
!news post
```

**Output:**
```
✅ Đăng tin hoàn tất!
📝 Đã đăng: 40 bài
📰 Còn lại: 5 bài
```

### `!news status` - Xem thống kê

Xem thống kê tin tức hiện tại

```
!news status
```

**Output:**
```
📊 Thống Kê Tin Tức

📰 Tổng tin chưa đăng: 45 bài

Phân loại theo chủ đề:
• Công Nghệ: 12 bài
• Giải Trí: 8 bài
• Thể Thao: 15 bài
• Kinh Doanh: 10 bài
```

## ⏰ Scheduled Tasks

Bot tự động thực hiện các tác vụ theo lịch:

### 🔄 Crawl Tin - Mỗi 30 phút
```
Cron: 0 */30 * * * *
Timezone: Asia/Ho_Chi_Minh
```
Tự động crawl tin từ tất cả nguồn RSS

### 📤 Đăng Tin - Mỗi 1 giờ
```
Cron: 0 0 */1 * * *
Timezone: Asia/Ho_Chi_Minh
```
Đăng tin chưa post lên channel theo threads

### 📊 Tổng Hợp - 8h sáng & 6h chiều
```
Cron: 0 0 8,18 * * *
Timezone: Asia/Ho_Chi_Minh
```
Gửi tổng hợp tin tức trong ngày

### 🗑️ Dọn Dẹp - 2h sáng hàng ngày
```
Cron: 0 0 2 * * *
Timezone: Asia/Ho_Chi_Minh
```
Xóa tin cũ hơn 30 ngày

## 📰 Nguồn Tin

### VNExpress
- Công Nghệ: https://vnexpress.net/rss/so-hoa.rss
- Giải Trí: https://vnexpress.net/rss/giai-tri.rss
- Thể Thao: https://vnexpress.net/rss/the-thao.rss
- Sức Khỏe: https://vnexpress.net/rss/suc-khoe.rss
- Du Lịch: https://vnexpress.net/rss/du-lich.rss
- Kinh Doanh: https://vnexpress.net/rss/kinh-doanh.rss

### Zing News
- Công Nghệ: https://zingnews.vn/cong-nghe.rss
- Giải Trí: https://zingnews.vn/giai-tri.rss
- Thể Thao: https://zingnews.vn/the-thao.rss

### Thanh Niên
- Công Nghệ: https://thanhnien.vn/rss/cong-nghe.rss
- Giải Trí: https://thanhnien.vn/rss/giai-tri.rss
- Thể Thao: https://thanhnien.vn/rss/the-thao.rss

### Kenh14
- Giải Trí: https://kenh14.vn/home.rss

## 🎨 Format Tin Đăng

### Thread Header
```
🧵 💻 Công Nghệ - 09/10/2025
```

### Tin Trong Thread
```
**💻 Apple ra mắt iPhone 17 - sạc không khí**

📝 Apple vừa công bố iPhone 17 với công nghệ sạc không dây hoàn toàn mới, 
cho phép sạc pin từ không khí xung quanh. Đây là bước đột phá trong công 
nghệ di động.

🔗 [Đọc thêm](https://vnexpress.net/apple-ra-mat...)
📰 Nguồn: VNExpress - Công Nghệ
```

## 🏗️ Cấu Trúc Code

### Services
- `NewsService` - Quản lý database
- `GeminiService` - Tạo tóm tắt AI
- `NewsCrawlerService` - Crawl RSS feeds
- `NewsPostingService` - Đăng lên Mezon
- `NewsScheduler` - Scheduled tasks

### Entity
- `News` - Entity chứa thông tin tin tức

### Module
- `NewsModule` - Module tích hợp tất cả

### Command
- `NewsCommand` - Commands điều khiển

## 🔍 Troubleshooting

### Không crawl được tin

**Kiểm tra:**
1. Kết nối internet
2. RSS feed URLs còn hoạt động không
3. Logs trong console: `yarn start:dev`

### Không đăng được tin

**Kiểm tra:**
1. `NEWS_CHANNEL_ID` đã đúng chưa
2. Bot có quyền post trong channel không
3. Có tin chưa đăng trong database không (`!news status`)

### Gemini không tạo tóm tắt

**Kiểm tra:**
1. `GEMINI_API_KEY` đã đúng chưa
2. API key còn quota không
3. Nếu không có Gemini, bot sẽ dùng title làm summary

### Database errors

**Giải pháp:**
```bash
# Xóa và tạo lại database
yarn db:revert
yarn db:run
```

## 🎯 Tùy Chỉnh

### Thay đổi lịch crawl

Sửa trong `src/services/news-scheduler.service.ts`:

```typescript
@Cron('0 */15 * * * *') // Thay đổi thành mỗi 15 phút
async handleNewsCrawling() {
    // ...
}
```

### Thêm nguồn tin mới

Sửa trong `src/services/news-crawler.service.ts`:

```typescript
private readonly newsSources: NewsSource[] = [
    // Thêm nguồn mới
    { 
        name: 'Tên Nguồn', 
        url: 'https://example.com/rss', 
        category: 'Công Nghệ' 
    },
    // ...
];
```

### Thêm chủ đề mới

1. Sửa `GeminiService.categorizeNews()` - thêm category vào prompt
2. Sửa `NewsPostingService.categoryEmojis` - thêm emoji cho category

### Thay đổi format tin đăng

Sửa trong `src/services/news-posting.service.ts`:

```typescript
private async postArticleToThread(article: News, threadMessage: any) {
    let messageContent = `...`; // Customize format ở đây
    // ...
}
```

## 📊 Database Query Examples

### Lấy tin chưa đăng theo category
```sql
SELECT * FROM news 
WHERE posted = false AND category = 'Công Nghệ'
ORDER BY "createdAt" DESC;
```

### Thống kê tin theo nguồn
```sql
SELECT source, COUNT(*) as count 
FROM news 
GROUP BY source;
```

### Tin hot nhất (nhiều view)
```sql
SELECT * FROM news 
WHERE posted = true 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

## 🚀 Tips & Best Practices

1. **Test trước khi production**: Dùng `!news crawl` và `!news post` để test
2. **Monitor logs**: Theo dõi logs để catch errors sớm
3. **Backup database**: Backup định kỳ để tránh mất data
4. **Rate limiting**: Không crawl quá nhiều để tránh bị block
5. **Gemini quota**: Theo dõi usage để không vượt quota

## 📞 Support

Nếu gặp vấn đề, vui lòng:
1. Check logs
2. Đọc Troubleshooting section
3. Open issue trên GitHub

---

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Author:** Built with ❤️ using NestJS + Mezon SDK


