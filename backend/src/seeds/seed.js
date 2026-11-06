import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import StoreSettings from '../models/StoreSettings.js';
import Banner from '../models/Banner.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import InventoryTransaction from '../models/InventoryTransaction.js';

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_fashion';
    console.log(`[Seed] Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany(),
      Admin.deleteMany(),
      Category.deleteMany(),
      Product.deleteMany(),
      ProductVariant.deleteMany(),
      StoreSettings.deleteMany(),
      Banner.deleteMany(),
      Coupon.deleteMany(),
      Order.deleteMany(),
      InventoryTransaction.deleteMany()
    ]);

    // 1. Seed Store Settings
    console.log('[Seed] Seeding Store Settings with client information...');
    const settings = await StoreSettings.create({
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
      primaryColor: '#832729', // Deep Wine / Royal Berry
      accentColor: '#D4AF37', // Gold
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

    // 2. Seed Super Admin
    console.log('[Seed] Seeding Admin Account...');
    const admin = await Admin.create({
      name: 'Kainath (Aura Owner)',
      email: 'admin@aurafashion.com',
      password: 'AuraAdmin@2026',
      role: 'superadmin',
      isActive: true
    });

    // 3. Seed Demo Customer
    console.log('[Seed] Seeding Demo Customer...');
    const customer = await User.create({
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

    // 4. Seed Dynamic Categories & Subcategories
    console.log('[Seed] Seeding Categories & Subcategories...');
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

    // Subcategories
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

    const subTops = await Category.create({
      name: 'Tops & Shirts',
      slug: 'womens-tops',
      parentCategory: catWomen._id,
      displayOrder: 3
    });

    const subMenShirts = await Category.create({
      name: 'Casual Shirts',
      slug: 'mens-casual-shirts',
      parentCategory: catMen._id,
      displayOrder: 1
    });

    const subMenTrousers = await Category.create({
      name: 'Trousers & Chinos',
      slug: 'mens-trousers',
      parentCategory: catMen._id,
      displayOrder: 2
    });

    const subBags = await Category.create({
      name: 'Handbags & Clutches',
      slug: 'bags-clutches',
      parentCategory: catAcc._id,
      displayOrder: 1
    });

    // 5. Seed Products with real Variant Matrix
    console.log('[Seed] Seeding Clothing Products & Variant Stock Matrices...');

    const productsData = [
      {
        name: 'Aura Celestial Embroidered Georgette Anarkali',
        slug: 'aura-celestial-embroidered-georgette-anarkali',
        category: catWomen._id,
        subcategory: subKurtis._id,
        description: 'Impeccably tailored from premium airy georgette, this floor-length Anarkali kurti showcases fine metallic zari threadwork along the neckline and yoke. Comes with matching santoon inner lining and butter-soft dupatta.',
        shortDescription: 'Festive embroidered georgette Anarkali with dupatta set.',
        brand: 'Aura Fashion Exclusive',
        fabric: 'Pure Georgette with Santoon Lining',
        basePrice: 3499,
        discountPrice: 2499,
        isFeatured: true,
        isNewArrival: true,
        isBestSeller: true,
        specifications: [
          { key: 'Occasion', value: 'Festive & Wedding' },
          { key: 'Care', value: 'Dry Clean Only' },
          { key: 'Neckline', value: 'V-Neck with subtle gold piping' },
          { key: 'Sleeve Length', value: 'Full Length (22 inches)' }
        ],
        tags: ['anarkali', 'ethnic', 'festive', 'kurti', 'embroidered'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            altText: 'Aura Celestial Anarkali Front View'
          },
          {
            url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
            isPrimary: false,
            altText: 'Aura Celestial Anarkali Detail'
          },
          {
            url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
            isPrimary: false,
            altText: 'Aura Celestial Anarkali Fabric Close-up'
          }
        ],
        variants: [
          { size: 'S', color: 'Wine Red', colorCode: '#722F37', stock: 12 },
          { size: 'M', color: 'Wine Red', colorCode: '#722F37', stock: 15 },
          { size: 'L', color: 'Wine Red', colorCode: '#722F37', stock: 8 },
          { size: 'XL', color: 'Wine Red', colorCode: '#722F37', stock: 4 }, // low stock
          { size: 'S', color: 'Royal Navy', colorCode: '#000080', stock: 10 },
          { size: 'M', color: 'Royal Navy', colorCode: '#000080', stock: 14 },
          { size: 'L', color: 'Royal Navy', colorCode: '#000080', stock: 6 },
          { size: 'XL', color: 'Royal Navy', colorCode: '#000080', stock: 0 } // out of stock demo
        ]
      },
      {
        name: 'Velvet Plum Tiered Maxi Dress',
        slug: 'velvet-plum-tiered-maxi-dress',
        category: catWomen._id,
        subcategory: subDresses._id,
        description: 'An evocative silhouette crafted from rich micro-velvet, featuring tiered flare panels, balloon cuffed sleeves, and a flattering smocked back waistband.',
        shortDescription: 'Luxe tiered evening maxi dress with smocked back.',
        brand: 'Aura Couture',
        fabric: 'Micro Velvet Blend',
        basePrice: 2899,
        discountPrice: 1999,
        isFeatured: true,
        isTrending: true,
        specifications: [
          { key: 'Length', value: 'Maxi (52 inches)' },
          { key: 'Pattern', value: 'Solid Tiered' },
          { key: 'Closure', value: 'Concealed Side Zipper' }
        ],
        tags: ['maxi dress', 'evening', 'velvet', 'tiered'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            altText: 'Velvet Plum Tiered Maxi Dress'
          },
          {
            url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
            isPrimary: false,
            altText: 'Velvet Dress Silhouette'
          }
        ],
        variants: [
          { size: 'XS', color: 'Plum Purple', colorCode: '#4A154B', stock: 5 },
          { size: 'S', color: 'Plum Purple', colorCode: '#4A154B', stock: 18 },
          { size: 'M', color: 'Plum Purple', colorCode: '#4A154B', stock: 20 },
          { size: 'L', color: 'Plum Purple', colorCode: '#4A154B', stock: 11 },
          { size: 'S', color: 'Emerald Green', colorCode: '#046307', stock: 9 },
          { size: 'M', color: 'Emerald Green', colorCode: '#046307', stock: 12 },
          { size: 'L', color: 'Emerald Green', colorCode: '#046307', stock: 7 }
        ]
      },
      {
        name: 'Bespoke Textured Linen Casual Shirt',
        slug: 'bespoke-textured-linen-casual-shirt',
        category: catMen._id,
        subcategory: subMenShirts._id,
        description: 'Constructed from natural breathable European flax linen, pre-washed for effortless drape and luxurious softness. Finished with sustainable mother-of-pearl buttons and curved hem.',
        shortDescription: 'Breathable 100% pure linen casual button-down shirt.',
        brand: 'Aura Man',
        fabric: '100% Pure Organic Linen',
        basePrice: 2299,
        discountPrice: 1699,
        isFeatured: true,
        isNewArrival: true,
        specifications: [
          { key: 'Fit', value: 'Tailored Relaxed Fit' },
          { key: 'Collar', value: 'Spread Collar' },
          { key: 'Wash Care', value: 'Machine wash cold inside-out' }
        ],
        tags: ['linen', 'casual shirt', 'mens', 'summer', 'breathable'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            altText: 'Linen Casual Shirt Front'
          },
          {
            url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
            isPrimary: false,
            altText: 'Linen Shirt Collar Detail'
          }
        ],
        variants: [
          { size: 'M', color: 'Chalk White', colorCode: '#F8F9FA', stock: 25 },
          { size: 'L', color: 'Chalk White', colorCode: '#F8F9FA', stock: 30 },
          { size: 'XL', color: 'Chalk White', colorCode: '#F8F9FA', stock: 14 },
          { size: 'XXL', color: 'Chalk White', colorCode: '#F8F9FA', stock: 8 },
          { size: 'M', color: 'Sage Olive', colorCode: '#8A9A5B', stock: 16 },
          { size: 'L', color: 'Sage Olive', colorCode: '#8A9A5B', stock: 19 },
          { size: 'XL', color: 'Sage Olive', colorCode: '#8A9A5B', stock: 5 }
        ]
      },
      {
        name: 'Slim Fit Pleated Italian Chino Trousers',
        slug: 'slim-fit-pleated-italian-chino-trousers',
        category: catMen._id,
        subcategory: subMenTrousers._id,
        description: 'Superbly engineered stretch cotton twill with single front pleats, hidden elastic comfort side-tabs and reinforced pocket gussets for seamless all-day movement.',
        shortDescription: 'Tailored stretch cotton pleated chinos.',
        brand: 'Aura Man',
        fabric: '98% Cotton, 2% Elastane',
        basePrice: 2499,
        discountPrice: 1799,
        isBestSeller: true,
        specifications: [
          { key: 'Fit', value: 'Slim Tapered' },
          { key: 'Fly', value: 'YKK Brass Zipper' }
        ],
        tags: ['chinos', 'trousers', 'menswear', 'tailored'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            altText: 'Pleated Chinos'
          }
        ],
        variants: [
          { size: '30', color: 'Camel Beige', colorCode: '#C19A6B', stock: 14 },
          { size: '32', color: 'Camel Beige', colorCode: '#C19A6B', stock: 22 },
          { size: '34', color: 'Camel Beige', colorCode: '#C19A6B', stock: 18 },
          { size: '36', color: 'Camel Beige', colorCode: '#C19A6B', stock: 9 },
          { size: '32', color: 'Midnight Black', colorCode: '#111111', stock: 15 },
          { size: '34', color: 'Midnight Black', colorCode: '#111111', stock: 20 }
        ]
      },
      {
        name: 'Vegan Leather Structured Shoulder Bag',
        slug: 'vegan-leather-structured-shoulder-bag',
        category: catAcc._id,
        subcategory: subBags._id,
        description: 'Exquisitely structured tote crafted with premium pebbled cruelty-free vegan leather, adorned with polished champagne gold hardware and an adjustable cross-body strap.',
        shortDescription: 'Luxury structured handbag with gold accents.',
        brand: 'Aura Luxe',
        fabric: 'High-Density Vegan Microfiber Leather',
        basePrice: 2199,
        discountPrice: 1499,
        isFeatured: true,
        isTrending: true,
        specifications: [
          { key: 'Dimensions', value: '11" W x 8.5" H x 4.5" D' },
          { key: 'Compartments', value: '2 Main + 1 Zipped Pocket + Card Slots' }
        ],
        tags: ['bag', 'handbag', 'vegan leather', 'accessories'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
            isPrimary: true,
            altText: 'Structured Shoulder Bag'
          }
        ],
        variants: [
          { size: 'Standard', color: 'Cognac Tan', colorCode: '#8B4513', stock: 15 },
          { size: 'Standard', color: 'Obsidian Black', colorCode: '#0A0A0A', stock: 20 },
          { size: 'Standard', color: 'Champagne Cream', colorCode: '#F3E5AB', stock: 8 }
        ]
      }
    ];

    const createdProductDocs = [];
    for (const p of productsData) {
      const productDoc = await Product.create({
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        category: p.category,
        subcategory: p.subcategory,
        brand: p.brand,
        fabric: p.fabric,
        basePrice: p.basePrice,
        discountPrice: p.discountPrice,
        images: p.images,
        specifications: p.specifications,
        tags: p.tags,
        isFeatured: Boolean(p.isFeatured),
        isNewArrival: Boolean(p.isNewArrival),
        isTrending: Boolean(p.isTrending),
        isBestSeller: Boolean(p.isBestSeller),
        isActive: true
      });

      for (const v of p.variants) {
        const sku = `AF-${p.slug.slice(0, 4).toUpperCase()}-${v.color.slice(0, 3).toUpperCase()}-${v.size.replace(/\s+/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
        const variantDoc = await ProductVariant.create({
          product: productDoc._id,
          size: v.size,
          color: v.color,
          colorCode: v.colorCode,
          sku,
          stockQuantity: v.stock,
          additionalPrice: 0,
          isActive: true
        });

        if (v.stock > 0) {
          await InventoryTransaction.create({
            product: productDoc._id,
            variant: variantDoc._id,
            sku,
            type: 'INITIAL_STOCK',
            quantityDelta: v.stock,
            previousStock: 0,
            newStock: v.stock,
            reason: 'Database Seed Inventory',
            performedBy: 'System Seed'
          });
        }
      }

      createdProductDocs.push(productDoc);
    }

    // 6. Seed Homepage Banners
    console.log('[Seed] Seeding Homepage Banners...');
    await Banner.create([
      {
        title: 'Curated Elegance for Every Celebration',
        subtitle: 'Discover our festive collection of regal Anarkalis, tailored co-ords and statement luxury pieces.',
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
        linkUrl: '/shop?category=' + catWomen._id,
        buttonText: "Explore Women's Wear",
        position: 'HERO',
        displayOrder: 1,
        isActive: true
      },
      {
        title: 'Modern Tailoring & Breathable Linens',
        subtitle: 'Effortless gentlemen styles crafted with pristine craftsmanship in Bengaluru.',
        imageUrl: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1600&q=80',
        linkUrl: '/shop?category=' + catMen._id,
        buttonText: "Shop Men's Collection",
        position: 'HERO',
        displayOrder: 2,
        isActive: true
      },
      {
        title: 'Weekend Flash Offer: Extra 15% Off',
        subtitle: 'Use code AURA10 at checkout on orders over ₹1,999. Free delivery guaranteed.',
        imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
        linkUrl: '/shop',
        buttonText: 'Claim Your Discount',
        position: 'PROMO',
        displayOrder: 1,
        isActive: true
      }
    ]);

    // 7. Seed Coupons
    console.log('[Seed] Seeding Promotional Coupons...');
    await Coupon.create([
      {
        code: 'AURA10',
        description: '10% discount on orders above ₹1,499',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 1499,
        maxDiscountAmount: 500,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        code: 'WELCOME200',
        description: 'Flat ₹200 off on your first order over ₹1,999',
        discountType: 'FIXED',
        discountValue: 200,
        minOrderValue: 1999,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ]);

    // 8. Seed Demo Order for Priya Sharma (to give immediate realistic dashboard stats)
    console.log('[Seed] Seeding Sample Confirmed Order...');
    const firstProduct = createdProductDocs[0];
    const firstVariant = await ProductVariant.findOne({ product: firstProduct._id });

    await Order.create({
      orderNumber: 'AF-20261106-7842',
      user: customer._id,
      customerInfo: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      shippingAddress: customer.addresses[0],
      items: [
        {
          product: firstProduct._id,
          variant: firstVariant._id,
          productName: firstProduct.name,
          productImage: firstProduct.images[0].url,
          size: firstVariant.size,
          color: firstVariant.color,
          sku: firstVariant.sku,
          price: firstProduct.discountPrice || firstProduct.basePrice,
          quantity: 1,
          subtotal: firstProduct.discountPrice || firstProduct.basePrice
        }
      ],
      pricing: {
        itemsTotal: firstProduct.discountPrice || firstProduct.basePrice,
        deliveryCharge: 0,
        couponCode: null,
        discountAmount: 0,
        grandTotal: firstProduct.discountPrice || firstProduct.basePrice
      },
      paymentMethod: 'COD',
      paymentInfo: {
        status: 'PENDING'
      },
      orderStatus: 'CONFIRMED',
      statusHistory: [
        {
          status: 'CONFIRMED',
          timestamp: new Date(),
          comment: 'Order placed via Cash on Delivery',
          updatedBy: 'Priya Sharma'
        }
      ]
    });

    console.log('----------------------------------------------------');
    console.log('✅ [Seed Success] Aura Fashion Database Populated!');
    console.log('----------------------------------------------------');
    console.log('Shop Name:    ', settings.shopName);
    console.log('Owner:        ', settings.ownerName);
    console.log('Phone/WhatsApp:', settings.contactNumber);
    console.log('Email:        ', settings.email);
    console.log('Location:     ', settings.shopLocation);
    console.log('Admin Login:   admin@aurafashion.com / AuraAdmin@2026');
    console.log('Customer Login: customer@aurafashion.com / Customer@2026');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
