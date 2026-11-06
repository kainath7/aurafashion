# Aura Fashion - Setup & Deployment Guide

This guide walks through local installation, database seeding, initial administrator setup, and production deployment on **Vercel** and **Render** with **MongoDB Atlas**.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or later (v20+ / v24 recommended)
- **npm**: v9.0.0 or later
- **MongoDB Atlas** account (or local MongoDB community server)
- **Cloudinary** account (for persistent cloud photography storage)
- **Razorpay** account (in Test Mode or Live Mode)

---

## 2. Local Development Setup

### Step A: Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your MongoDB URI:
   ```ini
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/aura_fashion?retryWrites=true&w=majority
   JWT_SECRET=aura_fashion_super_secret_jwt_key_2026_secure
   RAZORPAY_KEY_ID=rzp_test_AURAFASHION123
   RAZORPAY_KEY_SECRET=aura_test_secret_key_placeholder
   CLOUDINARY_CLOUD_NAME=aura-fashion
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   CLIENT_URL=http://localhost:5173
   ADMIN_URL=http://localhost:5174
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Seed database with initial Aura Fashion store settings, categories, and apparel:
   ```bash
   npm run seed
   ```

6. Start backend development server:
   ```bash
   npm run dev
   # or npm start
   ```

---

### Step B: Customer Frontend Setup

1. Open a new terminal and navigate to `customer-frontend`:
   ```bash
   cd customer-frontend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Values:
   ```ini
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   VITE_RAZORPAY_KEY_ID=rzp_test_AURAFASHION123
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start customer website:
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:5173`.

---

### Step C: Admin Frontend Setup

1. Open a new terminal and navigate to `admin-frontend`:
   ```bash
   cd admin-frontend
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Values:
   ```ini
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start executive administrative dashboard:
   ```bash
   npm run dev -- --port 5174
   ```
   Runs on `http://localhost:5174`.

---

## 3. Initial Administrative Credentials

Upon running `npm run seed`:
- **Portal URL**: `http://localhost:5174/login`
- **Email**: `admin@aurafashion.com`
- **Password**: `AuraAdmin@2026`

Customer Demo Account:
- **Email**: `customer@aurafashion.com`
- **Password**: `Customer@2026`

---

## 4. Production Deployment Guide

### A. Database: MongoDB Atlas
1. Create a free M0 cluster or dedicated cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Under **Network Access**, add IP address `0.0.0.0/0` (Allow Access from Anywhere) or your hosting provider's IPs.
3. Under **Database Access**, create a user with read/write privileges.
4. Copy your connection string (e.g. `mongodb+srv://user:pass@cluster0.mongodb.net/aura_fashion`).

