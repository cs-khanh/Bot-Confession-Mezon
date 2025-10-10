# 🎵 Cài Đặt TikTok Feature - Hướng Dẫn Chi Tiết

## 📝 Yêu Cầu

- [x] Đã cài đặt News Feature
- [x] Đã có Mezon bot token
- [x] Đã có PostgreSQL database
- [ ] TikTok Developer Account
- [ ] TikTok Research API Access

## 🚀 Bước 1: Lấy TikTok Access Token

### 1.1. Đăng Ký TikTok Developer

1. Truy cập: https://developers.tiktok.com/
2. Click **"Get Started"** hoặc **"Sign Up"**
3. Đăng nhập bằng TikTok account (hoặc tạo mới)
4. Hoàn tất profile verification

### 1.2. Tạo App

1. Vào **"My Apps"** → **"Create an App"**
2. Điền thông tin:
   - **App Name:** `Mezon News Bot` (hoặc tên bạn muốn)
   - **Category:** `News & Information`
   - **Description:** Mô tả ngắn về bot
3. Click **"Create"**

### 1.3. Request Research API Access

⚠️ **Lưu Ý:** TikTok Research API không miễn phí cho tất cả users. Cần apply và được approve.

1. Trong app dashboard, chọn **"Research API"**
2. Click **"Apply for Access"**
3. Điền form:
   - **Organization:** Tên tổ chức (hoặc cá nhân)
   - **Research Purpose:** Mục đích nghiên cứu xu hướng nội dung
   - **Use Case:** Phân tích video trending cho community bot
4. Submit và chờ approve (1-7 ngày)

### 1.4. Generate Access Token

Sau khi được approve:

```bash
curl -X POST 'https://open.tiktokapis.com/v2/oauth/token/' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'client_key=YOUR_CLIENT_KEY' \
  -d 'client_secret=YOUR_CLIENT_SECRET' \
  -d 'grant_type=client_credentials'
```

**Response:**
```json
{
  "access_token": "act.example1234567890abcdef",
  "expires_in": 7200,
  "token_type": "Bearer"
}
```

Copy `access_token` để dùng.

## 🔧 Bước 2: Cấu Hình Environment

Thêm vào `.env.local`:

```bash
# TikTok Configuration
TIKTOK_ACCESS_TOKEN=act.example1234567890abcdef
TIKTOK_CHANNEL_ID=1975813564962705408
```

### Lấy TIKTOK_CHANNEL_ID

**Cách 1 - Từ URL:**
```
URL: https://mezon.ai/chat/clans/123456/channels/1975813564962705408
                                                    ^^^^^^^^^^^^^^^^^^^
                                                    Copy phần này
```

**Cách 2 - Developer Mode:**
1. Settings → Advanced → Enable "Developer Mode"
2. Right-click channel → "Copy ID"

## ✅ Bước 3: Verify Setup

### 3.1. Check Logs

```bash
tail -f /tmp/bot.log | grep -i tiktok
```

**Expected output:**
```
[Nest] xxx - LOG [InstanceLoader] TikTokModule dependencies initialized
[Nest] xxx - LOG [CommandStorage] Registered command: tiktok
```

### 3.2. Test Manual Crawl

Trong Mezon channel, gửi:
```
!tiktok crawl
```

**Nếu thành công:**
```
🎵 TikTok Crawl Hoàn Tất!

✅ Đã crawl: 15 video mới

📌 Dùng !tiktok post để đăng video hot nhất
```

**Nếu lỗi:**

#### Lỗi 1: "TIKTOK_ACCESS_TOKEN not configured"
```bash
# Kiểm tra .env.local
grep TIKTOK_ACCESS_TOKEN .env.local

# Nếu không có, thêm vào:
echo "TIKTOK_ACCESS_TOKEN=your_token_here" >> .env.local

# Restart bot
pkill -9 -f "nest start" && yarn start:dev > /tmp/bot.log 2>&1 &
```

#### Lỗi 2: "TikTok API authentication failed"
- Token sai hoặc hết hạn
- Generate token mới (Bước 1.4)
- Update `.env.local`

#### Lỗi 3: "TikTok API rate limit exceeded"
- Đã vượt quota (thường 100 requests/day cho free tier)
- Đợi đến ngày mai
- Hoặc upgrade TikTok API plan

## 📊 Bước 4: Tạo Dedicated Channel (Optional)

Để tổ chức tốt hơn, tạo channel riêng cho TikTok videos:

1. Tạo channel mới: `#🎵-tiktok-hot`
2. Lấy channel ID
3. Update `.env.local`:
   ```bash
   TIKTOK_CHANNEL_ID=new_channel_id_here
   ```
4. Invite bot vào channel: mention `@bot_name`

