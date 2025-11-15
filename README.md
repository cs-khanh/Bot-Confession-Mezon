# Bot Confession Mezon

Bot xử lý confession và đăng tin tức tự động cho cộng đồng Mezon.

## 📋 Tính năng chính

- **Confession**: Quản lý và đăng confession ẩn danh với hệ thống kiểm duyệt
- **Tin tức**: Tự động crawl và đăng tin từ 29 nguồn RSS uy tín
- **Auto-Moderation**: Kiểm duyệt nội dung tự động với Google Gemini AI
- **Analytics**: Thống kê và phân tích dữ liệu confession
- **Báo cáo tuần**: Tổng hợp confession nổi bật hàng tuần
- **Reaction Tracking**: Theo dõi phản ứng của người dùng với confession
- **Phân loại tin tức**: Tự động phân loại và đăng tin vào channel theo category

## 🚀 Hướng dẫn cài đặt

### Yêu cầu hệ thống

- Docker và Docker Compose
- Node.js (v14+)
- PostgreSQL (v12+)
- Yarn (khuyến nghị) hoặc npm

### Các bước cài đặt

1. **Clone repository**

   ```bash
   git clone https://github.com/cs-khanh/Bot-Confession-Mezon.git
   cd Bot-Confession-Mezon
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
   BOT_ID=your_bot_id
   MEZON_TOKEN=your_mezon_bot_token
   ADMIN_USER_IDS=user_id1,user_id2
   
   # Database settings
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=confession_bot
   
   # Channel settings
   CONFESSION_CHANNEL_ID=your_confession_channel_id
   MODERATION_CHANNEL_ID=your_moderation_channel_id
   ANNOUNCEMENT_CHANNEL_ID=your_announcement_channel_id
   NEWS_CHANNEL_ID=your_news_channel_id
   
   # API keys
   GEMINI_API_KEY=your_gemini_api_key
   USE_GEMINI=true
   AUTO_MODERATION_ENABLED=true
   AI_MODERATION_ENABLED=true
   ```

4. **Khởi động database bằng Docker**

   ```bash
   docker-compose up -d postgres
   ```

5. **Chạy migration để tạo các bảng**

   ```bash
   yarn db:run
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

8. **⚠️ Quan trọng: Chạy lệnh `!check join`**

   Sau khi bot khởi động, bạn **PHẢI** chạy lệnh `!check join` để bot tham gia vào các channel đã cấu hình. Nếu không, bot sẽ không thể đăng tin tức và confession.

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
      "Giải Trí": "entertainment_channel_id",
      "Thể Thao": "sports_channel_id",
      "Đời Sống": "lifestyle_channel_id",
      "Giáo Dục": "education_channel_id",
      "Sức Khỏe": "health_channel_id",
      "Du Lịch": "travel_channel_id"
    }
  }
}
```

## 📝 Danh sách lệnh

### Lệnh cho người dùng thường

- `!post <nội dung>` hoặc `!p <nội dung>` - Gửi confession ẩn danh (có thể kèm hình ảnh)
- `!help [lệnh]` - Hiển thị hướng dẫn sử dụng hoặc chi tiết về một lệnh cụ thể
- `!about` - Thông tin về bot
- `!ping` - Kiểm tra bot còn hoạt động không

### Lệnh quản lý Confession (Admin)

- `!approve <id>` - Duyệt confession (có thể dùng confession number hoặc UUID)
- `!reject <id> [lý do]` - Từ chối confession kèm lý do
- `!topconfession [week]` - Xem top confession của tuần (mặc định tuần hiện tại)
- `!stats` - Xem thống kê confession tổng quan

### Lệnh quản lý Tin tức (Admin)

- `!news crawl` - Crawl tin tức ngay lập tức từ 29 nguồn RSS
- `!news post` - Đăng tin tức chưa đăng vào các channel
- `!news status` - Xem thống kê tin tức (số tin đã crawl, chưa đăng, theo category)
- `!news clear` - Xóa tất cả tin tức (cẩn thận!)

### Lệnh kiểm tra hệ thống (Admin)

- `!check join` - Bot tham gia vào tất cả các channel được cấu hình (⚠️ Quan trọng!)
- `!check channels` - Kiểm tra quyền truy cập vào các channel
- `!dbstatus [detailed]` - Kiểm tra trạng thái database và dữ liệu

