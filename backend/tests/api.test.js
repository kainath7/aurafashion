import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import app from '../src/app.js';
import User from '../src/models/User.js';
import Admin from '../src/models/Admin.js';
import Category from '../src/models/Category.js';
import Product from '../src/models/Product.js';
import ProductVariant from '../src/models/ProductVariant.js';
import StoreSettings from '../src/models/StoreSettings.js';
import Coupon from '../src/models/Coupon.js';

let mongoServer;
const request = supertest(app);

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Aura Fashion E-Commerce Backend Test Suite', () => {
  let customerToken = '';
  let adminToken = '';
  let customerId = '';
  let categoryId = '';
  let productId = '';
  let variantId = '';
  let orderId = '';

  test('1. System Health Check Endpoint', async () => {
    const res = await request.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.shop, 'Aura Fashion');
    assert.equal(res.body.owner, 'Kainath');
  });

  test('2. Store Settings Endpoint (Client Info Verification)', async () => {
    // Initial fetch creates default settings
    const res = await request.get('/api/settings');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.settings.shopName, 'Aura Fashion');
    assert.equal(res.body.settings.ownerName, 'Kainath');
    assert.equal(res.body.settings.contactNumber, '7022018850');
    assert.equal(res.body.settings.whatsappNumber, '7022018850');
    assert.equal(res.body.settings.email, 'shoppe.aurafashion@gmail.com');
  });

  test('3. Admin Authentication & Setup', async () => {
    // Create admin directly in database
    await Admin.create({
      name: 'Kainath (Owner)',
      email: 'admin@aurafashion.com',
      password: 'AuraAdmin@2026',
      role: 'superadmin'
    });

    const res = await request.post('/api/admin/auth/login').send({
      email: 'admin@aurafashion.com',
      password: 'AuraAdmin@2026'
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.admin.email, 'admin@aurafashion.com');
    adminToken = res.body.token;
  });

  test('4. Admin Category Creation', async () => {
    const res = await request
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: "Women's Wear",
        description: 'Luxury Festive & Daily Wear',
        displayOrder: 1
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.category.name, "Women's Wear");
    categoryId = res.body.category._id;
  });

  test('5. Admin Product & Variant Creation with True Matrix Stock', async () => {
    const res = await request
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Aura Royal Georgette Kurti',
        description: 'Exquisite festive georgette kurti handcrafted in Bengaluru.',
        category: categoryId,
        brand: 'Aura Fashion',
        fabric: 'Pure Georgette',
        basePrice: 2999,
        discountPrice: 2199,
        variants: [
          { size: 'M', color: 'Wine Red', colorCode: '#722F37', stockQuantity: 15 },
          { size: 'L', color: 'Wine Red', colorCode: '#722F37', stockQuantity: 8 },
          { size: 'XL', color: 'Wine Red', colorCode: '#722F37', stockQuantity: 4 }
        ]
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.product.name, 'Aura Royal Georgette Kurti');
    assert.equal(res.body.product.variants.length, 3);

    productId = res.body.product._id;
    const targetVariant = res.body.product.variants.find((v) => v.stockQuantity === 15) || res.body.product.variants[0];
    variantId = targetVariant._id;
  });

  test('5b. Dynamic Filters Metadata & Multi-attribute Search', async () => {
    // Test dynamic filter extraction from MongoDB
    const filterRes = await request.get('/api/products/filters');
    assert.equal(filterRes.status, 200);
    assert.equal(filterRes.body.success, true);
    assert.ok(Array.isArray(filterRes.body.filters.sizes));
    assert.ok(filterRes.body.filters.sizes.includes('M'));
    assert.ok(filterRes.body.filters.colors.some((c) => c.color === 'Wine Red'));
    assert.ok(filterRes.body.filters.brands.includes('Aura Fashion'));
    assert.ok(filterRes.body.filters.fabrics.includes('Pure Georgette'));
    assert.equal(filterRes.body.filters.priceRange.min, 2999);

    // Test product filtering by variant attributes
    const searchRes = await request.get('/api/products?size=M&color=Wine%20Red&brand=Aura%20Fashion');
    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.success, true);
    assert.equal(searchRes.body.products.length, 1);
    assert.equal(searchRes.body.products[0].name, 'Aura Royal Georgette Kurti');
  });

  test('6. Guest Shopping - Cart Validation without Authentication', async () => {
    const res = await request.post('/api/cart/guest/validate').send({
      items: [
        {
          variantId: variantId,
          quantity: 2
        }
      ]
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].quantity, 2);
    assert.equal(res.body.items[0].price, 2199);
    assert.equal(res.body.subtotal, 4398);
  });

  test('7. Customer Registration & Token Generation', async () => {
    const res = await request.post('/api/auth/register').send({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      password: 'SecurePassword123',
      phone: '9876543210'
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'priya@example.com');

    customerToken = res.body.token;
    customerId = res.body.user.id;
  });

  test('8. Guest Cart Migration / Merge upon Customer Login', async () => {
    const res = await request
      .post('/api/cart/merge')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        guestItems: [
          {
            variantId: variantId,
            quantity: 2
          }
        ]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.cart.items.length, 1);
    assert.equal(res.body.cart.items[0].quantity, 2);
  });

  test('9. Promotional Coupon Validation', async () => {
    await Coupon.create({
      code: 'AURA10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 1000,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const res = await request.post('/api/coupons/validate').send({
      code: 'AURA10',
      cartTotal: 4398
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.coupon.code, 'AURA10');
    assert.equal(res.body.coupon.discountAmount, 440);
  });

  test('10. Order Placement & Stock Locking (COD)', async () => {
    // Initial variant stock was 15
    const variantBefore = await ProductVariant.findById(variantId);
    assert.equal(variantBefore.stockQuantity, 15);

    const res = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [
          {
            variantId: variantId,
            quantity: 2
          }
        ],
        shippingAddress: {
          fullName: 'Priya Sharma',
          phone: '9876543210',
          houseNo: 'No 42, 4th Cross',
          street: 'Indiranagar 100ft Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038'
        },
        paymentMethod: 'COD',
        couponCode: 'AURA10'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.order.orderNumber.startsWith('AF-'));
    assert.equal(res.body.order.orderStatus, 'CONFIRMED');

    orderId = res.body.order._id;

    // Verify variant stock was locked and deducted from 15 to 13
    const variantAfter = await ProductVariant.findById(variantId);
    assert.equal(variantAfter.stockQuantity, 13);
  });

  test('11. Customer Get Order Details & Tracking', async () => {
    const res = await request
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.order.customerInfo.name, 'Priya Sharma');
  });

  test('12. PDF Tax Invoice Generation', async () => {
    const res = await request
      .get(`/api/orders/${orderId}/invoice`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.header['content-type'], 'application/pdf');
  });

  test('13. Admin Order Status Progression', async () => {
    const res = await request
      .put(`/api/orders/admin/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'SHIPPED',
        trackingNumber: 'BLUEDART-BLR-9876543',
        comment: 'Dispatched from Bengaluru Hub'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.order.orderStatus, 'SHIPPED');
    assert.equal(res.body.order.trackingNumber, 'BLUEDART-BLR-9876543');
  });

  test('14. Admin Dashboard Metrics Verification', async () => {
    const res = await request
      .get('/api/reports/dashboard-stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.stats.totalOrders, 1);
    assert.ok(res.body.stats.totalRevenue > 0);
  });
});
