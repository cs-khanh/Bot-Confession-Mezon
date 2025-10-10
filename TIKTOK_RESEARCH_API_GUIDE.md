# 🎓 TikTok Research API - Hướng Dẫn Apply Chi Tiết

## 🎯 Tại Sao Chọn Research API?

Research API cho phép query **trending videos từ toàn bộ TikTok**, không giới hạn ở videos của 1 user cụ thể.

**Use Cases:**
- ✅ Tìm video hot nhất trong ngày
- ✅ Phân tích xu hướng nội dung
- ✅ Research về social media trends
- ✅ Tạo content curation bot

**Lưu Ý:**
- ⚠️ Cần apply và được TikTok approve (1-7 ngày)
- ⚠️ Free tier: 100 requests/day
- ⚠️ Phải có use case nghiên cứu hợp lệ

---

## 📋 Yêu Cầu Trước Khi Apply

### 1. TikTok Developer Account
- [x] Đã đăng ký tại https://developers.tiktok.com
- [x] Đã verify email
- [x] Profile đầy đủ thông tin

### 2. Organization/Institution
TikTok ưu tiên:
- 🏫 **Academic institutions** (Trường đại học, viện nghiên cứu)
- 🏢 **Research organizations** (Công ty nghiên cứu thị trường)
- 📰 **News organizations** (Tòa soạn báo chí)
- 🎓 **Students** (Sinh viên làm luận văn/đồ án)

**Không bắt buộc** phải là tổ chức lớn, nhưng cần có:
- Website/profile credible
- Mục đích nghiên cứu rõ ràng
- Email từ domain chính thức (không dùng @gmail.com nếu có thể)

### 3. Research Proposal
Chuẩn bị sẵn:
- Mục tiêu nghiên cứu (Research objectives)
- Phương pháp (Methodology)
- Kết quả mong đợi (Expected outcomes)
- Thời gian nghiên cứu (Timeline)

---

## 🚀 Bước 1: Tạo TikTok Developer App

### 1.1. Đăng Nhập
Vào https://developers.tiktok.com và đăng nhập

### 1.2. Tạo App Mới
1. Click **"My Apps"** → **"Create an App"**
2. Điền thông tin:

```yaml
App Name: "TikTok Trend Research Bot"
# Hoặc tên khác phù hợp với use case của bạn

Category: "Tools & Utilities" hoặc "News & Information"
# Chọn category phù hợp nhất

Description:
"A research bot that analyzes trending TikTok content to understand 
social media trends and viral patterns. This tool helps researchers 
study content virality, engagement patterns, and trending topics 
across different categories."

# Mô tả cần:
# - Rõ ràng về mục đích nghiên cứu
# - Nhấn mạnh academic/research purpose
# - Không commercial (không bán data, không quảng cáo)
```

3. **App Icon:** Upload logo chuyên nghiệp (512x512px)
4. Click **"Create"**

---

## 🎓 Bước 2: Apply Research API Access

### 2.1. Vào App Dashboard
1. Chọn app vừa tạo
2. Tìm **"Products"** section
3. Click **"Research API"**

### 2.2. Click "Apply for Access"

Sẽ có form apply, điền chi tiết:

---

### 📝 **Section 1: Organization Information**

**Organization Name:**
```
[Tên trường/công ty/tổ chức của bạn]

Ví dụ:
- "Đại học Bách Khoa TPHCM"
- "Independent Researcher"
- "Social Media Research Lab"
```

**Organization Type:**
```
[ ] Academic Institution
[ ] Research Organization  
[ ] Government
[ ] Non-profit
[x] Other (if independent)

Chọn phù hợp với trường hợp của bạn
```

**Organization Website:**
```
https://your-organization.com

Nếu là cá nhân:
- GitHub profile: https://github.com/yourusername
- LinkedIn: https://linkedin.com/in/yourname
- Personal website/portfolio
```

**Official Email:**
```
name@organization.edu    # Tốt nhất
name@company.com         # OK
yourname@gmail.com       # Chấp nhận được nhưng kém tin cậy hơn
```

---

