# Bot Confession Mezon

Bot xử lý confession và đăng tin tức tự động cho cộng đồng Mezon.

## 📋 Tính năng chính

- **Confession**: Quản lý và đăng confession ẩn danh
- **Tin tức**: Tự động crawl và đăng tin từ các nguồn uy tín
- **TikTok**: Tổng hợp video TikTok thịnh hành

## 🚀 Hướng dẫn cài đặt

### Yêu cầu hệ thống

- Docker và Docker Compose
- Node.js (v14+)
- PostgreSQL

### Các bước cài đặt

1. **Clone repository**

   ```bash
   git clone https://github.com/ThanhTronggg/Bot-confession-mezon.git
   cd mezon-bot-template
   ```

2. **Cài đặt các dependencies**

   ```bash
   yarn install
   ```

3. **Tạo file .env**

   Tạo file `.env` từ file `.env.example`:

   ```bash
   cp .env.example .env
   ```

   Sau đó cập nhật các biến môi trường:
   ```
   # Bot settings
   BOT_TOKEN=your_mezon_bot_token
   ADMIN_USER_ID=your_admin_user_id
   
   # Database settings
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_NAME=confession_bot
   
   # Channel settings
   CONFESSION_CHANNEL_ID=your_confession_channel_id
   PENDING_CHANNEL_ID=your_pending_channel_id
   REPORT_CHANNEL_ID=your_report_channel_id
   NEWS_CHANNEL_ID=your_news_channel_id
   
   # API keys
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Khởi động database bằng Docker**

   ```bash
   docker-compose up -d postgres
   ```

5. **Chạy migration để tạo các bảng**

   ```bash
   yarn migration:run
   ```

6. **Khởi động bot**

   ```bash
   # Chế độ development
   yarn start:dev
   
   # Hoặc chạy production
   yarn build
   yarn start:prod
   ```

7. **Hoặc chạy toàn bộ bằng Docker Compose**

   ```bash
   docker-compose up -d
   ```

## 🔧 Cấu hình

### Cấu hình channel tin tức

File `channels-config.json` chứa cấu hình channel cho từng category tin tức:

```json
{
  "channels": {
    "default": "default_channel_id",
    "categories": {
      "Công Nghệ": "technology_channel_id",
      "Kinh Doanh": "business_channel_id",
      "...": "..."
    }
  }
}
```

## 📝 Các lệnh cơ bản

### Lệnh confession

- `!confess <nội dung>` - Gửi confession ẩn danh
- `!approve <id>` - Duyệt confession (admin)
- `!reject <id> [lý do]` - Từ chối confession (admin)
- `!topconfession` - Xem confession được yêu thích nhất

### Lệnh tin tức

- `!news crawl` - Crawl tin tức ngay lập tức
- `!news post` - Đăng tin tức chưa đăng
- `!news status` - Xem thống kê tin tức

### Lệnh TikTok

- `!tiktok trending` - Xem video TikTok thịnh hành
- `!tiktok search <từ khóa>` - Tìm kiếm video TikTok

### Lệnh quản trị

- `!help` - Hiển thị hướng dẫn sử dụng
- `!about` - Thông tin về bot
- `!ping` - Kiểm tra bot còn hoạt động không
- `!check join` - Bot tham gia vào các channel (quan trọng để đăng tin)

## ⚠️ Lưu ý quan trọng

1. **Bắt buộc chạy lệnh `!check join` khi mới cài đặt**

   Để bot có thể đăng tin tức, bạn phải chạy lệnh `!check join` để bot tham gia vào các channel đã cấu hình. Nếu không, bot sẽ không thể gửi tin nhắn vào các channel.

   ```
   !check join
   ```

2. **Các lỗi thường gặp và cách khắc phục**

   - **Không thể đăng tin tức**: Chạy lệnh `!check join` để tham gia channel
   - **Không thể kết nối database**: Kiểm tra lại thông tin trong file `.env`
   - **Không crawl được tin tức**: Kiểm tra kết nối mạng và cấu hình nguồn tin

## 🧠 Auto-Moderation

Bot sử dụng Gemini API cho việc kiểm duyệt nội dung tự động:

- Phát hiện ngôn từ xúc phạm
- Phân loại nội dung không phù hợp
- Chấm điểm độ an toàn của nội dung

## 📅 Lịch trình tự động

Bot được cấu hình để tự động thực hiện các công việc sau:

- **Crawl tin tức**: Mỗi 30 phút
- **Đăng tin tức**: 8h sáng, 12h trưa, 4h chiều
- **Tổng hợp tin tức**: 8h sáng và 6h chiều
- **Dọn dẹp tin cũ**: 2h sáng hàng ngày

## 🛠️ Phát triển

### Cấu trúc thư mục

```
├── src/
│   ├── command/          # Các lệnh của bot
│   ├── common/           # Các hằng số và tiện ích
│   ├── config/           # Cấu hình ứng dụng
│   ├── controllers/      # API controllers
│   ├── decorators/       # Decorators tùy chỉnh
│   ├── entities/         # Các entity TypeORM
│   ├── gateway/          # Gateway kết nối Mezon
│   ├── listeners/        # Event listeners
│   ├── migrations/       # Migration database
│   ├── modules/          # Các module ứng dụng
│   ├── services/         # Logic nghiệp vụ
│   ├── types/            # Type definitions
│   ├── utils/            # Các tiện ích
│   ├── app.module.ts     # Module chính
│   └── main.ts           # Điểm khởi đầu ứng dụng
├── scripts/              # Scripts hỗ trợ
├── docker-compose.yml    # Cấu hình Docker Compose
└── package.json          # Dependencies và scripts
```

### Thêm lệnh mới

1. Tạo file trong thư mục `src/command/`
2. Kế thừa từ class `CommandMessage`
3. Sử dụng decorator `@Command`
4. Đăng ký lệnh trong module tương ứng

### Chạy migrations

```bash
# Tạo migration mới
yarn migration:create src/migrations/NewMigrationName

# Tạo migration tự động từ thay đổi entity
yarn migration:generate src/migrations/AutoMigration

# Chạy migrations
yarn migration:run

# Rollback migration gần nhất
yarn migration:revert
```

## 📄 License

MIT