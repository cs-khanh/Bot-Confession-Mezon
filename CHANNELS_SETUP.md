# 🎯 Cấu Hình Channels Theo Chủ Đề

## 📋 Hướng Dẫn Setup

Bot hỗ trợ đăng tin vào **nhiều channels khác nhau** theo từng chủ đề!

### 1️⃣ Lấy Channel IDs

**Trong Mezon:**
1. Nhấn chuột phải vào channel → **Copy Channel ID**
2. Lặp lại cho tất cả channels bạn muốn

**Ví dụ:**
- #tech-news → `1234567890123456789`
- #sports → `9876543210987654321`
- #entertainment → `5555444433332222111`

### 2️⃣ Cập Nhật `channels-config.json`

Sửa file `channels-config.json`:

```json
{
  "channels": {
    "default": "1975813564962705408",
    "categories": {
      "Công Nghệ": "1234567890123456789",
      "Kinh Doanh": "9876543210987654321",
      "Giải Trí": "5555444433332222111",
      "Thể Thao": "1111222233334444555",
      "Đời Sống": "1975813564962705408",
      "Giáo Dục": "1975813564962705408",
      "Sức Khỏe": "1975813564962705408",
      "Du Lịch": "1975813564962705408",
      "Tổng hợp": "1975813564962705408"
    }
  }
}
```

**Giải thích:**
- `default`: Channel mặc định cho tin tổng hợp và daily summary
- `categories`: Mapping từ chủ đề → channel ID

### 3️⃣ Restart Bot

```bash
cd /home/adminphuc/Trong/mezon-bot-template
pkill -9 -f "nest start"
yarn start:dev
```

## 🎨 Ví Dụ Cấu Hình

### Config 1: Tất Cả Vào 1 Channel
```json
{
  "channels": {
    "default": "1975813564962705408",
    "categories": {
      "Công Nghệ": "1975813564962705408",
      "Kinh Doanh": "1975813564962705408",
      "Giải Trí": "1975813564962705408"
    }
  }
}
```

### Config 2: Mỗi Chủ Đề 1 Channel Riêng
```json
{
  "channels": {
    "default": "1975813564962705408",
    "categories": {
      "Công Nghệ": "1234567890123456789",
      "Kinh Doanh": "9876543210987654321",
      "Giải Trí": "5555444433332222111",
      "Thể Thao": "1111222233334444555",
      "Đời Sống": "6666777788889999000",
      "Giáo Dục": "1234567890987654321",
      "Sức Khỏe": "9876543211234567890",
      "Du Lịch": "5555666677778888999",
      "Tổng hợp": "1975813564962705408"
    }
  }
}
```

### Config 3: Nhóm Channels
```json
{
  "channels": {
    "default": "1975813564962705408",
    "categories": {
      "Công Nghệ": "1234567890123456789",
      "Kinh Doanh": "1234567890123456789",
      "Giải Trí": "9876543210987654321",
      "Thể Thao": "9876543210987654321",
      "Đời Sống": "1975813564962705408",
      "Giáo Dục": "1975813564962705408",
      "Sức Khỏe": "1975813564962705408",
      "Du Lịch": "1975813564962705408",
      "Tổng hợp": "1975813564962705408"
    }
  }
}
```

## 🔄 Workflow

Khi `!news post` được gọi:

1. Bot đọc `channels-config.json`
2. Lấy tin chưa đăng theo từng category
3. Với mỗi category:
   - Lấy channel ID từ `categories[category]`
   - Nếu không có → dùng `default`
   - Tạo thread trong channel đó
   - Đăng tin vào thread

## 📝 Logs

Khi đăng tin, bạn sẽ thấy logs:
```
[NewsPostingService] Loaded channels config from channels-config.json
[NewsPostingService] Posting 5 news for category: Công Nghệ to channel: 1234567890123456789
[NewsPostingService] Posted article: iPhone 17 ra mắt...
[NewsPostingService] Successfully posted 5 articles for Công Nghệ
```

## ⚙️ Nâng Cao

### Reload Config Không Cần Restart

Config được load khi bot start. Để apply thay đổi:
```bash
pkill -9 -f "nest start"
yarn start:dev
```

### Fallback Behavior

1. Nếu channel không tồn tại trong config → dùng `default`
2. Nếu không có `default` → dùng `NEWS_CHANNEL_ID` từ `.env.local`
3. Nếu không có gì → skip posting với warning

## 🆘 Troubleshooting

**Bot không đăng được:**
- ✅ Check channel IDs đúng chưa
- ✅ Bot có quyền post trong channel không
- ✅ File `channels-config.json` có valid JSON không

**Test:**
```bash
cat channels-config.json | jq .
```

---

**Ready to use!** 🚀 Chỉnh sửa `channels-config.json` theo ý bạn rồi restart bot là xong!

