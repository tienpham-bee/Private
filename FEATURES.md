# AI Marketing Agent — Tổng quan tính năng hệ thống

> Nền tảng tự động hoá marketing dùng AI: tạo nội dung, lập kế hoạch, duyệt, lên lịch và đăng bài đa nền tảng cho game mobile.

---

## Kiến trúc tổng quan

| Thành phần | Công nghệ |
|---|---|
| Backend API | Python 3.12 + FastAPI + SQLAlchemy async |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + Celery |
| File Storage | MinIO (S3-compatible) |
| AI Text | Claude (claude-sonnet-4-6 / claude-opus-4-6) |
| AI Image | Google Gemini / Imagen |
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Container | Docker Compose |

---

## 1. Quản lý Brand (Thương hiệu game)

- Tạo profile brand: tên game, tone of voice, đối tượng mục tiêu
- Lưu brand guidelines, hashtag mặc định, bài mẫu tham khảo
- Cấu hình system prompt tùy chỉnh để điều chỉnh style AI
- Liên kết nhiều campaign và tài khoản mạng xã hội cho từng brand

---

## 2. Quản lý Campaign (Chiến dịch)

- Tạo chiến dịch với: thương hiệu, mục tiêu, thông điệp chính, điểm nổi bật sản phẩm
- Chọn nền tảng mục tiêu: Facebook, Instagram, Threads, TikTok, **Google App Campaigns**
- Cấu hình tần suất đăng bài theo từng nền tảng
- Thiết lập A/B testing (số lượng biến thể mỗi bài)
- Thêm hướng dẫn đặc biệt cho AI (ví dụ: "thiên về tăng lượt tải, không quan trọng giáo dục")
- Theo dõi trạng thái: Draft → Active → Paused → Completed
- Xem tiến độ: số bài đã tạo / đã duyệt / đã lên lịch

---

## 3. Lập kế hoạch nội dung (AI Content Plan)

- AI tự động phân tích campaign brief và đề xuất kế hoạch nội dung đa giai đoạn
- Kế hoạch bao gồm: platform, content type, topic, mô tả, ngày gợi ý cho từng bài
- Nhóm bài theo phase (VD: "Giai đoạn ra mắt", "Giai đoạn duy trì")
- User xem xét, chỉnh sửa (thêm/xoá/sửa item), sau đó xác nhận kế hoạch
- Kế hoạch đã xác nhận sẽ trở thành danh sách việc cần tạo nội dung

---

## 4. Tạo nội dung AI (Interactive Generation)

### Các loại nội dung hỗ trợ
| Loại | Mô tả |
|---|---|
| Social Post | Bài đăng ngắn kèm hashtag |
| Video Script | Kịch bản theo cảnh (scene, voiceover, visual) |
| Image Ad | Ad copy: headline, subheadline, body, CTA |
| Caption | Chú thích ngắn cho ảnh/video |
| Google App Asset | 5 headlines (≤30 ký tự) + 5 descriptions (≤90 ký tự) + CTA |

### Luồng tạo nội dung
1. Chọn plan item → nhấn "Tạo nội dung"
2. AI sinh nội dung dựa trên brand profile + campaign brief
3. User đọc kết quả ngay trong giao diện (textarea có thể chỉnh sửa trực tiếp)
4. **Chat đa lượt với AI** để tinh chỉnh (ngắn hơn, thêm emoji, đổi CTA, nghiêm túc hơn...)
5. Lưu thay đổi thủ công hoặc Duyệt khi ưng ý
6. Tạo lại từ đầu nếu muốn hướng hoàn toàn khác

### Tính năng chỉnh sửa
- Textarea luôn editable (không cần bật chế độ edit)
- Badge "Chưa lưu" hiện khi có thay đổi chưa được lưu
- Nút "Lưu thay đổi" / "Hoàn tác" khi có thay đổi
- Lịch sử hội thoại với AI được lưu lại

---

## 5. Google App Campaign Asset Editor

Công cụ chuyên dụng cho Google App Campaigns:

- Soạn thảo 5 **Headlines** (≤ 30 ký tự mỗi cái)
- Soạn thảo 5 **Descriptions** (≤ 90 ký tự mỗi cái)
- Chọn **Call-to-Action**: DOWNLOAD, INSTALL, PLAY NOW, GET NOW, LEARN MORE, SIGN UP
- Đếm ký tự realtime với màu sắc cảnh báo (xanh → vàng → đỏ)
- Preview Google Search Ad trực tiếp trong giao diện
- Thanh validation: hiển thị X/5 headline hợp lệ, X/5 description hợp lệ
- Export CSV (định dạng Google Ads Bulk Upload, có BOM UTF-8)
- Export JSON

---

## 6. Tạo ảnh AI (Image Generation)

- Nhập prompt mô tả ảnh cần tạo (có gợi ý tự động từ nội dung đã tạo)
- Gọi Google Gemini / Imagen để tạo ảnh
- Xem ảnh ngay trong giao diện (panel rộng bên phải)
- Tải về ảnh hoặc mở full-screen
- Ảnh được lưu vào MinIO S3 và liên kết với content piece
- Gallery ảnh: xem toàn bộ ảnh đã tạo, lọc theo campaign

