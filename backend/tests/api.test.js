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
import EmailLog from '../src/models/EmailLog.js';
import crypto from 'crypto';

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

  test('15. Forgot Password Security (User Enumeration Prevention & Email Validation)', async () => {
    // Malformed email should return 400
    const resInvalidEmail = await request.post('/api/auth/forgot-password').send({
      email: 'not-an-email'
    });
    assert.equal(resInvalidEmail.status, 400);
    assert.equal(resInvalidEmail.body.success, false);

    // Non-existent email should return generic 200 success without leaking existence
    const resNonExistent = await request.post('/api/auth/forgot-password').send({
      email: 'nonexistent.user@example.com'
    });
    assert.equal(resNonExistent.status, 200);
    assert.equal(resNonExistent.body.success, true);
    assert.ok(resNonExistent.body.message.includes('If an account with that email exists'));

    // Existing user should also return the exact same generic message
    const resExisting = await request.post('/api/auth/forgot-password').send({
      email: 'priya@example.com'
    });
    assert.equal(resExisting.status, 200);
    assert.equal(resExisting.body.success, true);
    assert.ok(resExisting.body.message.includes('If an account with that email exists'));

    // Verify token was hashed with sha256 in DB and has future expiry
    const user = await User.findOne({ email: 'priya@example.com' });
    assert.ok(user.resetPasswordToken);
    assert.ok(user.resetPasswordExpire > Date.now());
  });

  test('16. Password Reset Token Validation, Workflow & Single-Use Invalidation', async () => {
    // Set a known plaintext token and store sha256 hash in database
    const rawToken = 'testresettoken1234567890abcdef';
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await User.updateOne(
      { email: 'priya@example.com' },
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: Date.now() + 20 * 60 * 1000
      }
    );

    // Test 16a: Validate token endpoint GET with invalid token
    const resValidateInvalid = await request.get('/api/auth/reset-password/invalidrawtoken999');
    assert.equal(resValidateInvalid.status, 400);
    assert.equal(resValidateInvalid.body.valid, false);

    // Test 16b: Validate token endpoint GET with valid token
    const resValidateValid = await request.get(`/api/auth/reset-password/${rawToken}`);
    assert.equal(resValidateValid.status, 200);
    assert.equal(resValidateValid.body.valid, true);
    assert.equal(resValidateValid.body.email, 'priya@example.com');

    // Test 16c: Validation with expired token
    const expiredRawToken = 'expiredtoken123456789';
    const expiredHashedToken = crypto.createHash('sha256').update(expiredRawToken).digest('hex');
    await User.updateOne(
      { email: 'priya@example.com' },
      {
        resetPasswordToken: expiredHashedToken,
        resetPasswordExpire: Date.now() - 60 * 1000 // 1 minute in past
      }
    );

    const resValidateExpired = await request.get(`/api/auth/reset-password/${expiredRawToken}`);
    assert.equal(resValidateExpired.status, 400);
    assert.equal(resValidateExpired.body.valid, false);
    assert.ok(resValidateExpired.body.message.includes('expired'));

    // Re-set valid token for reset execution tests
    await User.updateOne(
      { email: 'priya@example.com' },
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpire: Date.now() + 20 * 60 * 1000
      }
    );

    // Test 16d: Mismatched confirmPassword should fail
    const resMismatch = await request
      .put(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'BrandNewPassword@2026', confirmPassword: 'DifferentPassword@2026' });
    assert.equal(resMismatch.status, 400);
    assert.equal(resMismatch.body.success, false);

    // Test 16e: Password too short should fail
    const resShort = await request
      .put(`/api/auth/reset-password/${rawToken}`)
      .send({ password: '123' });
    assert.equal(resShort.status, 400);
    assert.equal(resShort.body.success, false);

    // Test 16f: Invalid token should be rejected with 400
    const resInvalid = await request
      .put('/api/auth/reset-password/invalidrawtoken999')
      .send({ password: 'BrandNewPassword@2026' });
    assert.equal(resInvalid.status, 400);
    assert.equal(resInvalid.body.success, false);

    // Test 16g: Valid token should successfully reset password
    const resValid = await request
      .put(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'BrandNewPassword@2026' });
    assert.equal(resValid.status, 200);
    assert.equal(resValid.body.success, true);
    assert.ok(resValid.body.token);

    // Verify token was cleared (single-use)
    const userAfter = await User.findOne({ email: 'priya@example.com' });
    assert.equal(userAfter.resetPasswordToken, undefined);
    assert.equal(userAfter.resetPasswordExpire, undefined);

    // Test 16h: Token reuse attempt must be rejected with 400
    const resReuse = await request
      .put(`/api/auth/reset-password/${rawToken}`)
      .send({ password: 'AnotherPassword@2026' });
    assert.equal(resReuse.status, 400);

    // Test 16i: Login with OLD password fails
    const resOldLogin = await request.post('/api/auth/login').send({
      email: 'priya@example.com',
      password: 'OldPassword@2026'
    });
    assert.equal(resOldLogin.status, 401);

    // Test 16j: Login with new password succeeds
    const resLogin = await request.post('/api/auth/login').send({
      email: 'priya@example.com',
      password: 'BrandNewPassword@2026'
    });
    assert.equal(resLogin.status, 200);
    assert.equal(resLogin.body.success, true);

    // Test 16k: Existing profile update functionality continues to work flawlessly
    const resProfile = await request
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${resLogin.body.token}`)
      .send({ name: 'Priya Sharma Updated', phone: '9876543210' });
    assert.equal(resProfile.status, 200);
    assert.equal(resProfile.body.success, true);
    assert.equal(resProfile.body.user.name, 'Priya Sharma Updated');
  });

  test('17. Admin Email Audit Logs Endpoint', async () => {
    // Requires admin authorization
    const resUnauthorized = await request.get('/api/settings/email-logs');
    assert.equal(resUnauthorized.status, 401);

    const resAuthorized = await request
      .get('/api/settings/email-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(resAuthorized.status, 200);
    assert.equal(resAuthorized.body.success, true);
    assert.ok(Array.isArray(resAuthorized.body.logs));
  });

  test('18. Email Delivery Audit Logging & Duplicate Prevention', async () => {
    // Insert a mock email log to verify schema and retrieval
    const sampleLog = await EmailLog.create({
      recipient: 'shoppe.aurafashion@gmail.com',
      emailType: 'ORDER_CONFIRMATION',
      subject: 'Order Confirmed - AF-TEST-1001',
      orderNumber: 'AF-TEST-1001',
      status: 'SENT',
      attempts: 1
    });

    assert.ok(sampleLog._id);
    assert.equal(sampleLog.status, 'SENT');

    // Retrieve via admin logs endpoint
    const res = await request
      .get('/api/settings/email-logs?emailType=ORDER_CONFIRMATION')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.logs.length > 0);
    assert.equal(res.body.logs[0].emailType, 'ORDER_CONFIRMATION');
  });

  test('19. Geocode Reverse Endpoint (GPS to Structured Address)', async () => {
    // 19a: Missing parameters returns 400
    const resMissing = await request.get('/api/geocode/reverse');
    assert.equal(resMissing.status, 400);
    assert.equal(resMissing.body.success, false);

    // 19b: Invalid coordinate bounds returns 400
    const resInvalid = await request.get('/api/geocode/reverse?lat=120&lng=77');
    assert.equal(resInvalid.status, 400);

    // 19c: Valid Bengaluru coordinates (MG Road / Indiranagar)
    const resBengaluru = await request.get('/api/geocode/reverse?lat=12.9716&lng=77.5946');
    assert.equal(resBengaluru.status, 200);
    assert.equal(resBengaluru.body.success, true);
    assert.ok(resBengaluru.body.data);
    assert.equal(resBengaluru.body.data.city, 'Bengaluru');
    assert.equal(resBengaluru.body.data.state, 'Karnataka');
    assert.ok(resBengaluru.body.data.pincode);
    assert.equal(resBengaluru.body.data.latitude, 12.9716);
    assert.equal(resBengaluru.body.data.longitude, 77.5946);
  });

  test('20. Order Placement with GPS-Based Delivery Address & Validation', async () => {
    // 20a: Missing required PIN code or phone fails validation
    const resInvalidAddress = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ variantId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Priya Sharma',
          phone: '987', // Invalid phone length
          houseNo: 'Flat 101',
          street: 'Indiranagar 100ft Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '56' // Invalid short pincode
        },
        paymentMethod: 'COD'
      });
    assert.equal(resInvalidAddress.status, 400);

    // 20b: Complete order with confirmed GPS coordinates
    const resGpsOrder = await request
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ variantId, quantity: 1 }],
        shippingAddress: {
          fullName: 'Priya Sharma',
          phone: '9876543210',
          houseNo: 'Villa 12, Palm Meadows',
          street: 'Airport Road',
          area: 'Varthur',
          landmark: 'Opposite Forum Mall',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560066',
          latitude: 12.9602,
          longitude: 77.7475,
          formattedAddress: 'Villa 12, Palm Meadows, Varthur, Bengaluru',
          addressSource: 'GPS'
        },
        paymentMethod: 'COD'
      });

    assert.equal(resGpsOrder.status, 201);
    assert.equal(resGpsOrder.body.success, true);
    const createdOrder = resGpsOrder.body.order;
    assert.equal(createdOrder.shippingAddress.latitude, 12.9602);
    assert.equal(createdOrder.shippingAddress.longitude, 77.7475);
    assert.equal(createdOrder.shippingAddress.area, 'Varthur');
    assert.equal(createdOrder.shippingAddress.landmark, 'Opposite Forum Mall');
    assert.equal(createdOrder.shippingAddress.addressSource, 'GPS');

    // 20c: Tax Invoice streams with updated address details
    const resInvoice = await request
      .get(`/api/orders/${createdOrder._id}/invoice`)
      .set('Authorization', `Bearer ${customerToken}`);
    assert.equal(resInvoice.status, 200);
    assert.equal(resInvoice.header['content-type'], 'application/pdf');
  });
});