## ⏰ Bước 5: Verify Auto Schedule

Bot sẽ tự động:
- **Crawl:** Mỗi 2 giờ
- **Post:** 10h sáng, 3h chiều, 8h tối
- **Summary:** 9h tối

Để test ngay không cần chờ:
```
!tiktok crawl   # Crawl ngay
!tiktok post    # Đăng video hot nhất
!tiktok status  # Xem thống kê
```

## 🎯 Optimization Tips

### 1. Rate Limit Management

**Free Tier:** 100 requests/day

Với schedule mặc định (crawl mỗi 2 giờ):
- 12 crawls/day × 1 request = 12 requests
- **✅ An toàn** còn 88 requests dư

Nếu muốn crawl nhiều hơn, adjust cron:
```typescript
// src/services/tiktok-scheduler.service.ts
@Cron('0 0 */4 * * *')  // Mỗi 4 giờ thay vì 2 giờ
```

### 2. Database Optimization

Tự động cleanup video cũ hơn 30 ngày. Để thay đổi:

```typescript
// src/services/tiktok.service.ts
await this.tiktokService.deleteOldVideos(30);  // 30 ngày
// Đổi thành:
await this.tiktokService.deleteOldVideos(7);   // 7 ngày
```

### 3. Hot Score Tuning

Hiện tại:
```
hotScore = likes + views/10 + shares×2 + comments×1.5
```

Nếu muốn ưu tiên engagement hơn views:
```typescript
// src/services/tiktok.service.ts
return Math.floor(
  Number(likeCount) * 2 +        // Tăng weight likes
  Number(viewCount) / 20 +       // Giảm weight views  
  Number(shareCount) * 3 +       // Tăng weight shares
  Number(commentCount) * 2       // Tăng weight comments
);
```

## 🔍 Monitoring & Debugging

### Check Bot Status
```bash
ps aux | grep "nest start"
```

### Check Logs
```bash
# All TikTok logs
tail -100 /tmp/bot.log | grep TikTok

# Only errors
tail -100 /tmp/bot.log | grep -E "TikTok.*ERROR"

# Crawl events
tail -100 /tmp/bot.log | grep "Crawling TikTok"

# Post events
tail -100 /tmp/bot.log | grep "Posting.*TikTok"
```

### Check Database
```bash
# Check video count
sudo docker exec -i mezon-bot-template-postgres-1 psql -U postgres -d mezon_bot -c "SELECT COUNT(*) FROM tiktok_videos;"

# Check unposted videos
sudo docker exec -i mezon-bot-template-postgres-1 psql -U postgres -d mezon_bot -c "SELECT COUNT(*) FROM tiktok_videos WHERE posted = false;"

# Top 5 hottest videos
sudo docker exec -i mezon-bot-template-postgres-1 psql -U postgres -d mezon_bot -c "SELECT title, \"hotScore\", \"likeCount\", \"viewCount\" FROM tiktok_videos WHERE posted = false ORDER BY \"hotScore\" DESC LIMIT 5;"
```

## 🚨 Troubleshooting

### Bot không crawl tự động

1. **Check scheduler:**
```bash
tail -100 /tmp/bot.log | grep "Starting scheduled TikTok"
```

2. **Check cron job registered:**
```bash
tail -100 /tmp/bot.log | grep "crawl-tiktok"
```

3. **Manual trigger test:**
```
!tiktok crawl
```

### Video không post lên channel

1. **Check channel ID:**
```bash
grep TIKTOK_CHANNEL_ID .env.local
```

2. **Check bot đã join channel chưa:**
- Vào channel
- Mention `@bot_name`
- Nếu bot reply → OK
- Nếu không → Add bot vào channel

3. **Check unposted videos:**
```
!tiktok status
```

## 📱 Alternative: Không Có Research API Access?

Nếu không được approve Research API, có thể:

### Option 1: Use Mock Data (Development)
Tạo mock crawler để test UI:
```typescript
// Disable real API, use mock data
if (!accessToken || accessToken === 'mock') {
  return await this.generateMockVideos();
}
```

### Option 2: RSS Feeds
Một số báo có RSS feed về TikTok trending (ít real-time hơn)

### Option 3: Wait for Approval
Research API thường approve trong vòng 1 tuần nếu use case hợp lý.

## 🎉 Hoàn Tất!

Setup xong! Bot sẽ:
- ✅ Auto crawl TikTok hot videos
- ✅ Auto post video vào channel
- ✅ Gửi daily summary
- ✅ Respond to commands

**Commands:**
- `!tiktok crawl` - Crawl ngay
- `!tiktok post` - Post video hot nhất
- `!tiktok status` - Xem stats
- `!tiktok help` - Hướng dẫn

Enjoy! 🎵🔥

