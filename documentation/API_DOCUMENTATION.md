# Aura Fashion - REST API Documentation

This document describes all API endpoints provided by the **Aura Fashion** backend server (`http://localhost:5000/api` or production base URL).

---

## Authentication & Headers

| Header | Description |
|---|---|
| `Content-Type: application/json` | Required for all JSON POST/PUT requests |
| `Authorization: Bearer <token>` | Customer JWT or Admin JWT |

> [!IMPORTANT]
> Admin sessions use separate JWT tokens signed with role `admin`. Customer sessions use tokens signed with role `customer`. The frontends store them under distinct keys: `aura_admin_token` and `aura_customer_token`.

---

## 1. System Health

### `GET /api/health`
Returns server status and verified shop ownership details.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "shop": "Aura Fashion",
  "owner": "Kainath",
  "location": "Bengaluru, Karnataka, India",
  "timestamp": "2026-11-06T15:45:00.000Z"
}
```

---

## 2. Store Settings (Dynamic Branding & Policies)

### `GET /api/settings`
Public endpoint returning the active store configuration, business hours, policies, delivery rules, and contact info.

**Response (200 OK):**
```json
{
  "success": true,
  "settings": {
    "shopName": "Aura Fashion",
    "ownerName": "Kainath",
    "shopAddress": "Bengaluru",
    "shopLocation": "Bengaluru, Karnataka, India",
    "contactNumber": "7022018850",
    "whatsappNumber": "7022018850",
    "email": "shoppe.aurafashion@gmail.com",
    "tagline": "Curated Elegance & Modern Clothing",
    "announcementText": "✨ Free express shipping on orders over ₹1,499 | New Season Live!",
    "deliveryCharge": 99,
    "freeDeliveryThreshold": 1499,
    "codAvailable": true,
    "primaryColor": "#832729",
    "accentColor": "#D4AF37",
    "returnPolicy": "Easy 7-day hassle-free returns...",
    "exchangePolicy": "Instant size and colour exchanges...",
    "refundPolicy": "Refunds are initiated within 48 hours...",
    "businessHours": "Mon - Sat: 10:00 AM - 8:30 PM | Sun: 11:00 AM - 7:00 PM"
  }
}
```

### `PUT /api/settings`
Updates store settings. **Requires Admin Authorization (`Bearer <admin_token>`)**. Supports `multipart/form-data` for logo uploads.

---

## 3. Customer Authentication

### `POST /api/auth/register`
Creates a new customer account.

**Request Body:**
```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "Password123",
  "phone": "9876543210"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "user": {
    "id": "673f8...",
    "name": "Priya Sharma",
    "email": "priya@example.com",
    "phone": "9876543210",
    "role": "customer",
    "addresses": []
  }
}
```

### `POST /api/auth/login`
Authenticates an existing customer.

**Request Body:**
```json
{
  "email": "priya@example.com",
  "password": "Password123"
}
```

### `GET /api/auth/me`
Fetches current customer profile and saved delivery addresses. **Requires Customer Authorization**.

### `PUT /api/auth/profile`
Updates customer profile name and phone. **Requires Customer Authorization**.

### `POST /api/auth/addresses`
Adds a delivery address to the customer's profile. **Requires Customer Authorization**.

### `DELETE /api/auth/addresses/:addressId`
Removes a saved address. **Requires Customer Authorization**.

### `POST /api/auth/wishlist/:productId`
Toggles wishlist state for the given product. **Requires Customer Authorization**.

---

## 4. Admin Authentication

### `POST /api/admin/auth/login`
Authenticates an administrator. Registration is not public.

**Request Body:**
```json
{
  "email": "admin@aurafashion.com",
  "password": "AuraAdmin@2026"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "admin": {
    "id": "673f...",
    "name": "Kainath (Aura Owner)",
    "email": "admin@aurafashion.com",
    "role": "superadmin"
  }
}
```

### `GET /api/admin/auth/me`
Returns current admin account info. **Requires Admin Authorization**.

---

## 5. Categories

### `GET /api/categories`
Returns full categories list and nested tree with subcategories.

**Query Parameters:**
- `includeInactive=true|false`

### `POST /api/categories`
Creates a new main category or subcategory. **Requires Admin Authorization**.
- Supports `multipart/form-data` with `image` file.

### `PUT /api/categories/:id`
Updates an existing category. **Requires Admin Authorization**.

### `DELETE /api/categories/:id`
Deletes category. Prevents deletion if subcategories exist. **Requires Admin Authorization**.

---

## 6. Products & Variant Inventory

### `GET /api/products`
Lists garments with multi-parameter filtering, search, and pagination.

**Query Parameters:**
- `keyword`: Text search against product title, description, brand, fabric, tags.
- `category`: Category ID.
- `subcategory`: Subcategory ID.
- `minPrice`: Minimum base/discount price.
- `maxPrice`: Maximum base/discount price.
- `size`: Size filter (e.g. `S`, `M`, `L`, `XL`, `XXL`, `32`).
- `color`: Color name filter (e.g. `Wine Red`, `Royal Navy`).
- `inStock=true`: Only garments with at least 1 variant having stock > 0.
- `sort`: `newest` | `popularity` | `price_asc` | `price_desc`.
- `page`: Page number (default: 1).
- `limit`: Products per page (default: 12).
- `featured=true` / `newArrivals=true` / `trending=true` / `bestSellers=true`.

### `GET /api/products/:idOrSlug`
Fetches garment by slug or ID with all populated variants, images, specifications, and related products.

### `POST /api/products`
Creates a garment with multiple images and variants matrix. **Requires Admin Authorization**.
- Supports `multipart/form-data` with up to 8 images (`images`).
- Accepts JSON array `variants` containing `{ size, color, colorCode, sku, stockQuantity, additionalPrice }`.

### `PUT /api/products/:id`
Updates product and images. **Requires Admin Authorization**.

### `DELETE /api/products/:id`
Permanently deletes product and all child variants. **Requires Admin Authorization**.

### `GET /api/variants/inventory`
Admin inventory grid view with search and stock indicators. **Requires Admin Authorization**.
- `keyword`: Search SKU, size, color.
- `lowStockOnly=true`: Stock <= 5.
- `outOfStockOnly=true`: Stock <= 0.

### `PUT /api/variants/:id/stock`
Adjusts variant stock quantity and logs an inventory transaction. **Requires Admin Authorization**.
```json
{
  "newStock": 20,
  "reason": "Studio restock shipment"
}
```

---

## 7. Guest Shopping & Customer Cart

### `POST /api/cart/guest/validate`
Public endpoint allowing guest customers to validate their local storage cart against current live prices and stock limits without requiring login.

**Request Body:**
```json
{
  "items": [
    { "variantId": "673f8e...", "quantity": 2 }
  ]
}
```

### `GET /api/cart`
Fetches authenticated customer's cart. **Requires Customer Authorization**.

### `POST /api/cart/items`
Adds an item to the authenticated customer's cart. **Requires Customer Authorization**.

### `PUT /api/cart/items/:itemId`
Updates quantity. **Requires Customer Authorization**.

### `DELETE /api/cart/items/:itemId`
Removes an item from cart. **Requires Customer Authorization**.

### `POST /api/cart/merge`
Called immediately upon customer login or registration. Merges local guest cart items into the customer's server cart without duplicates and bounded by stock. **Requires Customer Authorization**.

---

## 8. Orders & Payments

### `POST /api/orders`
Places an order with server-side price validation, stock decrement, and payment initialization. **Requires Customer Authorization**.

**Request Body:**
```json
{
  "items": [{ "variantId": "...", "quantity": 1 }],
  "shippingAddress": {
    "fullName": "Priya Sharma",
    "phone": "9876543210",
    "houseNo": "Flat 402",
    "street": "Indiranagar 100ft Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560038"
  },
  "paymentMethod": "COD", // or "RAZORPAY"
  "couponCode": "AURA10"
}
```

### `POST /api/orders/:id/verify-payment`
Verifies Razorpay cryptographic signature upon frontend payment completion. **Requires Customer Authorization**.

### `GET /api/orders/my-orders`
Returns orders belonging to the authenticated customer. **Requires Customer Authorization**.

### `GET /api/orders/:id`
Fetches order details and tracking timeline. **Accessible by customer who placed order or admin**.

### `GET /api/orders/:id/invoice`
Generates and streams a printable PDF Tax Invoice.

### `PUT /api/orders/:id/cancel`
Cancels an eligible pending order and restores stock to warehouse inventory. **Requires Customer Authorization**.

### `GET /api/orders/admin/all`
Admin list of all customer orders with filters and keyword search. **Requires Admin Authorization**.

### `PUT /api/orders/admin/:id/status`
Updates order lifecycle status (e.g. `PACKED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`). Broadcasts real-time update to customer and admin rooms via Socket.IO. **Requires Admin Authorization**.

---

## 9. Reports & Exports

### `GET /api/reports/dashboard-stats`
Returns aggregated business metrics, monthly sales, and recent orders. **Requires Admin Authorization**.

### `GET /api/reports/export/orders`
Downloads Microsoft Excel (.xlsx) spreadsheet of all customer orders. **Requires Admin Authorization**.

### `GET /api/reports/export/inventory`
Downloads Microsoft Excel (.xlsx) spreadsheet of variant-level inventory. **Requires Admin Authorization**.
