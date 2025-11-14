#!/usr/bin/env python3
"""
Script để test API Gemini
Sử dụng: python3 scripts/test-gemini-api.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local') if os.path.exists('.env.local') else load_dotenv('.env')

# Import Google Generative AI
try:
    import google.generativeai as genai
except ImportError:
    print("❌ Error: google-generativeai package not installed")
    print("Install it using: pip install google-generativeai")
    sys.exit(1)


def test_gemini_api():
    """Test Gemini API với một prompt đơn giản"""
    
    # Get API key từ environment variable
    api_key = 'AIzaSyCeHtsxm1GU_jvwRyJS3qthXzepk3dsN90'
    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found in environment variables")
        print("Please set GEMINI_API_KEY in .env.local or .env file")
        return False
    
    print("✅ API Key found")
    print(f"🔑 API Key length: {len(api_key)} characters")
    print("")
    
    try:
        # Configure Gemini API
        genai.configure(api_key=api_key)
        
        # Tạo model
        model = genai.GenerativeModel('gemini-2.0-flash-lite')
        
        print("🔄 Testing Gemini API...")
        print("")
        
        # Test 1: Simple prompt
        print("📝 Test 1: Simple prompt")
        prompt1 = "Hãy tóm tắt ngắn gọn: Việt Nam là một quốc gia ở Đông Nam Á"
        response1 = model.generate_content(prompt1)
        print(f"Prompt: {prompt1}")
        print(f"Response: {response1.text}")
        print("")
        
        # Test 2: News summary (giống như trong bot)
        print("📝 Test 2: News summary")
        title = "Apple ra mắt iPhone 15"
        content = "Apple vừa công bố iPhone 15 với nhiều tính năng mới như camera cải tiến, chip A17 Pro mạnh mẽ hơn, và hỗ trợ USB-C."
        prompt2 = f"""Bạn là một biên tập viên tin tức chuyên nghiệp. Hãy tạo một đoạn tóm tắt ngắn gọn, hấp dẫn (khoảng 2-3 câu, tối đa 150 từ) từ tiêu đề và nội dung tin tức sau đây. Tóm tắt phải súc tích, dễ hiểu và thu hút người đọc.

Tiêu đề: {title}

Nội dung: {content}

Tóm tắt (chỉ trả về nội dung tóm tắt, không thêm bất kỳ chú thích nào):"""
        
        response2 = model.generate_content(prompt2)
        print(f"Title: {title}")
        print(f"Content: {content}")
        print(f"Summary: {response2.text}")
        print("")
        
        # Test 3: Category classification
        print("📝 Test 3: Category classification")
        prompt3 = f"""Bạn là một chuyên gia phân loại tin tức. Hãy phân loại tin tức sau đây vào MỘT trong các chủ đề sau:
- Công Nghệ (Technology)
- Kinh Doanh (Business)
- Giải Trí (Entertainment)
- Thể Thao (Sports)
- Đời Sống (Lifestyle)
- Giáo Dục (Education)
- Sức Khỏe (Health)
- Du Lịch (Travel)
- Tổng hợp (General)

Tiêu đề: {title}
Nội dung: {content}

Chỉ trả về TÊN CHỦ ĐỀ bằng tiếng Việt (ví dụ: "Công Nghệ", "Giải Trí"), không giải thích gì thêm:"""
        
        response3 = model.generate_content(prompt3)
        print(f"Category: {response3.text.strip()}")
        print("")
        
        print("✅ All tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        return False


def test_rate_limiting():
    """Test rate limiting với nhiều requests"""
    
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ Error: GEMINI_API_KEY not found")
        return False
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-lite')
    
    print("🔄 Testing rate limiting with 5 requests...")
    print("")
    
    import time
    
    for i in range(5):
        try:
            start_time = time.time()
            response = model.generate_content(f"Count to {i+1}")
            elapsed = time.time() - start_time
            print(f"Request {i+1}: Success (took {elapsed:.2f}s)")
            
            # Delay 3 giây giữa các requests (giống như trong bot)
            if i < 4:
                time.sleep(3)
        except Exception as e:
            print(f"Request {i+1}: Failed - {str(e)}")
            if "429" in str(e) or "RATE_LIMIT" in str(e) or "Quota exceeded" in str(e):
                print("⚠️  Rate limit hit! Waiting 10 seconds...")
                time.sleep(10)
    
    print("")
    print("✅ Rate limiting test completed!")
    return True


if __name__ == "__main__":
    print("=" * 50)
    print("   GEMINI API TEST SCRIPT")
    print("=" * 50)
    print("")
    
    # Test basic API
    success = test_gemini_api()
    
    if success:
        print("")
        print("=" * 50)
        response = input("Do you want to test rate limiting? (y/n): ")
        if response.lower() == 'y':
            print("")
            test_rate_limiting()
    
    print("")
    print("=" * 50)
    print("Test completed!")