### 📝 **Section 2: Research Information**

**Research Title:**
```
"Analysis of Viral Content Patterns on TikTok for Social Media Trend Prediction"

Hoặc:
"Understanding User Engagement with Trending TikTok Videos"
"Content Virality Study Across Different Categories on TikTok"
"Automated Trending Content Curation for Community Platforms"
```

**Research Objectives:** (Quan trọng nhất!)

```markdown
Our research aims to:

1. **Analyze Content Virality Patterns**
   - Study which types of content become viral
   - Identify engagement patterns (likes, shares, comments)
   - Understand timing and frequency of viral content

2. **Trend Prediction & Analysis**
   - Track trending topics across categories
   - Predict emerging trends based on historical data
   - Analyze correlation between content features and virality

3. **Community Content Curation**
   - Automatically identify high-quality trending content
   - Curate relevant videos for community discussion
   - Provide timely updates on trending topics

4. **Academic/Research Contribution**
   - Publish findings in research papers/blog posts
   - Share insights with research community
   - Contribute to understanding of social media dynamics

**Non-Commercial Use:** This research is for academic/educational 
purposes only. Data will not be sold, monetized, or used for 
commercial advertising.
```

**Research Methodology:**

```markdown
**Data Collection:**
- Use TikTok Research API to query videos created within the last 24 hours
- Filter by engagement metrics (like_count, view_count, share_count)
- Collect video metadata (title, author, creation time, stats)
- Run queries every 2 hours to track trend evolution

**Data Analysis:**
- Calculate "hot score" based on engagement metrics
- Identify videos with abnormal engagement growth
- Categorize content by topic/category
- Track temporal patterns of viral content

**Data Storage:**
- Store only metadata (no video files)
- Retain data for 30 days for analysis
- Anonymize user information
- Comply with TikTok's Terms of Service

**Output:**
- Automated reports on trending content
- Visualizations of engagement patterns
- Community alerts for significant trends
- Research findings published publicly
```

**Expected Timeline:**
```
[ ] 1-3 months
[x] 3-6 months
[ ] 6-12 months
[ ] Over 1 year

Chọn 3-6 months hoặc longer để tăng credibility
```

**Expected Outcomes:**
```markdown
1. **Research Outputs:**
   - Weekly trend analysis reports
   - Dataset of viral content patterns
   - Predictive model for content virality
   - Research paper/blog posts on findings

2. **Community Benefits:**
   - Automated trending content alerts
   - Curated video collections for discussion
   - Educational insights about social media trends

3. **Data Privacy:**
   - All data handling complies with TikTok policies
   - User privacy protected (only public metadata)
   - No commercial exploitation of data
```

---

### 📝 **Section 3: Technical Information**

**API Usage Plan:**
```
Estimated requests per day: 24 requests
(12 crawls/day × 2 requests per crawl)

Data retention: 30 days
Videos per request: 100
Total videos analyzed per day: ~2,400
```

**Data Usage:**
```markdown
- Research and analysis only
- No sale or commercial redistribution
- Compliance with TikTok Terms of Service
- User privacy protected
- No personally identifiable information (PII) stored
```

**Security Measures:**
```markdown
- Secure database storage (PostgreSQL)
- Access token encrypted
- Data access logged and monitored
- Regular security audits
- Compliance with data protection regulations
```

---

### 📝 **Section 4: Supporting Documents** (Optional but Recommended)

Upload nếu có:
- ✅ Research proposal PDF
- ✅ Letter of support từ advisor/supervisor
- ✅ University/organization letterhead
- ✅ IRB approval (nếu có)
- ✅ Previous research publications

---

## ✅ Bước 3: Submit & Wait

### 3.1. Review Application
- Double-check tất cả thông tin
- Đảm bảo không có typo
- Verify email đã đúng

### 3.2. Submit
Click **"Submit Application"**

### 3.3. Wait for Response
- **Thời gian:** 1-7 ngày (thường 2-3 ngày)
- **Status:** Check trong app dashboard
- **Email:** TikTok sẽ gửi email thông báo

