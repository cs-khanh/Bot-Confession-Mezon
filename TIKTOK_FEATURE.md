# 🎵 TikTok Hot Videos Feature

## 📋 Tổng Quan

Tính năng tự động crawl và đăng video TikTok hot nhất trong ngày lên Mezon channel.

## ✨ Tính Năng

### 1. **Auto Crawl Video TikTok**
- Crawl video hot từ TikTok Research API
- Tự động mỗi 2 giờ
- Lấy top 100 video, filter top 20 video hot nhất
- Tính hot score dựa trên: `like_count + view_count/10 + share_count*2 + comment_count*1.5`

### 2. **Auto Post Video**
- Đăng video hot nhất vào channel chỉ định
- Tự động lúc: **10h sáng, 3h chiều, 8h tối** mỗi ngày
- Format message đẹp với stats đầy đủ

### 3. **Daily Summary**
- Gửi tổng hợp video hot lúc **9h tối** mỗi ngày
- Hiển thị top 10 video hot nhất chưa đăng
- Thống kê tổng quan

### 4. **Manual Commands**
- `!tiktok crawl` - Crawl video ngay lập tức
- `!tiktok post` - Đăng video hot nhất
- `!tiktok status` - Xem thống kê & trạng thái
- `!tiktok help` - Hướng dẫn sử dụng

## 🚀 Cài Đặt

### 1. Cấu Hình Environment Variables

Thêm vào `.env.local`:

```bash
# TikTok Configuration
TIKTOK_ACCESS_TOKEN=your_tiktok_access_token_here
TIKTOK_CHANNEL_ID=your_channel_id_here
```

### 2. Lấy TikTok Access Token

#### Bước 1: Đăng ký TikTok Developer Account
1. Truy cập: https://developers.tiktok.com/
2. Đăng ký tài khoản developer
3. Tạo một app mới

#### Bước 2: Request Research API Access
1. Vào app dashboard
2. Chọn "Research API"
3. Điền form yêu cầu access (cần giải thích mục đích nghiên cứu)
4. Chờ TikTok approve (có thể mất vài ngày)

#### Bước 3: Lấy Access Token
1. Sau khi được approve, vào app settings
2. Copy **Client Key** và **Client Secret**
3. Sử dụng OAuth flow để lấy access token:

```bash
# Example: Get access token
curl -X POST https://open.tiktokapis.com/v2/oauth/token/ \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_key=YOUR_CLIENT_KEY" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"
```

4. Copy `access_token` từ response

### 3. Lấy Channel ID trong Mezon

#### Cách 1: Từ URL
- Mở channel trong web/desktop
- Copy ID từ URL: `https://mezon.ai/chat/clans/CLAN_ID/channels/CHANNEL_ID`

#### Cách 2: Developer Mode
- Bật Developer Mode trong Settings
- Right-click channel → Copy ID

### 4. Chạy Migration (đã tự động)

Bảng `tiktok_videos` đã được tạo tự động.

## 📊 Database Schema

```sql
Table: tiktok_videos
┌─────────────────────┬──────────┬────────────┐
│ Column              │ Type     │ Description│
├─────────────────────┼──────────┼────────────┤
│ id                  │ UUID     │ Primary    │
│ videoId             │ VARCHAR  │ TikTok ID  │
│ title               │ VARCHAR  │ Video title│
│ authorUsername      │ VARCHAR  │ @username  │
│ authorDisplayName   │ VARCHAR  │ Display    │
│ likeCount           │ BIGINT   │ Likes      │
│ viewCount           │ BIGINT   │ Views      │
│ shareCount          │ BIGINT   │ Shares     │
│ commentCount        │ BIGINT   │ Comments   │
│ videoUrl            │ VARCHAR  │ Full URL   │
│ coverImageUrl       │ VARCHAR  │ Thumbnail  │
│ tiktokCreatedAt     │ TIMESTAMP│ Created    │
│ posted              │ BOOLEAN  │ Posted?    │
│ hotScore            │ INT      │ Hot score  │
│ createdAt           │ TIMESTAMP│ DB created │
│ updatedAt           │ TIMESTAMP│ DB updated │
└─────────────────────┴──────────┴────────────┘
```

## ⏰ Lịch Tự Động

| Thời Gian | Hoạt Động | Mô Tả |
|-----------|-----------|-------|
| Mỗi 2 giờ | Crawl Videos | Crawl video mới từ TikTok |
| 10:00 AM | Post Video | Đăng video hot nhất |
| 3:00 PM | Post Video | Đăng video hot nhất |
| 8:00 PM | Post Video | Đăng video hot nhất |
| 9:00 PM | Daily Summary | Gửi tổng hợp ngày |

## 🎯 Hot Score Algorithm

```typescript
hotScore = likeCount + (viewCount / 10) + (shareCount * 2) + (commentCount * 1.5)
```

