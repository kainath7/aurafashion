import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Category from '../models/Category.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
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
          // Also fetch child subcategories so parent category filter includes its children
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

    // Brand filter (multi-select supported)
    if (brand) {
      const brands = (Array.isArray(brand) ? brand : brand.split(','))
        .map((b) => b.trim())
        .filter(Boolean);
      if (brands.length > 0) {
        query.brand = { $in: brands.map((b) => new RegExp(`^${b}$`, 'i')) };
      }
    }

    // Fabric filter (multi-select supported)
    if (fabric) {
      const fabrics = (Array.isArray(fabric) ? fabric : fabric.split(','))
        .map((f) => f.trim())
        .filter(Boolean);
      if (fabrics.length > 0) {
        query.fabric = { $in: fabrics.map((f) => new RegExp(`^${f}$`, 'i')) };
      }
    }

    // Rating filter (e.g. 4 for 4+ stars)
    if (rating) {
      query.ratingsAverage = { $gte: Number(rating) };
    }

    // Discount percentage filter
    if (discount) {
      const minDisc = Number(discount);
      if (!isNaN(minDisc) && minDisc > 0) {
        query.discountPrice = { $ne: null, $gt: 0 };
        query.$expr = {
          $gte: [
            {
              $multiply: [
                { $divide: [{ $subtract: ['$basePrice', '$discountPrice'] }, '$basePrice'] },
                100
              ]
            },
            minDisc
          ]
        };
      }
    }

    // Curated section flags
    if (featured === 'true' || featured === true) query.isFeatured = true;
    if (newArrivals === 'true' || newArrivals === true) query.isNewArrival = true;
    if (trending === 'true' || trending === true) query.isTrending = true;
    if (bestSellers === 'true' || bestSellers === true) query.isBestSeller = true;

    // Price range filter
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    // Dynamic specification filters (occasion, fit, pattern, collar, gender, etc.)
    const specConditions = [];
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
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('variants')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

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

    // If category is provided, scope dynamic filters to that category
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

    // 1. Categories with product counts
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
        .map((child) => ({
          _id: child._id,
          name: child.name,
          slug: child.slug,
          productCount: catCountMap.get(child._id.toString()) || 0
        }));

      return {
        _id: root._id,
        name: root.name,
        slug: root.slug,
        productCount: catCountMap.get(root._id.toString()) || 0,
        subcategories: children
      };
    });

    // 2. Distinct Brands
    const brands = await Product.distinct('brand', matchQuery);
    const cleanBrands = brands.filter(Boolean).sort((a, b) => a.localeCompare(b));

    // 3. Distinct Fabrics
    const fabrics = await Product.distinct('fabric', matchQuery);
    const cleanFabrics = fabrics.filter(Boolean).sort((a, b) => a.localeCompare(b));

    // 4. Price range (min and max)
    const priceStats = await Product.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$basePrice' },
          maxPrice: { $max: '$basePrice' }
        }
      }
    ]);
    const minPrice = priceStats.length > 0 ? priceStats[0].minPrice : 0;
    const maxPrice = priceStats.length > 0 ? priceStats[0].maxPrice : 10000;

    // 5. Variant attributes: Sizes and Colors
    const matchingProducts = await Product.find(matchQuery).select('_id');
    const productIds = matchingProducts.map((p) => p._id);

    const variantAgg = await ProductVariant.aggregate([
      {
        $match: {
          product: { $in: productIds },
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          sizes: { $addToSet: '$size' },
          colorObjects: {
            $addToSet: {
              color: '$color',
              colorCode: '$colorCode'
            }
          }
        }
      }
    ]);

    // Size ordering priority
    const standardSizeOrder = ['Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'];
    let sizes = [];
    let colors = [];

    if (variantAgg.length > 0) {
      const rawSizes = variantAgg[0].sizes || [];
      sizes = rawSizes.sort((a, b) => {
        const idxA = standardSizeOrder.indexOf(a.toUpperCase());
        const idxB = standardSizeOrder.indexOf(b.toUpperCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      // Deduplicate colors by color name
      const rawColors = variantAgg[0].colorObjects || [];
      const seenColor = new Set();
      for (const c of rawColors) {
        if (c.color && !seenColor.has(c.color.toLowerCase())) {
          seenColor.add(c.color.toLowerCase());
          colors.push({
            color: c.color,
            colorCode: c.colorCode || '#000000'
          });
        }
      }
      colors.sort((a, b) => a.color.localeCompare(b.color));
    }

    // 6. Dynamic Specifications (Occasion, Fit, Pattern, Collar, Gender, etc.)
    const specsAgg = await Product.aggregate([
      { $match: matchQuery },
      { $unwind: '$specifications' },
      {
        $group: {
          _id: {
            key: { $toLower: '$specifications.key' },
            displayName: '$specifications.key',
            value: '$specifications.value'
          }
        }
      },
      {
        $group: {
          _id: '$_id.key',
          key: { $first: '$_id.displayName' },
          options: { $addToSet: '$_id.value' }
        }
      },
      { $sort: { key: 1 } }
    ]);

    const specifications = specsAgg.map((s) => ({
      key: s.key,
      options: s.options.sort((a, b) => a.localeCompare(b))
    }));

    // 7. Ratings and Discount options
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

    // In-stock products count
    const inStockVariantProductIds = await ProductVariant.distinct('product', {
      product: { $in: productIds },
      isActive: true,
      stockQuantity: { $gt: 0 }
    });

    res.json({
      success: true,
      filters: {
        categories: categoriesTree,
        brands: cleanBrands,
        fabrics: cleanFabrics,
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
    const product = await Product.findOne(query)
      .populate('category', 'name slug')
      .populate('subcategory', 'name slug')
      .populate('variants')
      .populate('relatedProducts', 'name slug basePrice discountPrice images ratingsAverage');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // If related products weren't explicitly set, find related from the same category
    let related = product.relatedProducts;
    if (!related || related.length === 0) {
      related = await Product.find({
        category: product.category._id,
        _id: { $ne: product._id },
        isActive: true
      })
        .limit(4)
        .select('name slug basePrice discountPrice images ratingsAverage');
    }

    res.json({
      success: true,
      product: {
        ...product.toObject(),
        relatedProducts: related
      }
    });
  } catch (error) {
    next(error);
  }
};

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
      variants // JSON string or array
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

    // Process images
    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const uploadResult = await uploadToCloudinary(file.buffer, 'aura_fashion/products');
        images.push({
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          isPrimary: i === 0,
          altText: name
        });
      }
    } else if (req.body.imageUrls) {
      const urls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
      urls.forEach((url, i) => {
        images.push({
          url,
          public_id: '',
          isPrimary: i === 0,
          altText: name
        });
      });
    }

    if (images.length === 0) {
      // Default placeholder image
      images.push({
        url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
        public_id: '',
        isPrimary: true,
        altText: name
      });
    }

    // Parse specifications if stringified
    let parsedSpecs = [];
    if (specifications) {
      parsedSpecs = typeof specifications === 'string' ? JSON.parse(specifications) : specifications;
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags;
    }

    const product = await Product.create({
      name,
      slug,
      description,
      shortDescription: shortDescription || '',
      category,
      subcategory: subcategory || null,
      brand: brand || 'Aura Fashion',
      fabric: fabric || '',
      basePrice: Number(basePrice),
      discountPrice: discountPrice ? Number(discountPrice) : null,
      images,
      specifications: parsedSpecs,
      tags: parsedTags,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      isNewArrival: isNewArrival === 'true' || isNewArrival === true,
      isTrending: isTrending === 'true' || isTrending === true,
      isBestSeller: isBestSeller === 'true' || isBestSeller === true,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true
    });

    // Create variants if provided
    let createdVariants = [];
    if (variants) {
      const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
      if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
        for (const v of parsedVariants) {
          const sku = v.sku || `AF-${slug.slice(0, 4).toUpperCase()}-${v.color.slice(0, 3).toUpperCase()}-${v.size.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
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
          createdVariants.push(variantDoc);

          // Log initial stock transaction
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

    // Real-time broadcast to all connected storefront and admin clients
    broadcastEvent('product_created', populated);

    res.status(201).json({
      success: true,
      product: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
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
      existingImages
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

    // Preserve existing images that weren't deleted
    let updatedImages = [];
    if (existingImages) {
      const parsedExisting = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      updatedImages = parsedExisting;
    } else {
      updatedImages = product.images;
    }

    // Handle newly uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await uploadToCloudinary(file.buffer, 'aura_fashion/products');
        updatedImages.push({
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          isPrimary: updatedImages.length === 0,
          altText: product.name
        });
      }
    }

    product.images = updatedImages;
    await product.save();

    const populated = await Product.findById(product._id).populate('variants').populate('category');

    // Real-time broadcast to all connected storefront and admin clients
    broadcastEvent('product_updated', populated);

    res.json({
      success: true,
      product: populated
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

    // Delete associated variants
    await ProductVariant.deleteMany({ product: product._id });
    await product.deleteOne();

    // Real-time broadcast to all connected storefront and admin clients
    broadcastEvent('product_deleted', { productId: req.params.id });

    res.json({
      success: true,
      message: 'Product and variants deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