**Possible Outcomes:**
- ✅ **Approved:** Bạn có thể dùng Research API ngay!
- ⏳ **Under Review:** Có thể yêu cầu thêm thông tin
- ❌ **Rejected:** Đọc lý do và apply lại với improvements

---

## 🎯 Tips Để Tăng Tỷ Lệ Được Approve

### ✅ DO:
1. **Be Specific:** Mô tả rõ ràng, chi tiết research objectives
2. **Academic Focus:** Nhấn mạnh mục đích nghiên cứu/học thuật
3. **Non-Commercial:** Cam kết không dùng cho mục đích thương mại
4. **Data Privacy:** Nói rõ về bảo vệ privacy
5. **Professional Tone:** Viết formal, professional
6. **Credible Identity:** Dùng email official nếu có thể
7. **Clear Timeline:** Có timeline cụ thể, realistic
8. **Methodology:** Giải thích rõ how you'll use the data

### ❌ DON'T:
1. ❌ Vague descriptions ("I want to study TikTok")
2. ❌ Commercial purposes ("Build a viral marketing tool")
3. ❌ Privacy concerns ("Store all user data")
4. ❌ Unrealistic scope ("Analyze all TikTok videos")
5. ❌ @gmail.com email (nếu có option khác)
6. ❌ Typos, grammar errors
7. ❌ Copy-paste từ templates

---

## 🔄 Nếu Bị Reject

### Đọc Email Rejection
TikTok thường explain lý do. Common reasons:
- Use case không đủ rõ ràng
- Không đủ research credentials
- Concerns về data privacy/security
- Commercial intent detected

### Improve & Reapply
1. **Wait:** Chờ ít nhất 2 tuần trước khi apply lại
2. **Revise:** Sửa application based on feedback
3. **Add Documentation:** Thêm supporting documents
4. **Clarify:** Làm rõ hơn non-commercial intent
5. **Resubmit:** Apply lại với improved proposal

### Alternative Plan
Nếu nhiều lần bị reject:
1. **Display API:** Dùng thay thế (chỉ 1 user's videos)
2. **RSS Feeds:** Crawl từ news sites về TikTok trends
3. **Web Scraping:** (Not recommended - violates ToS)
4. **Partner:** Collaborate với ai đã có Research API access

---

## 📞 Bước 4: Sau Khi Được Approve

### 4.1. Get Client Credentials

Vào app dashboard:
```
Client Key: awbx37vxswqcvsf6
Client Secret: 1a2b3c4d5e6f7g8h9i0j
```

### 4.2. Generate Access Token

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
  "access_token": "act.example12345ExampleToken",
  "expires_in": 7200,
  "token_type": "Bearer"
}
```

### 4.3. Update .env.local

```bash
TIKTOK_ACCESS_TOKEN=act.example12345ExampleToken
TIKTOK_CHANNEL_ID=your_channel_id_here
```

### 4.4. Restart Bot

```bash
cd /home/adminphuc/Trong/mezon-bot-template
pkill -9 -f "nest start"
yarn start:dev > /tmp/bot.log 2>&1 &
```

### 4.5. Test

```
!tiktok crawl
```

Expected:
```
🎵 TikTok Crawl Hoàn Tất!
✅ Đã crawl: 15 video mới
```

---

## 📊 Rate Limits & Best Practices

### Free Tier Limits
- **100 requests/day**
- **Reset:** Mỗi ngày lúc 00:00 UTC
- **Max videos per request:** 100

### Our Bot's Usage
```
Crawls per day: 12 (every 2 hours)
Requests per crawl: 1
Total: 12 requests/day

✅ Well within limit (88 requests spare)
```

### Monitor Usage
```bash
# Check logs
tail -100 /tmp/bot.log | grep "TikTok crawl completed"

# Check database
sudo docker exec -i mezon-bot-template-postgres-1 psql -U postgres -d mezon_bot -c "SELECT COUNT(*) FROM tiktok_videos WHERE DATE(\"createdAt\") = CURRENT_DATE;"
```

### If Hit Rate Limit
```bash
# Error: "rate limit exceeded"