## ⚠️ Lưu ý quan trọng

1. **Bắt buộc chạy lệnh `!check join` khi mới cài đặt**

   Để bot có thể đăng tin tức và confession, bạn phải chạy lệnh `!check join` để bot tham gia vào các channel đã cấu hình. Nếu không, bot sẽ không thể gửi tin nhắn vào các channel.

   ```
   !check join
   ```

2. **Quyền hạn lệnh**

   - Người dùng thường chỉ có thể sử dụng: `!post`, `!help`, `!about`, `!ping`
   - Tất cả các lệnh khác chỉ dành cho quản trị viên (admin)

3. **Các lỗi thường gặp và cách khắc phục**

   - **Không thể đăng tin tức**: Chạy lệnh `!check join` để tham gia channel
   - **Không thể kết nối database**: Kiểm tra lại thông tin trong file `.env`
   - **Không crawl được tin tức**: Kiểm tra kết nối mạng và cấu hình nguồn RSS
   - **Confession không được duyệt**: Kiểm tra channel MODERATION_CHANNEL_ID trong `.env`

## 📅 Lịch trình tự động

Bot được cấu hình để tự động thực hiện các công việc sau (theo múi giờ Asia/Ho_Chi_Minh):

- **Crawl tin tức**: Mỗi 30 phút (`0 */30 * * * *`)
- **Đăng tin tức**: 8h sáng, 12h trưa, 4h chiều (`0 0 8,12,16 * * *`)
- **Tổng hợp tin tức**: 8h sáng và 6h chiều (`0 0 8,18 * * *`)
- **Dọn dẹp tin cũ**: 2h sáng hàng ngày, xóa tin hơn 30 ngày (`0 0 2 * * *`)

## 🔄 Quy trình Confession

1. Người dùng gửi confession qua lệnh `!post <nội dung>` (có thể kèm hình ảnh)
2. Bot tự động kiểm duyệt nội dung bằng AI (Gemini) và rule-based filtering
3. Nếu vi phạm: Confession bị từ chối tự động và thông báo cho người dùng
4. Nếu an toàn: Confession được gửi vào channel kiểm duyệt (MODERATION_CHANNEL_ID)
5. Admin duyệt (`!approve`) hoặc từ chối (`!reject`) confession
6. Nếu được duyệt, confession được đăng vào channel chính (CONFESSION_CHANNEL_ID)
7. Người dùng có thể bày tỏ cảm xúc (reaction) với confession
8. Bot tự động theo dõi và thống kê reactions
9. Bot tổng hợp các confession nổi bật hàng tuần

## 🔄 Quy trình Tin tức

1. Bot tự động crawl tin từ 29 nguồn RSS theo lịch (mỗi 30 phút) hoặc qua lệnh `!news crawl`
2. Bot phân loại tin tức theo chủ đề (category)
3. Bot lưu tin vào database và đánh dấu là chưa đăng
4. Bot đăng tin tức vào các channel theo cấu hình:
   - Tin được đăng vào channel tương ứng với category (nếu có trong `channels-config.json`)
   - Nếu không có category phù hợp, đăng vào channel mặc định
5. Bot tự động đăng tin theo lịch (8h, 12h, 16h) hoặc qua lệnh `!news post`
6. Bot tự động tổng hợp tin tức nổi bật hàng ngày (8h sáng và 6h chiều)
7. Bot tự động dọn dẹp tin cũ (hơn 30 ngày) lúc 2h sáng

## 🧠 Auto-Moderation

Bot sử dụng Google Gemini API cho việc kiểm duyệt nội dung tự động:

- **Phát hiện spam**: Tự động phát hiện nội dung spam
- **Phát hiện toxic content**: Phát hiện ngôn từ xúc phạm và nội dung không phù hợp
- **Phân tích hình ảnh**: Kiểm duyệt hình ảnh đính kèm (nếu có)
- **Tự động phân loại**: Tự động gán tags cho confession dựa trên nội dung
- **Tự động duyệt/từ chối**: Có thể tự động duyệt hoặc từ chối confession dựa trên kết quả phân tích

### Cấu hình Auto-Moderation

Trong file `.env`:

```
AUTO_MODERATION_ENABLED=true
AI_MODERATION_ENABLED=true
USE_GEMINI=true
GEMINI_API_KEY=your_gemini_api_key
```

