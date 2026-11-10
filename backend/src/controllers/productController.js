import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Category from '../models/Category.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import { broadcastEvent } from '../sockets/socketHandler.js';

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

export const normalizeImageUrl = (url, req = null) => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80';
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const baseUrl = (process.env.BACKEND_URL || (req ? `${req.protocol}://${req.get('host')}` : 'http://localhost:5000')).replace(/\/+$/, '');
  return `${baseUrl}${cleanPath}`;
};

const formatProductForResponse = (productDoc, req = null) => {
  if (!productDoc) return null;
  const p = productDoc.toObject ? productDoc.toObject() : { ...productDoc };
  if (Array.isArray(p.images)) {
    p.images = p.images.map((img) => ({
      ...img,
      url: normalizeImageUrl(img.url, req)
    }));
  }
  return p;
};

// @desc    List products with multi-filter, search, and pagination
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const {
      keyword,
      category,
      subcategory,
      brand,
      fabric,
      minPrice,
      maxPrice,
      size,
      color,
      inStock,
      rating,
      discount,
      sort,
      page = 1,
      limit = 12,
      featured,
      newArrivals,
      trending,
      bestSellers,
      includeInactive,
      ...dynamicParams
    } = req.query;

    const query = includeInactive === 'true' ? {} : { isActive: true };

    // Search keyword
    if (keyword && keyword.trim()) {
      const kw = keyword.trim();
      query.$or = [
        { name: { $regex: kw, $options: 'i' } },
        { description: { $regex: kw, $options: 'i' } },
        { brand: { $regex: kw, $options: 'i' } },
        { fabric: { $regex: kw, $options: 'i' } },
        { tags: { $regex: kw, $options: 'i' } }
      ];
    }

    // Category filter: handles ObjectId, slug, or comma-delimited lists
    if (category) {
      const catInputs = (Array.isArray(category) ? category : category.split(','))
        .map((s) => s.trim())
        .filter(Boolean);

      const objectIds = [];
      const slugs = [];
      for (const input of catInputs) {
        if (input.match(/^[0-9a-fA-F]{24}$/)) {
          objectIds.push(input);
        } else {
          slugs.push(input);
        }
      }

      if (slugs.length > 0) {
        const foundCategories = await Category.find({ slug: { $in: slugs } }).select('_id');
        for (const c of foundCategories) {
          objectIds.push(c._id.toString());
          const childCategories = await Category.find({ parentCategory: c._id }).select('_id');
          childCategories.forEach((child) => objectIds.push(child._id.toString()));
        }
      }

      if (objectIds.length > 0) {
        query.category = { $in: objectIds };
      }
    }

    // Subcategory filter
    if (subcategory) {
      const subInputs = (Array.isArray(subcategory) ? subcategory : subcategory.split(','))
        .map((s) => s.trim())
        .filter(Boolean);

      const subIds = [];
      const subSlugs = [];
      for (const input of subInputs) {
        if (input.match(/^[0-9a-fA-F]{24}$/)) {
          subIds.push(input);
        } else {
          subSlugs.push(input);
        }
      }

      if (subSlugs.length > 0) {
        const foundSubs = await Category.find({ slug: { $in: subSlugs } }).select('_id');
        foundSubs.forEach((s) => subIds.push(s._id.toString()));
      }

      if (subIds.length > 0) {
        query.subcategory = { $in: subIds };
      }
    }

    // Brand filter
    if (brand) {
      const brands = (Array.isArray(brand) ? brand : brand.split(','))
        .map((b) => b.trim())
        .filter(Boolean);
      if (brands.length > 0) {
        query.brand = { $in: brands.map((b) => new RegExp(`^${b}$`, 'i')) };
      }
    }

    // Fabric filter
    if (fabric) {
      const fabrics = (Array.isArray(fabric) ? fabric : fabric.split(','))
        .map((f) => f.trim())
        .filter(Boolean);
      if (fabrics.length > 0) {
        query.fabric = { $in: fabrics.map((f) => new RegExp(`^${f}$`, 'i')) };
      }
    }

    // Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.basePrice = {};
      if (minPrice !== undefined && minPrice !== '') query.basePrice.$gte = Number(minPrice);
      if (maxPrice !== undefined && maxPrice !== '') query.basePrice.$lte = Number(maxPrice);
    }

    // Curated tags & collections
    if (featured === 'true' || featured === true) query.isFeatured = true;
    if (newArrivals === 'true' || newArrivals === true) query.isNewArrival = true;
    if (trending === 'true' || trending === true) query.isTrending = true;
    if (bestSellers === 'true' || bestSellers === true) query.isBestSeller = true;

    // Rating filter
    if (rating) {
      query.ratingsAverage = { $gte: Number(rating) };
    }

    // Discount filter
    if (discount) {
      const minDiscountPercent = Number(discount);
      query.$expr = {
        $gte: [
          {
            $multiply: [
              { $divide: [{ $subtract: ['$basePrice', { $ifNull: ['$discountPrice', '$basePrice'] }] }, '$basePrice'] },
              100
            ]
          },
          minDiscountPercent
        ]
      };
    }

    // Dynamic specification filters
    const reservedParams = new Set([
      'keyword',
      'category',
      'subcategory',
      'brand',
      'fabric',
      'minprice',
      'maxprice',
      'size',
      'color',
      'instock',
      'rating',
      'discount',
      'sort',
      'page',
      'limit',
      'featured',
      'newarrivals',
      'trending',
      'bestsellers',
      'includeinactive'
    ]);

    const specConditions = [];
    for (const [key, val] of Object.entries(dynamicParams)) {
      const cleanKey = key.startsWith('spec_') ? key.replace('spec_', '') : key;
      if (!reservedParams.has(cleanKey.toLowerCase()) && val) {
        const values = (Array.isArray(val) ? val : val.toString().split(','))
          .map((v) => v.trim())
          .filter(Boolean);
        if (values.length > 0) {
          specConditions.push({
            specifications: {
              $elemMatch: {
                key: new RegExp(`^${cleanKey}$`, 'i'),
                value: { $in: values.map((v) => new RegExp(`^${v}$`, 'i')) }
              }
            }
          });
        }
      }
    }

    if (specConditions.length > 0) {
      if (!query.$and) query.$and = [];
      query.$and.push(...specConditions);
    }

    // Filter by variant attributes (size, color, inStock)
    if (size || color || inStock === 'true' || inStock === true) {
      const variantFilter = { isActive: true };

      if (size) {
        const sizes = (Array.isArray(size) ? size : size.split(','))
          .map((s) => s.trim())
          .filter(Boolean);
        if (sizes.length > 0) {
          variantFilter.size = { $in: sizes.map((s) => new RegExp(`^${s}$`, 'i')) };
        }
      }

      if (color) {
        const colors = (Array.isArray(color) ? color : color.split(','))
          .map((c) => c.trim())
          .filter(Boolean);
        if (colors.length > 0) {
          variantFilter.color = { $in: colors.map((c) => new RegExp(`^${c}$`, 'i')) };
        }
      }

      if (inStock === 'true' || inStock === true) {
        variantFilter.stockQuantity = { $gt: 0 };
      }

      const matchingVariants = await ProductVariant.find(variantFilter).select('product');
      const productIds = matchingVariants.map((v) => v.product);
      query._id = { $in: productIds };
    }

    // Sorting options
    let sortOptions = { createdAt: -1 };
    switch (sort) {
      case 'price_asc':
        sortOptions = { basePrice: 1 };
        break;
      case 'price_desc':
        sortOptions = { basePrice: -1 };
        break;
      case 'popularity':
      case 'best_selling':
        sortOptions = { isBestSeller: -1, ratingsAverage: -1, ratingsQuantity: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'highest_rated':
        sortOptions = { ratingsAverage: -1, ratingsQuantity: -1 };
        break;
      case 'biggest_discount':
        sortOptions = { discountPrice: 1, basePrice: -1 };
        break;
      case 'featured':
      default:
        sortOptions = { isFeatured: -1, createdAt: -1 };
        break;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const totalProducts = await Product.countDocuments(query);
    const rawProducts = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('variants')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const products = rawProducts.map((p) => formatProductForResponse(p, req));

    res.json({
      success: true,
      count: products.length,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limitNum),
      currentPage: pageNum,
      products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dynamic filter metadata derived directly from MongoDB
// @route   GET /api/products/filters
// @access  Public
export const getFilterMetadata = async (req, res, next) => {
  try {
    const { category, keyword } = req.query;
    const matchQuery = { isActive: true };

    if (category) {
      if (category.match(/^[0-9a-fA-F]{24}$/)) {
        matchQuery.category = category;
      } else {
        const cat = await Category.findOne({ slug: category });
        if (cat) {
          const childCats = await Category.find({ parentCategory: cat._id }).select('_id');
          matchQuery.category = { $in: [cat._id, ...childCats.map((c) => c._id)] };
        }
      }
    }

    if (keyword && keyword.trim()) {
      matchQuery.$or = [
        { name: { $regex: keyword.trim(), $options: 'i' } },
        { description: { $regex: keyword.trim(), $options: 'i' } },
        { brand: { $regex: keyword.trim(), $options: 'i' } }
      ];
    }

    const allCategories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    const productCategoryCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const catCountMap = new Map();
    productCategoryCounts.forEach((p) => catCountMap.set(p._id.toString(), p.count));

    const rootCats = allCategories.filter((c) => !c.parentCategory);
    const subCats = allCategories.filter((c) => c.parentCategory);

    const categoriesTree = rootCats.map((root) => {
      const children = subCats
        .filter((sub) => sub.parentCategory.toString() === root._id.toString())
        .map((sub) => ({
          _id: sub._id,
          name: sub.name,
          slug: sub.slug,
          count: catCountMap.get(sub._id.toString()) || 0
        }));

      return {
        _id: root._id,
        name: root.name,
        slug: root.slug,
        count: (catCountMap.get(root._id.toString()) || 0) + children.reduce((s, c) => s + c.count, 0),
        subcategories: children
      };
    });

    const matchingProducts = await Product.find(matchQuery).select('_id basePrice brand fabric specifications');
    const productIds = matchingProducts.map((p) => p._id);

    const brands = [...new Set(matchingProducts.map((p) => p.brand).filter(Boolean))].sort();
    const fabrics = [...new Set(matchingProducts.map((p) => p.fabric).filter(Boolean))].sort();

    const variants = await ProductVariant.find({ product: { $in: productIds }, isActive: true });
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];

    const colorMap = new Map();
    variants.forEach((v) => {
      if (v.color && !colorMap.has(v.color)) {
        colorMap.set(v.color, { color: v.color, colorCode: v.colorCode || '#000000' });
      }
    });
    const colors = Array.from(colorMap.values());

    let minPrice = 0;
    let maxPrice = 5000;
    if (matchingProducts.length > 0) {
      const prices = matchingProducts.map((p) => p.basePrice);
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }

    const specsAgg = await Product.aggregate([
      { $match: matchQuery },
      { $unwind: '$specifications' },
      {
        $group: {
          _id: '$specifications.key',
          options: { $addToSet: '$specifications.value' }
        }
      },
      { $project: { key: '$_id', options: 1, _id: 0 } },
      { $sort: { key: 1 } }
    ]);

    const specifications = specsAgg.map((s) => ({
      key: s.key,
      options: s.options.sort((a, b) => a.localeCompare(b))
    }));

    const ratings = [
      { rating: 4, label: '4★ & above' },
      { rating: 3, label: '3★ & above' }
    ];

    const discounts = [
      { minDiscount: 10, label: '10% and above' },
      { minDiscount: 20, label: '20% and above' },
      { minDiscount: 30, label: '30% and above' },
      { minDiscount: 50, label: '50% and above' }
    ];

    const inStockVariantProductIds = await ProductVariant.distinct('product', {
      product: { $in: productIds },
      isActive: true,
      stockQuantity: { $gt: 0 }
    });

    res.json({
      success: true,
      filters: {
        categories: categoriesTree,
        brands,
        fabrics,
        sizes,
        colors,
        priceRange: {
          min: minPrice,
          max: maxPrice
        },
        specifications,
        ratings,
        discounts,
        inStockCount: inStockVariantProductIds.length,
        totalMatchingProducts: matchingProducts.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID or Slug
// @route   GET /api/products/:idOrSlug
// @access  Public
export const getProductByIdOrSlug = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

    const query = isId ? { _id: idOrSlug } : { slug: idOrSlug };
    const rawProduct = await Product.findOne(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('variants')
      .populate('relatedProducts', 'name slug basePrice discountPrice images ratingsAverage');

    if (!rawProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = formatProductForResponse(rawProduct, req);

    res.json({
      success: true,
      product
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// MODULE 5: SIMILAR PRODUCTS AND RECOMMENDATIONS ENGINE
// =============================================================================

// @desc    Get Flipkart-style categorized recommendations for a product
// @route   GET /api/products/:idOrSlug/recommendations
// @access  Public
export const getProductRecommendations = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);
    const limit = Math.min(20, Math.max(4, parseInt(req.query.limit, 10) || 8));

    const sourceProduct = await Product.findOne(isId ? { _id: idOrSlug } : { slug: idOrSlug })
      .populate('category')
      .populate('subcategory')
      .populate('variants');

    if (!sourceProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const sourceCatId = sourceProduct.category?._id?.toString() || sourceProduct.category?.toString();
    const sourceSubcatId = sourceProduct.subcategory?._id?.toString() || sourceProduct.subcategory?.toString();
    const sourceFabric = (sourceProduct.fabric || '').trim().toLowerCase();
    const sourceBrand = (sourceProduct.brand || '').trim().toLowerCase();
    const sourcePrice = Number(sourceProduct.basePrice) || 2000;
    const sourceTags = (sourceProduct.tags || []).map((t) => t.trim().toLowerCase());

    // Map source product specifications for attribute-level category matching
    const sourceSpecsMap = new Map();
    if (Array.isArray(sourceProduct.specifications)) {
      sourceProduct.specifications.forEach((s) => {
        if (s.key && s.value) {
          sourceSpecsMap.set(s.key.trim().toLowerCase(), s.value.trim().toLowerCase());
        }
      });
    }

    // Candidate products: active, not the source product
    const candidateQuery = {
      _id: { $ne: sourceProduct._id },
      isActive: true
    };

    const candidates = await Product.find(candidateQuery)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('variants')
      .limit(60);

    // Compute relevance score for each candidate product
    const scoredCandidates = candidates.map((cand) => {
      let score = 0;
      const candCatId = cand.category?._id?.toString() || cand.category?.toString();
      const candSubcatId = cand.subcategory?._id?.toString() || cand.subcategory?.toString();
      const candFabric = (cand.fabric || '').trim().toLowerCase();
      const candBrand = (cand.brand || '').trim().toLowerCase();
      const candPrice = Number(cand.basePrice) || 2000;
      const candTags = (cand.tags || []).map((t) => t.trim().toLowerCase());

      // 1. Same Subcategory (+35 pts)
      if (sourceSubcatId && candSubcatId && sourceSubcatId === candSubcatId) {
        score += 35;
      }

      // 2. Same Main Category (+15 pts)
      if (sourceCatId && candCatId && sourceCatId === candCatId) {
        score += 15;
      }

      // 3. Similar Fabric & Material (+15 pts)
      if (sourceFabric && candFabric && (sourceFabric.includes(candFabric) || candFabric.includes(sourceFabric))) {
        score += 15;
      }

      // 4. Category-Specific Specifications (+12 pts per matching attribute)
      // Checks: Occasion, Fit, Pattern, Weave, Gender, Collar, Sleeve, Style
      if (Array.isArray(cand.specifications)) {
        cand.specifications.forEach((s) => {
          if (s.key && s.value) {
            const candKey = s.key.trim().toLowerCase();
            const candVal = s.value.trim().toLowerCase();
            const sourceVal = sourceSpecsMap.get(candKey);
            if (sourceVal && (sourceVal === candVal || sourceVal.includes(candVal) || candVal.includes(sourceVal))) {
              score += 12;
            }
          }
        });
      }

      // 5. Common Tags (+5 pts per tag)
      if (sourceTags.length > 0 && candTags.length > 0) {
        const matchingTags = candTags.filter((t) => sourceTags.includes(t));
        score += matchingTags.length * 5;
      }

      // 6. Brand Matching (+8 pts)
      if (sourceBrand && candBrand && sourceBrand === candBrand) {
        score += 8;
      }

      // 7. Price Proximity (+15 pts if within 25%, +8 pts if within 50%)
      const priceDiff = Math.abs(sourcePrice - candPrice);
      const priceRatio = priceDiff / (sourcePrice || 1);
      if (priceRatio <= 0.25) {
        score += 15;
      } else if (priceRatio <= 0.5) {
        score += 8;
      }

      // 8. Available Variant Stock (+20 pts)
      const inStockUnits = cand.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) || 0;
      if (inStockUnits > 0) {
        score += 20;
      } else {
        score -= 25; // deprioritize out of stock
      }

      // 9. Ratings / Bestseller bonus
      if (cand.isBestSeller) score += 5;
      if (cand.ratingsAverage >= 4.5) score += 5;

      return {
        product: formatProductForResponse(cand, req),
        score,
        inStockUnits,
        isSameCategory: sourceCatId === candCatId,
        isSameSubcat: Boolean(sourceSubcatId && sourceSubcatId === candSubcatId)
      };
    });

    // Sort by descending score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 1. Similar Products: highest relevance matching subcategory and attributes
    const similarProducts = scoredCandidates
      .slice(0, limit)
      .map((item) => item.product);

    // 2. You May Also Like: items with close attributes or popular styles (offset from similar)
    const usedIds = new Set(similarProducts.map((p) => p._id.toString()));
    const youMayAlsoLike = scoredCandidates
      .filter((item) => !usedIds.has(item.product._id.toString()))
      .slice(0, limit)
      .map((item) => item.product);

    // 3. More From This Category: specifically items belonging to source category
    const moreFromCategory = scoredCandidates
      .filter((item) => item.isSameCategory && !usedIds.has(item.product._id.toString()))
      .slice(0, limit)
      .map((item) => item.product);

    // Graceful fallback if fewer items exist
    res.json({
      success: true,
      sourceProduct: {
        _id: sourceProduct._id,
        name: sourceProduct.name,
        category: sourceProduct.category?.name,
        subcategory: sourceProduct.subcategory?.name
      },
      sections: {
        similarProducts,
        youMayAlsoLike: youMayAlsoLike.length > 0 ? youMayAlsoLike : similarProducts.slice(0, 4),
        moreFromCategory: moreFromCategory.length > 0 ? moreFromCategory : similarProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// MODULE 4: PRODUCT CREATION, UPDATE & ADMIN IMAGE MANAGEMENT
// =============================================================================

// @desc    Create product with multiple images and variants
// @route   POST /api/products
// @access  Private (Admin)
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      shortDescription,
      category,
      subcategory,
      brand,
      fabric,
      basePrice,
      discountPrice,
      specifications,
      tags,
      isFeatured,
      isNewArrival,
      isTrending,
      isBestSeller,
      isActive,
      primaryImageIndex,
      variants
    } = req.body;

    if (!name || !description || !category || !basePrice) {
      return res.status(400).json({
        success: false,
        message: 'Product name, description, category, and base price are required'
      });
    }

    let slug = slugify(name);
    const existing = await Product.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const pIndex = parseInt(primaryImageIndex, 10) || 0;

    // Process images
    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploadResult = await uploadToCloudinary(file.buffer, 'aura_fashion/products');
        images.push({
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          isPrimary: i === pIndex,
          altText: name
        });
      }
    } else if (req.body.imageUrls) {
      const urls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
      urls.forEach((url, i) => {
        images.push({
          url: normalizeImageUrl(url, req),
          public_id: '',
          isPrimary: i === pIndex,
          altText: name
        });
      });
    }

    if (images.length === 0) {
      images.push({
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        public_id: '',
        isPrimary: true,
        altText: name
      });
    }

    // Guarantee exactly one primary image
    if (!images.some((img) => img.isPrimary)) {
      images[0].isPrimary = true;
    }

    let parsedSpecs = [];
    if (specifications) {
      parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
    }

    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;
    }

    const product = await Product.create({
      name,
      slug,
      description,
      shortDescription,
      category,
      subcategory: subcategory || null,
      brand: brand || 'Aura Fashion',
      fabric: fabric || '',
      basePrice: Number(basePrice),
      discountPrice: discountPrice ? Number(discountPrice) : null,
      specifications: parsedSpecs,
      tags: parsedTags,
      images,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isNewArrival: isNewArrival === 'true' || isNewArrival === true,
      isTrending: isTrending === 'true' || isTrending === true,
      isBestSeller: isBestSeller === 'true' || isBestSeller === true,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true
    });

    // Create size/color matrix variants
    if (variants) {
      const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
        for (const v of parsedVariants) {
          const sku =
            v.sku ||
            `AF-${name.slice(0, 3).toUpperCase()}-${(v.color || 'CLR').slice(0, 3).toUpperCase()}-${v.size}-${Math.floor(
              100 + Math.random() * 900
            )}`;

          const variantDoc = await ProductVariant.create({
            product: product._id,
            size: v.size,
            color: v.color,
            colorCode: v.colorCode || '#000000',
            sku,
            stockQuantity: Number(v.stockQuantity || 0),
            additionalPrice: Number(v.additionalPrice || 0),
            isActive: v.isActive !== undefined ? v.isActive : true
          });

          if (variantDoc.stockQuantity > 0) {
            await InventoryTransaction.create({
              product: product._id,
              variant: variantDoc._id,
              sku: variantDoc.sku,
              type: 'INITIAL_STOCK',
              quantityDelta: variantDoc.stockQuantity,
              previousStock: 0,
              newStock: variantDoc.stockQuantity,
              reason: 'Initial variant creation',
              performedBy: req.admin?.name || 'Admin'
            });
          }
        }
      }
    }

    const populated = await Product.findById(product._id).populate('variants').populate('category');
    const formatted = formatProductForResponse(populated, req);

    broadcastEvent('product_created', formatted);

    res.status(201).json({
      success: true,
      product: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product, photos, and primary selection
// @route   PUT /api/products/:id
// @access  Private (Admin)
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name,
      description,
      shortDescription,
      category,
      subcategory,
      brand,
      fabric,
      basePrice,
      discountPrice,
      specifications,
      tags,
      isFeatured,
      isNewArrival,
      isTrending,
      isBestSeller,
      isActive,
      existingImages,
      primaryImageIndex
    } = req.body;

    if (name && name !== product.name) {
      product.name = name;
      product.slug = slugify(name);
    }
    if (description) product.description = description;
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (category) product.category = category;
    if (subcategory !== undefined) product.subcategory = subcategory || null;
    if (brand) product.brand = brand;
    if (fabric !== undefined) product.fabric = fabric;
    if (basePrice !== undefined) product.basePrice = Number(basePrice);
    if (discountPrice !== undefined) product.discountPrice = discountPrice ? Number(discountPrice) : null;
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (isNewArrival !== undefined) product.isNewArrival = isNewArrival === 'true' || isNewArrival === true;
    if (isTrending !== undefined) product.isTrending = isTrending === 'true' || isTrending === true;
    if (isBestSeller !== undefined) product.isBestSeller = isBestSeller === 'true' || isBestSeller === true;
    if (isActive !== undefined) product.isActive = isActive === 'true' || isActive === true;

    if (specifications) {
      product.specifications = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
    }
    if (tags) {
      product.tags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;
    }

    // Parse existing retained images
    let updatedImages = [];
    if (existingImages) {
      const parsedExisting = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      updatedImages = parsedExisting.map((img) => ({
        url: img.url,
        public_id: img.public_id || '',
        isPrimary: Boolean(img.isPrimary),
        altText: img.altText || product.name
      }));
    } else {
      updatedImages = [...product.images];
    }

    // Safely delete removed images from storage
    const keptPublicIds = new Set(updatedImages.map((i) => i.public_id).filter(Boolean));
    for (const oldImg of product.images) {
      if (oldImg.public_id && !keptPublicIds.has(oldImg.public_id)) {
        deleteFromCloudinary(oldImg.public_id).catch((err) => {
          console.warn('[Storage Delete Warning]:', err.message);
        });
      }
    }

    // Handle newly uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToCloudinary(file.buffer, 'aura_fashion/products');
        updatedImages.push({
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          isPrimary: false,
          altText: product.name
        });
      }
    }

    // Handle primary image designation
    if (primaryImageIndex !== undefined && primaryImageIndex !== null && primaryImageIndex !== '') {
      const idx = parseInt(primaryImageIndex, 10);
      if (idx >= 0 && idx < updatedImages.length) {
        updatedImages.forEach((img, i) => {
          img.isPrimary = i === idx;
        });
      }
    } else if (!updatedImages.some((img) => img.isPrimary) && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    product.images = updatedImages;
    await product.save();

    const populated = await Product.findById(product._id).populate('variants').populate('category');
    const formatted = formatProductForResponse(populated, req);

    broadcastEvent('product_updated', formatted);

    res.json({
      success: true,
      product: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product and its variants
// @route   DELETE /api/products/:id
// @access  Private (Admin)
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete associated images from storage
    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img.public_id) {
          deleteFromCloudinary(img.public_id).catch(() => {});
        }
      }
    }

    // Delete associated variants
    await ProductVariant.deleteMany({ product: product._id });
    await product.deleteOne();

    broadcastEvent('product_deleted', { productId: req.params.id });

    res.json({
      success: true,
      message: 'Product and variants deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