Solutions:
1. Giảm frequency (crawl mỗi 4 giờ thay vì 2 giờ)
2. Upgrade to paid tier
3. Request quota increase từ TikTok
```

---

## 🎓 Example: Strong Research Proposal

```markdown
RESEARCH TITLE:
"Analyzing Viral Mechanics: A Study of Content Engagement Patterns 
on TikTok for Predictive Trend Analysis"

BACKGROUND:
Understanding what makes content go viral on social media platforms 
is crucial for researchers studying digital communication, content 
creators, and platform designers. TikTok's unique algorithm and 
content format provide an ideal case study for viral mechanics.

RESEARCH QUESTIONS:
1. What content characteristics correlate with high engagement?
2. Can we predict viral potential based on early engagement signals?
3. How do trending topics evolve throughout the day?
4. What role does timing play in content virality?

METHODOLOGY:
- Automated data collection via TikTok Research API
- Query videos created in last 24 hours every 2 hours
- Collect metadata: views, likes, shares, comments, creation time
- Calculate engagement rates and growth patterns
- Statistical analysis using Python/R
- Machine learning models for trend prediction

EXPECTED OUTCOMES:
- Dataset of 50,000+ videos over 6 months
- Predictive model for content virality (70%+ accuracy goal)
- Research paper submitted to social media research journal
- Open-source trend analysis tool for researchers
- Community education through trend reports

ETHICAL CONSIDERATIONS:
- Only public data collected (no private accounts)
- User anonymization (no PII stored)
- Compliance with TikTok Terms of Service
- IRB approval obtained (if applicable)
- No commercial exploitation

TIMELINE:
Month 1-2: Setup & initial data collection
Month 3-4: Data analysis & model development
Month 5-6: Validation & paper writing
Month 6+: Publication & community sharing
```

---

## 🆘 FAQ

### Q: Tôi là sinh viên, có được approve không?
**A:** Có! Nhiều sinh viên được approve. Tips:
- Dùng email trường (@university.edu)
- Mention đây là đồ án/luận văn
- Có letter từ advisor/giáo viên hướng dẫn

### Q: Tôi là cá nhân, không thuộc tổ chức nào?
**A:** Vẫn được! Nhưng cần:
- Research proposal mạnh
- Credible online presence (GitHub, LinkedIn)
- Clear non-commercial intent
- Professional communication

### Q: Mất bao lâu để được approve?
**A:** 1-7 ngày. Trung bình 2-3 ngày.

### Q: Nếu bị reject có apply lại được không?
**A:** Có, nhưng chờ 2+ tuần và improve proposal.

### Q: Token hết hạn sau bao lâu?
**A:** Client credentials token: 2 hours. Cần refresh hoặc generate lại.

### Q: 100 requests/day có đủ không?
**A:** Đủ! Bot chỉ dùng ~12-24 requests/day.

### Q: Có thể tăng quota không?
**A:** Có, contact TikTok support sau khi dùng 1-2 tháng.

---

## 📚 Resources

- [TikTok Research API Docs](https://developers.tiktok.com/doc/research-api-specs-query-videos)
- [Research API FAQ](https://developers.tiktok.com/doc/research-api-faq)
- [TikTok Terms of Service](https://www.tiktok.com/legal/terms-of-service)
- [Developer Guidelines](https://developers.tiktok.com/doc/developer-guidelines)

---

## ✅ Checklist

Trước khi submit:
- [ ] TikTok Developer account đã verify
- [ ] App đã tạo với name/description rõ ràng
- [ ] Research objectives viết đầy đủ, chi tiết
- [ ] Methodology explain rõ cách dùng data
- [ ] Non-commercial intent rõ ràng
- [ ] Data privacy/security được mention
- [ ] Expected outcomes realistic
- [ ] Timeline hợp lý (3-6+ months)
- [ ] Email official nếu có thể
- [ ] Supporting documents prepared (optional)
- [ ] Review lại toàn bộ application
- [ ] No typos/grammar errors

Good luck! 🍀

Sau khi được approve, quay lại `TIKTOK_SETUP.md` để tiếp tục setup bot.