## 📊 Analytics & Statistics

Bot cung cấp các tính năng thống kê và phân tích:

- **Thống kê tổng quan**: Tổng số confession, tỷ lệ duyệt, phản ứng trung bình
- **Top Confessions**: Danh sách confession có nhiều reaction nhất
- **Tag Analytics**: Thống kê các hashtag được sử dụng nhiều nhất
- **Weekly Stats**: Tự động tạo báo cáo tuần với:
  - Tổng số confession trong tuần
  - Tỷ lệ duyệt/từ chối
  - Top 5 confession nổi bật
  - Phân bố reactions
  - Top tags

## 🛠️ Cấu trúc thư mục

```
├── src/
│   ├── command/          # Các lệnh của bot
│   │   ├── about.command.ts
│   │   ├── approve.command.ts
│   │   ├── check.command.ts
│   │   ├── confess.command.ts
│   │   ├── dbstatus.command.ts
│   │   ├── help.command.ts
│   │   ├── news.command.ts
│   │   ├── ping.command.ts
│   │   ├── reject.command.ts
│   │   ├── stats.command.ts
│   │   └── topconfession.command.ts
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
│   │   ├── analytics.service.ts
│   │   ├── auto-moderation.service.ts
│   │   ├── confession.service.ts
│   │   ├── gemini.service.ts
│   │   ├── moderation.service.ts
│   │   ├── news-crawler.service.ts
│   │   ├── news-posting.service.ts
│   │   ├── news-scheduler.service.ts
│   │   └── news.service.ts
│   ├── types/            # Type definitions
│   ├── utils/            # Các tiện ích
│   ├── app.module.ts     # Module chính
│   └── main.ts           # Điểm khởi đầu ứng dụng
├── scripts/              # Scripts hỗ trợ
├── channels-config.json  # Cấu hình channel tin tức
├── docker-compose.yml    # Cấu hình Docker Compose
└── package.json          # Dependencies và scripts
```

## 🧪 Testing

```bash
# Unit tests
yarn test

# End-to-end tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## 💻 Phát triển

### Thêm lệnh mới

1. Tạo file trong thư mục `src/command/`
2. Kế thừa từ class `CommandMessage`
3. Sử dụng decorator `@Command`
4. Đăng ký lệnh trong `src/modules/bot.module.ts`

Ví dụ:

```typescript
@Command('example', {
    description: 'Lệnh ví dụ',
    usage: '!example [tham số]',
    category: 'Utility',
})
@Injectable()
export class ExampleCommand extends CommandMessage {
    async execute(args: string[], message: ChannelMessage) {
        return this.replyMessageGenerate({ 
            messageContent: 'Xin chào thế giới!' 
        }, message);
    }
}
```

### Chạy migrations

```bash
# Tạo migration mới
yarn db:create src/migrations/NewMigrationName

# Tạo migration tự động từ thay đổi entity
yarn db:generate

# Chạy migrations
yarn db:run

# Rollback migration gần nhất
yarn db:revert
```

### Đảm bảo chất lượng code

```bash
# Kiểm tra linting
yarn lint

# Format code
yarn format
```

## 🚢 Triển khai

### Docker (Khuyến nghị)

```bash
# Build Docker image
docker build -t bot-confession-mezon .

# Chạy container
docker-compose up -d
```

### Triển khai thủ công

```bash
# Build ứng dụng
yarn build

# Chạy production
NODE_ENV=production yarn start:prod
```

## 📝 Hỗ trợ và đóng góp

Nếu bạn gặp vấn đề hoặc có đề xuất, vui lòng tạo issue trên GitHub hoặc liên hệ qua Mezon.

## 📄 License

MIT

## 🙏 Công nghệ sử dụng

- **NestJS**: Framework Node.js hiện đại
- **TypeORM**: ORM cho PostgreSQL
- **Mezon SDK**: SDK chính thức cho nền tảng Mezon
- **Docker**: Containerization
- **Google Gemini API**: AI cho auto-moderation và phân tích nội dung
- **RSS Parser**: Crawl tin tức từ các nguồn RSS
- **Cheerio**: Parse và xử lý HTML
- **date-fns**: Xử lý ngày tháng
- **@nestjs/schedule**: Lập lịch tự động với cron jobs
