# VKU Field Survey PWA - Offline-First Campus Inspection App

[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-brightgreen)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare_Pages-orange)](https://pages.cloudflare.com)
[![Capacitor Ready](https://img.shields.io/badge/Capacitor-Android%20APK-blue)](https://capacitorjs.com)

**Mini-Project 1 - VKU Field Survey PWA** là ứng dụng Web Progressive (PWA) thiết kế theo cơ chế **Offline-First** phục vụ khảo sát, kiểm tra và đánh giá cơ sở vật chất (hạ tầng, phòng máy tính, điều hòa, hệ thống điện, Wi-Fi, PCCC, vệ sinh) tại các tòa nhà khuôn viên Trường Đại học CNTT & TT Việt - Hàn (VKU). 

Ứng dụng hoạt động hoàn hảo ngay cả khi thiết bị **hoàn toàn không có kết nối mạng (zero network connectivity)**.

---

## 🌟 Tính năng Nổi bật

1. **Chạy Hoàn Toàn Offline (Zero Network Connectivity)**:
   - **Service Worker (`sw.js`)**: Caching toàn bộ App Shell (HTML, CSS, JS, Icon) với chiến lược **Cache-First**. Khởi động lại ứng dụng tức thì (< 1s) mà không cần internet.
   - **IndexedDB Storage (`VKUSurveyDB`)**: Lưu trữ không giới hạn các bản ghi khảo sát, hình ảnh minh chứng (Base64/Blob), thông tin vị trí và tọa độ GPS trên bộ nhớ máy.

2. **Giao diện Khảo sát Hiện đại & Tương thích Di động (Responsive & Touch-First)**:
   - **Bảng điều khiển (Dashboard)**: Thống kê số lượng khảo sát theo tình trạng (Hoạt động tốt 🟢, Cần bảo trì 🟡, Hỏng hóc 🔴, Nguy hiểm 🚨).
   - **Bộ lọc & Tìm kiếm**: Lọc dữ liệu khảo sát theo Tòa nhà VKU (Khu A, Khu B, Khu C, Khu E, Ký túc xá, Thư viện, Nhà thi đấu), theo tình trạng hoặc tìm kiếm tự do.
   - **Biểu mẫu Khảo sát**: Cho phép chọn nhanh thông tin tòa nhà, phòng học, hạng mục thiết bị, mức độ sự cố, đính kèm ảnh chụp camera và định vị GPS tự động.

3. **Đồng bộ Tự động (Background Sync API) & Xuất Dữ liệu Offline**:
   - **Tự động nhận diện mạng**: Huy hiệu Online 🟢 / Offline 🔴 cập nhật thời gian thực.
   - **Hàng chờ Đồng bộ (Offline Queue)**: Lưu các bản ghi chưa gửi. Tự động đồng bộ lên máy chủ ngay khi thiết bị có mạng trở lại.
   - **Xuất dữ liệu linh hoạt**: Cho phép xuất dữ liệu khảo sát ra file **CSV (mở trực tiếp bằng Excel)** và **JSON (sao lưu)** để phục vụ báo cáo khi làm việc tại khu vực không có sóng mạng.

4. **Sẵn sàng Đóng gói thành App Android Native (Capacitor Bridge)**:
   - Cấu trúc thư mục chuẩn PWA (`manifest.json` standalone, PWA icons, `capacitor.config.json`) sẵn sàng đóng gói thành file **APK Android Native** chỉ với 1 câu lệnh.

---

## 📁 Cấu trúc Dự án (Project Structure)

```text
Form/
├── index.html              # Giao diện chính Single Page Application (SPA)
├── style.css               # Hệ thống CSS VKU Theme, Responsive & Component Layout
├── app.js                  # Engine chính: IndexedDB, Form, GPS, Sync & Export logic
├── sw.js                   # Service Worker: Caching strategies & Background Sync
├── manifest.json           # PWA Manifest (Standalone display, Theme colors, Icons)
├── icon-192.png            # Icon PWA 192x192
├── icon-512.png            # Icon PWA 512x512
├── package.json            # NPM Scripts & Capacitor setup
├── vercel.json             # Cấu hình Deploy tự động Vercel
├── capacitor.config.json   # Cấu hình đóng gói Capacitor Android Bridge
├── TECHNICAL_REPORT.md     # Báo cáo kỹ thuật chi tiết (2-4 trang PDF ready)
└── README.md               # Hướng dẫn dự án
```

---

## 🚀 Hướng dẫn Cài đặt & Chạy cục bộ (Local Setup)

### Cách 1: Chạy trực tiếp (Không cần Node.js)
1. Mở thư mục dự án và khởi chạy bằng phần mềm web server bất kỳ (hoặc Live Server extension trong VS Code).
2. Mở trình duyệt web theo địa chỉ: `http://localhost:5500/` hoặc `http://127.0.0.1:8080/`.

### Cách 2: Chạy qua Node.js CLI
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy Local Web Server
npm start
```

---

## ☁️ Hướng dẫn Deploy Live HTTPS (Vercel / Cloudflare Pages)

### 1. Deploy lên Vercel (Khuyên dùng)
1. Đẩy toàn bộ mã nguồn dự án lên một **Public GitHub Repository**.
2. Truy cập [Vercel Dashboard](https://vercel.com) -> Chọn **Add New Project**.
3. Nhập URL GitHub repository của bạn.
4. Chọn **Framework Preset: Other** -> Bấm **Deploy**.
5. Vercel sẽ tự động cấp phát URL HTTPS live cho dự án.

### 2. Deploy lên Cloudflare Pages
1. Truy cập [Cloudflare Dashboard](https://dash.cloudflare.com) -> Vào **Workers & Pages**.
2. Chọn **Create Application** -> **Pages** -> **Connect to Git**.
3. Chọn Repository dự án VKU Field Survey PWA.
4. Thiết lập **Build output directory**: `/` (hoặc để trống nếu code ở thư mục gốc).
5. Bấm **Save and Deploy**.

---

## 📱 Hướng dẫn Đóng gói thành App Android (Capacitor Bridge)

Dự án đã được cấu hình sẵn sàng với **Capacitor Bridge**. Bạn có thể đóng gói ứng dụng PWA này thành file **Android APK** như sau:

```bash
# 1. Khởi tạo Android platform cho dự án
npx cap add android

# 2. Đồng bộ mã nguồn PWA vào Android Native Studio Project
npx cap sync

# 3. Mở dự án trong Android Studio để Build file APK / App Bundle
npx cap open android
```

---

## 📄 Báo cáo Kỹ thuật (Technical Report)
File báo cáo kỹ thuật chi tiết đã được chuẩn bị sẵn tại **[TECHNICAL_REPORT.md](TECHNICAL_REPORT.md)**. Bạn có thể mở file này trong VS Code và xuất thành file **PDF (2-4 trang)** để nộp theo yêu cầu bài tập.

---

## 👨‍💻 Tác giả & Bản quyền
- **Đồ án**: Mini-Project 1 - VKU Field Survey PWA
- **Trường**: Đại học CNTT & TT Việt - Hàn (VKU)
- **Giấy phép**: MIT License
