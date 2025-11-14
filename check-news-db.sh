#!/bin/bash
# Script để kiểm tra database đang lưu news

echo "📊 Thông tin Database News"
echo "=========================="
echo ""

# Load environment variables
if [ -f .env.local ]; then
    source .env.local
elif [ -f .env ]; then
    source .env
fi

echo "🔹 Database Type: PostgreSQL"
echo "🔹 Host: ${POSTGRES_HOST:-localhost}"
echo "🔹 Port: ${POSTGRES_PORT:-5432}"
echo "🔹 User: ${POSTGRES_USER:-postgres}"
echo "🔹 Database Name: ${POSTGRES_DB:-confession_bot}"
echo "🔹 Table: news"
echo "🔹 Schema: public"
echo ""

# Nếu có docker, thử kết nối
if command -v docker &> /dev/null; then
    CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -n 1)
    if [ ! -z "$CONTAINER" ]; then
        echo "✅ Tìm thấy container PostgreSQL: $CONTAINER"
        echo ""
        echo "📋 Kiểm tra số lượng tin tức:"
        docker exec -i $CONTAINER psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-confession_bot} -c "SELECT COUNT(*) as total_news FROM news;" 2>/dev/null || echo "❌ Không thể kết nối database"
    else
        echo "⚠️  Không tìm thấy container PostgreSQL đang chạy"
    fi
else
    echo "⚠️  Docker không được cài đặt hoặc không có quyền truy cập"
fi

echo ""
echo "💡 Để xem chi tiết, chạy: !news status"

