# 📊 Tính Năng Báo Cáo Crawl Tự Động

## ✨ Chức Năng

Sau **mỗi 30 phút** crawl tin tự động, bot sẽ gửi báo cáo vào **channel mặc định** với thông tin:

- ✅ Số tin mới crawl được
- 📊 Tổng số tin chưa đăng
- 📈 Phân loại theo từng chủ đề
- ❌ Các lỗi (nếu có)

## 📝 Format Báo Cáo

### Khi Crawl Thành Công

```
🤖 Báo Cáo Crawl Tin - 11:30

✅ Crawl thành công!

📰 Tin mới: 15 bài
📊 Tổng chưa đăng: 98 bài

Phân loại:
• Công Nghệ: 25 bài
• Thể Thao: 20 bài
• Giải Trí: 18 bài
• Kinh Doanh: 15 bài
• Du Lịch: 10 bài
• Sức Khỏe: 10 bài
```

### Khi Có Lỗi

```
🤖 Báo Cáo Crawl Tin - 12:00

❌ Lỗi: Connection timeout
```

### Khi Không Có Tin Mới

```
🤖 Báo Cáo Crawl Tin - 12:30

✅ Crawl thành công!

📰 Tin mới: 0 bài
📊 Tổng chưa đăng: 83 bài

Phân loại:
• Công Nghệ: 20 bài
• Thể Thao: 18 bài
...
```

## ⚙️ Cấu Hình

Báo cáo được gửi vào **channel mặc định** được config trong `.env.local`:

```env
NEWS_CHANNEL_ID=1975813564962705408
```

Hoặc trong `channels-config.json`:

```json
{
  "channels": {
    "default": "1975813564962705408",
    ...
  }
}
```

## 📅 Lịch Gửi

Báo cáo được gửi **mỗi 30 phút** sau khi crawl xong:
- 00:30, 01:00, 01:30, 02:00...
- ...
- 23:00, 23:30

**Tổng:** 48 báo cáo/ngày

## 🔕 Tắt Báo Cáo (Nếu Không Muốn)

Nếu không muốn nhận báo cáo, có 2 cách:

### Cách 1: Comment code
Sửa `src/services/news-scheduler.service.ts`:

```typescript
async handleNewsCrawling() {
    // ...
    
    // Comment dòng này để tắt báo cáo
    // await this.sendCrawlReport(newArticles, countAfterTotal);
}
```

### Cách 2: Không set NEWS_CHANNEL_ID
Nếu không có `NEWS_CHANNEL_ID`, báo cáo sẽ không được gửi.

## 🎨 Tùy Chỉnh Format

Muốn thay đổi format báo cáo? Sửa method `sendCrawlReport()` trong `src/services/news-scheduler.service.ts`:

```typescript
private async sendCrawlReport(...) {
    let reportContent = `🤖 Báo Cáo - ${currentTime}\n\n`;
    // Tùy chỉnh format ở đây
}
```

## 💡 Tips

1. **Theo dõi realtime**: Xem channel để biết bot đang hoạt động
2. **Debug errors**: Nếu có lỗi lặp lại, check logs hoặc báo cáo
3. **Monitor performance**: Theo dõi số tin mới mỗi 30 phút

## 📊 Ví Dụ Thực Tế

**11:00** - Bot crawl và gửi báo cáo:
```
📰 Tin mới: 12 bài
```

**11:30** - Crawl tiếp:
```
📰 Tin mới: 8 bài
📊 Tổng: 20 bài (chưa post)
```

**12:00** - Đến giờ post tin (12h trưa):
- Bot post 20 bài vào các channels
- Sau đó crawl tiếp và báo cáo:
```
📰 Tin mới: 5 bài
📊 Tổng: 5 bài
```

---

**Tính năng này giúp bạn:**
- ✅ Theo dõi hoạt động của bot
- ✅ Phát hiện lỗi sớm
- ✅ Biết khi nào nên post tin
- ✅ Monitor số lượng tin theo thời gian

**Enjoy!** 🚀