---

## 7. Template Engine (Banner Rendering)

- Tạo template banner với cấu trúc JSON (canvas, background, layers)
- Layer types: text, cta_button, image, rectangle, overlay, gradient
- Hỗ trợ font Noto Sans (đầy đủ dấu tiếng Việt)
- Auto-shrink text khi nội dung quá dài
- Render template + content params → ảnh PNG chất lượng cao
- Upload lên MinIO S3, lưu URL vào content piece
- Preview template với dữ liệu mẫu trước khi áp dụng
- Template mặc định:
  - `facebook_banner` — 1200×628
  - `instagram_story` — 1080×1920
  - `square_post` — 1080×1080

---

## 8. Quy trình duyệt nội dung (Approval Workflow)

```
PENDING_REVIEW → APPROVED → SCHEDULED → PUBLISHED
                ↘ REJECTED
                ↘ REVISION_REQUESTED (AI tạo lại với feedback)
```

- Xem hàng chờ duyệt (Approval Queue)
- **Duyệt**: chuyển sang APPROVED, sẵn sàng lên lịch
- **Từ chối**: kèm ghi chú phản hồi
- **Yêu cầu sửa**: AI tự động regenerate theo feedback
- **Sửa & Duyệt**: chỉnh sửa thủ công ngay và duyệt trong một bước
- Lưu lịch sử duyệt (ai duyệt, hành động, feedback)

---

## 9. Lên lịch đăng bài (Scheduling)

- Chọn ngày giờ đăng (datetime picker)
- Chọn tài khoản nền tảng cụ thể
- Múi giờ: Asia/Ho_Chi_Minh
- Xem lịch dạng calendar (7 ngày, theo giờ)
- Màu sắc theo nền tảng: Facebook xanh, Instagram hồng, TikTok xám
- Huỷ lịch (content quay lại APPROVED)
- Celery tự động đăng khi đến giờ (quét mỗi 60 giây)

---

## 10. Đăng bài tự động (Publishing)

- Publish ngay lập tức (manual trigger)
- Publish theo lịch (Celery beat task)
- Hỗ trợ nền tảng:
  - **Facebook** — Graph API
  - **Instagram** — Graph API
  - **Threads** — API
  - **TikTok** — Platform API
- Retry khi thất bại (tối đa 3 lần)
- Ghi log đầy đủ: thành công / thất bại / lý do lỗi
- Tự động refresh token sắp hết hạn (daily 3 AM)

---

## 11. Quản lý tài khoản nền tảng

- Kết nối tài khoản: Facebook, Instagram, Threads, TikTok, Google App Campaigns
- Lưu access token (per brand)
- Nhiều tài khoản trên cùng một nền tảng
- Xoá / ngắt kết nối tài khoản

---

## 12. Thư viện nội dung (Content Library)

- Xem toàn bộ content đã tạo với filter: campaign, nền tảng, trạng thái, loại nội dung
- Preview nội dung inline (bài post, kịch bản video, script JSON)
- Workflow duyệt trực tiếp từ danh sách
- Xem model AI đã dùng để tạo

---

## 13. Dashboard tổng quan

Thống kê realtime:
- Bài chờ duyệt
- Bài đã lên lịch
- Bài đã đăng
- Chiến dịch đang chạy
- Số brand
- Số tài khoản đã kết nối
- Tổng nội dung đã tạo
- Bài bị từ chối

Danh sách hàng chờ duyệt và chiến dịch đang active ngay trên dashboard.

---

## 14. Celery Background Tasks

| Task | Tần suất | Mô tả |
|---|---|---|
| `publish-due-content` | Mỗi 60 giây | Đăng các bài đã đến giờ |
| `collect-analytics` | Mỗi 6 giờ | Thu thập số liệu từ các nền tảng |
| `refresh-expiring-tokens` | Hàng ngày 3 AM | Làm mới access token sắp hết hạn |
| `render_content_image` | On-demand | Render banner PNG sau khi tạo IMAGE_AD |

---

## Luồng hoàn chỉnh (End-to-End)

```
1. Tạo Brand          → Khai báo thông tin game, tone, audience
2. Tạo Campaign       → Chọn brand, nền tảng, mục tiêu, brief
3. AI lên kế hoạch    → Đề xuất danh sách nội dung theo phase
4. Xác nhận kế hoạch  → Chỉnh sửa nếu cần, bấm xác nhận
5. Tạo từng bài       → AI sinh nội dung, chat để tinh chỉnh
6. Tạo ảnh            → AI tạo ảnh minh hoạ kèm theo
7. Duyệt nội dung     → Approve / Reject / Request revision
8. Lên lịch đăng      → Chọn giờ + tài khoản nền tảng
9. Tự động đăng       → Celery xử lý khi đến giờ
```

---

## Công nghệ AI

| Model | Dùng cho |
|---|---|
| `claude-sonnet-4-6` | Tạo social post, caption, image ad copy, lên kế hoạch |
| `claude-opus-4-6` | Video script (phức tạp hơn) |
| `gemini-flash / imagen` | Tạo ảnh |

---

*Cập nhật: Tháng 4/2026*
