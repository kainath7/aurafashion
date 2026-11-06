import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

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
      minPrice,
      maxPrice,
      size,
      color,
      inStock,
      sort,
      page = 1,
      limit = 12,
      featured,
      newArrivals,
      trending,
      bestSellers,
      includeInactive
    } = req.query;

    const query = includeInactive === 'true' ? {} : { isActive: true };

    // Search keyword
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { brand: { $regex: keyword, $options: 'i' } },
        { tags: { $regex: keyword, $options: 'i' } }
      ];
    }

    // Category / Subcategory filter
    if (category) {
      query.category = category;
    }
    if (subcategory) {
      query.subcategory = subcategory;
    }

    // Curated section flags
    if (featured === 'true') query.isFeatured = true;
    if (newArrivals === 'true') query.isNewArrival = true;
    if (trending === 'true') query.isTrending = true;
    if (bestSellers === 'true') query.isBestSeller = true;

    // Price range filter
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    // Filter by variant attributes (size, color, inStock)
    if (size || color || inStock === 'true') {
      const variantFilter = { isActive: true };
      if (size) variantFilter.size = { $in: Array.isArray(size) ? size : [size] };
      if (color) variantFilter.color = { $in: Array.isArray(color) ? color : [color] };
      if (inStock === 'true') variantFilter.stockQuantity = { $gt: 0 };

      const matchingVariants = await ProductVariant.find(variantFilter).select('product');
      const productIds = matchingVariants.map((v) => v.product);
      query._id = { $in: productIds };
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'price_asc') sortOptions = { basePrice: 1 };
    else if (sort === 'price_desc') sortOptions = { basePrice: -1 };
    else if (sort === 'popularity') sortOptions = { ratingsAverage: -1, ratingsQuantity: -1 };
    else if (sort === 'newest') sortOptions = { createdAt: -1 };

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

    res.json({
      success: true,
      message: 'Product and variants deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
