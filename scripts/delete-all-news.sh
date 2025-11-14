#!/bin/bash
# Script để xóa tất cả tin tức từ database PostgreSQL

echo "🗑️  Đang xóa tất cả tin tức từ database..."

# Tìm container postgres
CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -n 1)

if [ -z "$CONTAINER" ]; then
    echo "❌ Không tìm thấy container postgres. Hãy chạy: docker ps"
    exit 1
fi

echo "✅ Tìm thấy container: $CONTAINER"

# Đọc database name từ .env hoặc sử dụng default
DB_NAME=${POSTGRES_DB:-confession_bot}
DB_USER=${POSTGRES_USER:-postgres}

echo "📊 Đang kiểm tra số lượng tin tức hiện tại..."
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as total_news FROM news;"

echo ""
read -p "⚠️  Bạn có chắc chắn muốn xóa TẤT CẢ tin tức? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Đã hủy."
    exit 0
fi

echo "🗑️  Đang xóa..."
docker exec -i $CONTAINER psql -U $DB_USER -d $DB_NAME << 'EOF'
DELETE FROM news;
SELECT COUNT(*) as remaining_news FROM news;
EOF

echo ""
echo "✅ Hoàn tất! Đã xóa tất cả tin tức."