### B. Backend API: Render / Railway
1. Push this repository to GitHub or GitLab.
2. In [Render](https://render.com), click **New +** &rarr; **Web Service**.
3. Choose the repository and set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGO_URI`: Your MongoDB Atlas URI
   - `JWT_SECRET`: A 64-character random secure secret
   - `RAZORPAY_KEY_ID`: Live or Test Razorpay Key ID
   - `RAZORPAY_KEY_SECRET`: Razorpay Key Secret
   - `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Cloudinary API secret
   - `CLIENT_URL`: `https://aura-fashion.vercel.app` (your customer frontend domain)
   - `ADMIN_URL`: `https://aura-fashion-admin.vercel.app` (your admin frontend domain)
   - `EMAIL_HOST`: `smtp-relay.brevo.com` (or your SMTP provider host)
   - `EMAIL_PORT`: `587`
   - `EMAIL_USER`: Your SMTP login identifier
   - `EMAIL_PASS`: Your SMTP master API key or App Password
   - `EMAIL_FROM`: `Aura Fashion <shoppe.aurafashion@gmail.com>`
   - `ADMIN_EMAIL`: `shoppe.aurafashion@gmail.com`
5. Deploy the service. Copy the resulting URL (e.g. `https://aura-fashion-api.onrender.com`).

### C. Customer Frontend: Vercel
1. In [Vercel](https://vercel.com), click **Add New** &rarr; **Project**.
2. Select your repository.
3. In **Root Directory**, click Edit and select `customer-frontend`.
4. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://aura-fashion-api.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://aura-fashion-api.onrender.com`
   - `VITE_RAZORPAY_KEY_ID`: `rzp_live_...` or test key
5. Deploy.

### D. Admin Frontend: Vercel (Separate Deployment)
1. In Vercel, click **Add New** &rarr; **Project** again for the same repository.
2. In **Root Directory**, click Edit and select `admin-frontend`.
3. In **Environment Variables**, add:
   - `VITE_API_URL`: `https://aura-fashion-api.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://aura-fashion-api.onrender.com`
4. Deploy.

---

## 5. Email Notification & Password Recovery System

Aura Fashion includes a production-ready, non-blocking email notification system built on Nodemailer and Brevo SMTP:

### A. Environment Configuration
Add to `backend/.env`:
```ini
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_brevo_smtp_user
EMAIL_PASS=your_brevo_smtp_master_key
EMAIL_FROM="Aura Fashion <shoppe.aurafashion@gmail.com>"
ADMIN_EMAIL=shoppe.aurafashion@gmail.com
```

### B. Customer Lifecycle Notifications
- **Order Placed**: Immediate confirmation with order ID, items breakdown, pricing, and delivery address.
- **Payment Captured**: Razorpay payment reference, method, and transaction timestamp.
- **Status Progression**: Dispatched, Shipped (with carrier and live tracking URL), Out for Delivery, Delivered.
- **Cancellation & Refunds**: Automatic notifications with reason and estimated refund turnaround.

### C. Store Administrator Alerts
- **New Order Alert**: Immediate notification dispatched to `ADMIN_EMAIL` upon customer order placement.
- **Low Stock Warnings**: Triggered whenever any SKU/variant drops to &le; 5 units remaining in inventory.
- **Order Cancellations**: Instant heads-up when a customer cancels an existing order.

### D. Password Recovery Security
- **Endpoints**: `POST /api/auth/forgot-password` and `PUT /api/auth/reset-password/:token`.
- **Anti-Enumeration**: Both existing and non-existent email requests return the identical neutral success message.
- **Cryptographic Tokens**: Raw 32-byte tokens generated via `crypto.randomBytes(32)` are transmitted only via email; database stores SHA-256 hashed digest with a 20-minute validity window.
- **Single-Use Enforcement**: Tokens are permanently purged from the database immediately upon successful password change.

---

## 6. GPS & Manual Delivery Address Selection

Aura Fashion features a hybrid address selection experience:

### A. Geolocation & Reverse Geocoding
- **Endpoint**: `GET /api/geocode/reverse?lat=...&lng=...`
- **Reverse Geocoder**: Integrates OpenStreetMap Nominatim with User-Agent compliance, query caching (~11m resolution), and BigDataCloud fallback.
- **Auto-Population**: Populates building/flat, street, area/suburb, city, state, and PIN code.
- **Fail-Safe**: Clear error messages on browser permission denial, timeout, or location unavailability, allowing instant manual fallback.

### B. Interactive Map Pinpoint
- **Map Engine**: Leaflet with responsive OpenStreetMap tiles (`DeliveryLocationMap.tsx`).
- **Draggable Marker**: Customers can drag the pin marker or tap anywhere on the map to pinpoint their exact doorstep or building entrance.
- **Two-Way Sync**: Moving the map marker triggers debounced reverse geocoding to update the street and locality fields while preserving the customer's typed name, phone, and building numbers.

### C. Manual Entry & Data Integrity
- Customers can edit every address field freely at all times. GPS is never mandatory.
- MongoDB records the confirmed delivery address, latitude, longitude, area, landmark, and source (`GPS`, `MAP_PICKER`, or `MANUAL`).
- Coordinates and live Google Maps navigation links appear on Customer Order Details, Admin Order Management, PDF Tax Invoices, and lifecycle emails.

---

## 7. Verification Checklist

- [x] Backend tests pass (`node --test tests/api.test.js` in `backend/` - 21/21 tests passing).
- [x] Customer Frontend builds cleanly (`npm run build` in `customer-frontend/`).
- [x] Admin Frontend builds cleanly (`npm run build` in `admin-frontend/`).
- [x] Guest shopping preserves items and merges seamlessly upon login.
- [x] Variant-level inventory updates decrement stock on order creation.
- [x] Printable PDF Tax Invoices render with shop name, Kainath, Bengaluru, and contact info.
- [x] Brevo SMTP connection verified and test emails deliverable via Admin Dashboard.
- [x] Password recovery workflow end-to-end verified with SHA-256 cryptographic tokens.
- [x] GPS detection, Leaflet interactive map, reverse geocoding, and manual entry verified.
