#!/usr/bin/env python3
"""
Script đơn giản để test Gemini API
"""

import os
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env.local') if os.path.exists('.env.local') else load_dotenv('.env')

try:
    import google.generativeai as genai
except ImportError:
    print("❌ Cần cài đặt: pip install google-generativeai python-dotenv")
    sys.exit(1)

# Get API key
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("❌ GEMINI_API_KEY không tìm thấy trong .env.local hoặc .env")
    sys.exit(1)

# Configure
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.0-flash-lite')

print("🔄 Đang test Gemini API...\n")

# Test đơn giản
try:
    response = model.generate_content("Hãy tóm tắt ngắn gọn về Việt Nam trong 1 câu")
    print("✅ Test thành công!")
    print(f"📝 Response: {response.text}\n")
except Exception as e:
    print(f"❌ Lỗi: {e}")
    sys.exit(1)

# Test tóm tắt tin tức
print("🔄 Test tóm tắt tin tức...\n")
try:
    prompt = """Bạn là một biên tập viên tin tức. Hãy tạo một đoạn tóm tắt ngắn gọn (2-3 câu) từ tiêu đề và nội dung sau:

Tiêu đề: Apple ra mắt iPhone 15
Nội dung: Apple vừa công bố iPhone 15 với nhiều tính năng mới như camera cải tiến, chip A17 Pro mạnh mẽ hơn.

Tóm tắt:"""
    
    response = model.generate_content(prompt)
    print("✅ Tóm tắt tin tức thành công!")
    print(f"📝 Summary: {response.text}\n")
except Exception as e:
    print(f"❌ Lỗi: {e}")

print("✅ Hoàn tất test!")

