# Aura Fashion &bull; E-Commerce Platform

A production-ready, bespoke clothing e-commerce system built for **Aura Fashion** (Proprietor: **Kainath**, Bengaluru, Karnataka, India).

---

## 🌟 Client & Shop Identity

- **Shop Name**: Aura Fashion
- **Proprietor**: Kainath
- **Studio Address**: Bengaluru
- **Location**: Bengaluru, Karnataka, India
- **Phone / WhatsApp**: +91 7022018850
- **Email**: [shoppe.aurafashion@gmail.com](mailto:shoppe.aurafashion@gmail.com)

---

## 📁 Repository Structure

```
aurafashion/
├── backend/                  # Node.js + Express.js + Mongoose REST API & Socket.IO server
│   ├── src/
│   │   ├── config/           # Database, Cloudinary & Razorpay configurations
│   │   ├── controllers/      # Business logic (Products, Variants, Orders, Cart, Auth, Settings)
│   │   ├── middleware/       # JWT auth (customer vs admin), upload, rate limiter, error handler
│   │   ├── models/           # Mongoose schemas (Products, Variants, Categories, Orders, etc.)
│   │   ├── routes/           # REST API route declarations
│   │   ├── seeds/            # Database seed script with Aura Fashion catalog & Kainath details
│   │   └── sockets/          # Socket.IO real-time channels
│   └── tests/                # Automated Node.js integration test suite (14 / 14 tests pass)
├── customer-frontend/        # Luxury fashion storefront (React + TS + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/       # Navbar, Footer, CartDrawer, FloatingWhatsApp, ProductCard, OrderTracker
│   │   ├── context/          # AuthContext, CartContext (Guest Shopping + Server Merge), StoreSettings
│   │   ├── pages/            # Home, Shop, ProductDetail, Cart, Checkout, OrderSuccess, Tracking, Policies
│   │   ├── services/         # Axios API client (`aura_customer_token`)
│   │   └── types/            # TypeScript domain models
├── admin-frontend/           # Standalone administrative console (React + TS + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/       # AdminLayout, StatCard
│   │   ├── context/          # AdminAuthContext (`aura_admin_token`)
│   │   ├── pages/            # Dashboard, Products, Inventory Matrix, Categories, Orders, Customers, Reports
│   │   └── services/         # Admin API client
└── documentation/            # Architectural and deployment specifications
    ├── API_DOCUMENTATION.md  # Comprehensive REST API reference
    ├── ARCHITECTURE.md       # Sequence diagrams, Socket.IO channels & design
    ├── DATABASE_SCHEMA.md    # MongoDB collections, indexes, and virtuals
    ├── SETUP_AND_DEPLOYMENT.md# Local setup and Vercel + Render + Atlas deployment
    └── TESTING_REPORT.md     # 100% passing test report & verification matrix
```

---

## 🚀 Quick Start Instructions

### 1. Backend Server
```bash
cd backend
npm install
npm run seed       # Populates Kainath Aura Fashion details, garments, and admin account
npm start          # Runs on http://localhost:5000
```
Run automated test suite:
```bash
npm test           # 14/14 automated integration tests pass
```

### 2. Customer Frontend
```bash
cd customer-frontend
npm install
npm run dev        # Runs on http://localhost:5173
```

### 3. Admin Frontend
```bash
cd admin-frontend
npm install
npm run dev        # Runs on http://localhost:5174
```

---

## 🔑 Default Credentials

- **Admin Portal**: `http://localhost:5174/login`
  - **Email**: `admin@aurafashion.com`
  - **Password**: `AuraAdmin@2026`
- **Customer Account**: `http://localhost:5173/login`
  - **Email**: `customer@aurafashion.com`
  - **Password**: `Customer@2026`

---

## ✨ Key Business & Technical Highlights

1. **Guest Shopping with Seamless Migration**:
   - Customers can freely explore, filter, view garments, pick size/colour combinations, and add items to their bag without logging in.
   - Bag items are persisted in `localStorage`. Upon proceeding to checkout, logging in or registering seamlessly merges the guest bag with the customer's server cart without duplicate entries or lost garments.
2. **True Variant-Level Stock Management**:
   - Every size and colour combination (e.g., Casual Shirt &bull; Wine Red &bull; Size M) holds its own dedicated stock quantity and unique SKU.
   - Stock is validated and locked upon order placement.
3. **Dynamic Store Settings**:
   - The shop owner (Kainath) can manage shop info, address in Bengaluru, WhatsApp number (+91 7022018850), delivery thresholds, and return policies directly from the admin panel without modifying code.
4. **Razorpay & Cash on Delivery (COD)**:
   - Full server-side order creation, HMAC-SHA256 signature verification, and support for UPI, Cards, and Net Banking.
5. **Real-Time Order & Logistics Tracking**:
   - Socket.IO broadcasts incoming orders to admin in real-time, and live status changes (Pending &rarr; Confirmed &rarr; Processing &rarr; Packed &rarr; Shipped &rarr; Out for Delivery &rarr; Delivered) to customer tracking screens.
6. **PDF Invoicing & Excel Reports**:
   - Generates downloadable tax invoices for every order and exports full order history and warehouse inventory to Excel spreadsheets.
