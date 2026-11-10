import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import StoreSettings from '../models/StoreSettings.js';
import Banner from '../models/Banner.js';
import Coupon from '../models/Coupon.js';
import InventoryTransaction from '../models/InventoryTransaction.js';

export const ensureInitialData = async () => {
  try {
    // 1. Ensure Super Administrator exists with correct verified email
    const targetAdminEmail = (process.env.ADMIN_EMAIL || 'shoppe.aurafashion@gmail.com').toLowerCase();
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      console.log(`[Seed] Initializing Aura Fashion Super Administrator with ${targetAdminEmail}...`);
      await Admin.create({
        name: 'Kainath (Aura Owner)',
        email: targetAdminEmail,
        password: 'AuraAdmin@2026',
        role: 'superadmin',
        isActive: true
      });
      console.log(`✅ [Admin Ready] Email: ${targetAdminEmail} | Password: AuraAdmin@2026`);
    } else {
      // Migrate legacy seeded admin@aurafashion.com to targetAdminEmail if found
      const oldAdmin = await Admin.findOne({ email: 'admin@aurafashion.com' });
      if (oldAdmin) {
        const targetExists = await Admin.findOne({ email: targetAdminEmail });
        if (!targetExists) {
          oldAdmin.email = targetAdminEmail;
          await oldAdmin.save();
          console.log(`✅ [Admin Migration] Updated administrator email from admin@aurafashion.com to ${targetAdminEmail}`);
        }
      }
    }

    // 2. Ensure Store Settings exist
    const settingsCount = await StoreSettings.countDocuments();
    if (settingsCount === 0) {
      console.log('[Seed] Initializing Store Settings with client business profile...');
      await StoreSettings.create({
        shopName: 'Aura Fashion',
        ownerName: 'Kainath',
        shopAddress: 'Bengaluru',
        shopLocation: 'Bengaluru, Karnataka, India',
        contactNumber: '7022018850',
        whatsappNumber: '7022018850',
        email: 'shoppe.aurafashion@gmail.com',
        tagline: 'Curated Elegance & Modern Clothing',
        announcementText: '✨ Free express shipping across India on orders over ₹1,499 | New Season Live!',
        deliveryCharge: 99,
        freeDeliveryThreshold: 1499,
        codAvailable: true,
        codExtraCharge: 0,
        primaryColor: '#832729',
        accentColor: '#D4AF37',
        logoUrl: '/logo-dark.png',
        returnPolicy: 'Easy 7-day hassle-free returns from delivery date for unworn items with original tags intact.',
        exchangePolicy: 'Instant size and colour exchanges available within 7 days of delivery.',
        refundPolicy: 'Refunds are initiated within 48 hours of return verification to original payment method.',
        businessHours: 'Mon - Sat: 10:00 AM - 8:30 PM | Sun: 11:00 AM - 7:00 PM',
        socialLinks: {
          instagram: 'https://instagram.com/aurafashion',
          facebook: 'https://facebook.com/aurafashion',
          whatsapp: 'https://wa.me/917022018850'
        }
      });
    } else {
      await StoreSettings.updateMany(
        { $or: [{ logoUrl: { $exists: false } }, { logoUrl: null }, { logoUrl: '' }] },
        { $set: { logoUrl: '/logo-dark.png' } }
      );
    }

    // 3. Ensure Demo Customer exists
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        name: 'Priya Sharma',
        email: 'customer@aurafashion.com',
        password: 'Customer@2026',
        phone: '9876543210',
        addresses: [
          {
            fullName: 'Priya Sharma',
            phone: '9876543210',
            houseNo: 'Flat 402, Prestige Palms',
            street: 'Indiranagar 100ft Road',
            landmark: 'Near Metro Station',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560038',
            isDefault: true
          }
        ]
      });
      console.log('✅ [Customer Ready] Email: customer@aurafashion.com | Password: Customer@2026');
    }

    // 4. Ensure Categories exist
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('[Seed] Populating initial luxury categories and subcategories...');
      const catWomen = await Category.create({
        name: "Women's Wear",
        slug: 'womens-wear',
        description: 'Contemporary & ethnic apparel curated for modern women',
        displayOrder: 1,
        image: {
          url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
          public_id: ''
        }
      });

      const catMen = await Category.create({
        name: "Men's Wear",
        slug: 'mens-wear',
        description: 'Sophisticated casuals and formal wardrobe essentials',
        displayOrder: 2,
        image: {
          url: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=800&q=80',
          public_id: ''
        }
      });

      const catKids = await Category.create({
        name: 'Kids Wear',
        slug: 'kids-wear',
        description: 'Comfortable, playful and trendy outfits for boys and girls',
        displayOrder: 3,
        image: {
          url: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80',
          public_id: ''
        }
      });

      const catAcc = await Category.create({
        name: 'Accessories',
        slug: 'accessories',
        description: 'Luxury bags, handcrafted jewellery and finishing touches',
        displayOrder: 4,
        image: {
          url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
          public_id: ''
        }
      });

      const subKurtis = await Category.create({
        name: 'Kurtis & Tunics',
        slug: 'kurtis-tunics',
        parentCategory: catWomen._id,
        displayOrder: 1
      });

      const subDresses = await Category.create({
        name: 'Dresses & Co-Ords',
        slug: 'dresses-coords',
        parentCategory: catWomen._id,
        displayOrder: 2
      });

      const subMenShirts = await Category.create({
        name: 'Casual Shirts',
        slug: 'mens-casual-shirts',
        parentCategory: catMen._id,
        displayOrder: 1
      });

      // 5. Seed Initial Curated Products with true matrix variants
      const product1 = await Product.create({
        name: 'Aura Royal Georgette Anarkali Kurti',
        slug: 'aura-royal-georgette-anarkali-kurti',
        description:
          'Handcrafted in Bengaluru with pure flowing georgette and intricate zari embroidery. Features a flared silhouette with lightweight breathable lining.',
        shortDescription: 'Pure georgette embroidered Anarkali kurti in regal wine red.',
        category: catWomen._id,
        subcategory: subKurtis._id,
        brand: 'Aura Fashion',
        fabric: 'Pure Georgette',
        basePrice: 3499,
        discountPrice: 2499,
        isFeatured: true,
        isNewArrival: true,
        isTrending: true,
        isBestSeller: true,
        ratingsAverage: 4.9,
        ratingsQuantity: 38,
        specifications: [
          { key: 'Occasion', value: 'Festive & Wedding' },
          { key: 'Fit', value: 'Flared Anarkali' },
          { key: 'Pattern', value: 'Embroidered Zari' },
          { key: 'Collar', value: 'Round Neck' },
          { key: 'Gender', value: 'Women' }
        ],
        tags: ['kurti', 'georgette', 'anarkali', 'wine red', 'festive'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
            public_id: '',
            isPrimary: true,
            altText: 'Aura Royal Georgette Anarkali Kurti Front'
          },
          {
            url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
            public_id: '',
            isPrimary: false,
            altText: 'Aura Royal Georgette Detail'
          }
        ]
      });

      await ProductVariant.create([
        { product: product1._id, size: 'M', color: 'Wine Red', colorCode: '#832729', sku: 'AF-KURT-WR-M-101', stockQuantity: 15 },
        { product: product1._id, size: 'L', color: 'Wine Red', colorCode: '#832729', sku: 'AF-KURT-WR-L-102', stockQuantity: 12 },
        { product: product1._id, size: 'XL', color: 'Wine Red', colorCode: '#832729', sku: 'AF-KURT-WR-XL-103', stockQuantity: 8 },
        { product: product1._id, size: 'M', color: 'Navy Blue', colorCode: '#000080', sku: 'AF-KURT-NB-M-104', stockQuantity: 10 },
        { product: product1._id, size: 'L', color: 'Navy Blue', colorCode: '#000080', sku: 'AF-KURT-NB-L-105', stockQuantity: 6 }
      ]);

      const product2 = await Product.create({
        name: 'Aura Emerald Satin Midi Dress',
        slug: 'aura-emerald-satin-midi-dress',
        description:
          'Lustrous jewel-toned satin dress tailored to perfection with draped neckline and detachable waist sash.',
        shortDescription: 'Jewel-toned emerald satin dress for evening wear.',
        category: catWomen._id,
        subcategory: subDresses._id,
        brand: 'Aura Fashion',
        fabric: 'Heavy Satin',
        basePrice: 2899,
        discountPrice: 1999,
        isFeatured: true,
        isNewArrival: true,
        ratingsAverage: 4.8,
        ratingsQuantity: 24,
        specifications: [
          { key: 'Occasion', value: 'Evening Party' },
          { key: 'Fit', value: 'Slim Fit' },
          { key: 'Pattern', value: 'Solid' },
          { key: 'Collar', value: 'Cowl Neck' },
          { key: 'Gender', value: 'Women' }
        ],
        tags: ['dress', 'satin', 'emerald', 'party'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
            public_id: '',
            isPrimary: true,
            altText: 'Aura Emerald Satin Dress'
          }
        ]
      });

      await ProductVariant.create([
        { product: product2._id, size: 'S', color: 'Emerald Green', colorCode: '#046307', sku: 'AF-DRS-EG-S-201', stockQuantity: 10 },
        { product: product2._id, size: 'M', color: 'Emerald Green', colorCode: '#046307', sku: 'AF-DRS-EG-M-202', stockQuantity: 14 },
        { product: product2._id, size: 'L', color: 'Emerald Green', colorCode: '#046307', sku: 'AF-DRS-EG-L-203', stockQuantity: 8 }
      ]);

      const product3 = await Product.create({
        name: 'Aura Pure Linen Mandarin Casual Shirt',
        slug: 'aura-pure-linen-mandarin-casual-shirt',
        description:
          'Breathable 100% French linen tailored with contemporary band collar and mother-of-pearl buttons.',
        shortDescription: '100% pure linen casual shirt with mandarin collar.',
        category: catMen._id,
        subcategory: subMenShirts._id,
        brand: 'Aura Fashion',
        fabric: '100% Linen',
        basePrice: 2499,
        discountPrice: 1799,
        isFeatured: true,
        isTrending: true,
        ratingsAverage: 4.7,
        ratingsQuantity: 19,
        specifications: [
          { key: 'Occasion', value: 'Casual & Resort' },
          { key: 'Fit', value: 'Regular Fit' },
          { key: 'Pattern', value: 'Solid' },
          { key: 'Collar', value: 'Mandarin Collar' },
          { key: 'Gender', value: 'Men' }
        ],
        tags: ['shirt', 'linen', 'mandarin', 'men'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
            public_id: '',
            isPrimary: true,
            altText: 'Aura Pure Linen Shirt'
          }
        ]
      });

      await ProductVariant.create([
        { product: product3._id, size: 'M', color: 'Chalk White', colorCode: '#F8F9FA', sku: 'AF-SHRT-CW-M-301', stockQuantity: 12 },
        { product: product3._id, size: 'L', color: 'Chalk White', colorCode: '#F8F9FA', sku: 'AF-SHRT-CW-L-302', stockQuantity: 15 },
        { product: product3._id, size: 'XL', color: 'Chalk White', colorCode: '#F8F9FA', sku: 'AF-SHRT-CW-XL-303', stockQuantity: 7 }
      ]);

      // 6. Seed Coupons
      await Coupon.create([
        {
          code: 'AURA10',
          description: '10% instant discount on orders over ₹999',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minOrderValue: 999,
          maxDiscountAmount: 500,
          expiryDate: new Date('2028-12-31')
        },
        {
          code: 'WELCOME500',
          description: 'Flat ₹500 off on festive orders over ₹2,499',
          discountType: 'FIXED',
          discountValue: 500,
          minOrderValue: 2499,
          expiryDate: new Date('2028-12-31')
        }
      ]);

      // 7. Seed Hero Banners
      await Banner.create([
        {
          title: 'Curated Elegance & Modern Clothing',
          subtitle: 'Discover hand-embroidered Kurtis, bespoke silks and contemporary silhouettes.',
          imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
          linkUrl: '/shop',
          buttonText: 'Explore Collections',
          position: 'HERO',
          displayOrder: 1,
          isActive: true
        },
        {
          title: 'Festive Season Grand Launch',
          subtitle: 'Pure georgettes, royal velvet and handcrafted zari artistry from Bengaluru.',
          imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80',
          linkUrl: '/shop?category=womens-wear',
          buttonText: 'Shop Women Wear',
          position: 'HERO',
          displayOrder: 2,
          isActive: true
        }
      ]);

      console.log('✅ [Seed Complete] Initial Aura Fashion database successfully seeded.');
    }
  } catch (error) {
    console.warn('[Seed Warning] Could not complete initial data check:', error.message);
  }
};

export default ensureInitialData;