**Ví dụ:**
- Video có: 10K likes, 100K views, 1K shares, 500 comments
- Hot Score = 10,000 + 10,000 + 2,000 + 750 = **22,750**

## 📝 Cách Sử Dụng

### Manual Crawl
```
!tiktok crawl
```
**Output:**
```
🎵 TikTok Crawl Hoàn Tất!

✅ Đã crawl: 15 video mới

📌 Dùng !tiktok post để đăng video hot nhất
```

### Post Video Hot Nhất
```
!tiktok post
```
**Output:**
```
🔥 Video TikTok Hot 🎵

📱 [Video Title]

👤 Tác giả: @username (Display Name)

📊 Thống Kê:
• ❤️ Like: 125.5K
• 👀 View: 2.3M
• 🔄 Share: 15.2K
• 💬 Comment: 8.5K
• 🔥 Hot Score: 185.2K

🔗 Link: https://www.tiktok.com/@username/video/123456789
```

### Xem Status
```
!tiktok status
```
**Output:**
```
📊 Trạng Thái TikTok Bot

📹 Thống Kê Video:
• Tổng cộng: 150 video
• Chưa đăng: 23 video
• Đã đăng: 127 video

🔥 Video Hot Nhất (chưa đăng):
• Tiêu đề: Amazing dance video
• Tác giả: @dancer123
• ❤️ Like: 250K
• 👀 View: 5.2M
• 🔥 Hot Score: 520K

📅 Lịch Tự Động:
• Crawl: Mỗi 2 giờ
• Post: 10h sáng, 3h chiều, 8h tối
• Tổng hợp: 9h tối mỗi ngày
```

## 🔧 Troubleshooting

### Lỗi: "TIKTOK_ACCESS_TOKEN not configured"
**Nguyên nhân:** Chưa có access token  
**Giải pháp:** Thêm `TIKTOK_ACCESS_TOKEN` vào `.env.local`

### Lỗi: "TikTok API authentication failed"
**Nguyên nhân:** Token sai hoặc hết hạn  
**Giải pháp:**  
1. Kiểm tra token còn valid không
2. Generate token mới từ TikTok Developer Portal
3. Update `.env.local`

### Lỗi: "TikTok API rate limit exceeded"
**Nguyên nhân:** Vượt quá quota miễn phí  
**Giải pháp:**  
1. Đợi reset limit (thường reset mỗi ngày)
2. Giảm tần suất crawl (sửa cron schedule)
3. Upgrade plan TikTok API

### Lỗi: "Invalid channel identifier"
**Nguyên nhân:** Channel ID sai hoặc bot chưa join channel  
**Giải pháp:**  
1. Kiểm tra `TIKTOK_CHANNEL_ID` trong `.env.local`
2. Đảm bảo bot đã join channel
3. Mention bot trong channel để add: `@bot_name`

## 📚 API References

### TikTok Research API
- Docs: https://developers.tiktok.com/doc/research-api-specs-query-videos
- Rate Limits: 
  - Free tier: 100 requests/day
  - Paid tier: Custom limits

### Video Query Fields
```typescript
{
  id: string;                  // Video ID
  title: string;              // Video title
  create_time: string;        // ISO timestamp
  like_count: number;         // Total likes
  view_count: number;         // Total views
  share_count: number;        // Total shares
  comment_count: number;      // Total comments
  author: {
    unique_id: string;        // @username
    display_name: string;     // Display name
  }
}
```

## 🎨 Customization

### Thay Đổi Lịch Crawl
Sửa file: `src/services/tiktok-scheduler.service.ts`

```typescript
@Cron('0 0 */2 * * *')  // Mỗi 2 giờ
// Đổi thành:
@Cron('0 0 */4 * * *')  // Mỗi 4 giờ
```

### Thay Đổi Lịch Post
```typescript
@Cron('0 0 10,15,20 * * *')  // 10h, 15h, 20h
// Đổi thành:
@Cron('0 0 9,14,19 * * *')   // 9h, 14h, 19h
```

### Thay Đổi Hot Score Formula
Sửa file: `src/services/tiktok.service.ts`

```typescript
private calculateHotScore(...) {
  return Math.floor(
    Number(likeCount) +
    Number(viewCount) / 10 +
    Number(shareCount) * 2 +
    Number(commentCount) * 1.5
  );
}
```

## 📈 Best Practices

1. **Crawl Frequency:** Không quá 1 lần/giờ để tránh rate limit
2. **Token Security:** Không commit token vào git
3. **Channel Permissions:** Đảm bảo bot có quyền send message
4. **Database Cleanup:** Auto xóa video cũ hơn 30 ngày
5. **Error Handling:** Bot tự động retry khi gặp lỗi

## 🆘 Support

Nếu gặp vấn đề:
1. Check logs: `tail -f /tmp/bot.log | grep TikTok`
2. Test manual: `!tiktok status`
3. Verify config: `cat .env.local | grep TIKTOK`

## 📜 License

MIT License - Free to use and modify

