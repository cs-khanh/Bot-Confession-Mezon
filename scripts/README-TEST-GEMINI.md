# Test Gemini API

## Cài đặt

```bash
# Cài đặt dependencies
pip install google-generativeai python-dotenv

# Hoặc nếu dùng requirements.txt
pip install -r requirements.txt
```

## Sử dụng

### Script đơn giản (nhanh)
```bash
python3 scripts/test-gemini-simple.py
```

### Script đầy đủ (test nhiều chức năng)
```bash
python3 scripts/test-gemini-api.py
```

## Yêu cầu

1. File `.env.local` hoặc `.env` có chứa `GEMINI_API_KEY`
2. API key hợp lệ từ Google AI Studio
3. Python 3.7+

## Lấy API Key

1. Truy cập: https://aistudio.google.com/app/apikey
2. Tạo API key mới
3. Thêm vào file `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

## Test Cases

Script sẽ test:
- ✅ Kết nối API
- ✅ Tóm tắt tin tức
- ✅ Phân loại chủ đề
- ✅ Rate limiting (nếu chọn)

## Troubleshooting

### Lỗi: Module not found
```bash
pip install google-generativeai python-dotenv
```

### Lỗi: API key not found
- Kiểm tra file `.env.local` hoặc `.env` có tồn tại không
- Kiểm tra `GEMINI_API_KEY` đã được set chưa

### Lỗi: Rate limit exceeded
- API key có thể đã hết quota
- Chờ một chút rồi thử lại
- Kiểm tra quota tại Google Cloud Console

