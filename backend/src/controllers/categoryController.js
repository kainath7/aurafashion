import Category from '../models/Category.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Helper to slugify category names
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// @desc    Get all categories (hierarchical or flat)
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };

    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 });

    // Build hierarchy: root categories with their subcategories attached
    const rootCategories = categories.filter((cat) => !cat.parentCategory);
    const subCategories = categories.filter((cat) => cat.parentCategory);

    const tree = rootCategories.map((root) => {
      const children = subCategories.filter(
        (sub) => sub.parentCategory._id.toString() === root._id.toString()
      );
      return {
        ...root.toObject(),
        subcategories: children
      };
    });

    res.json({
      success: true,
      count: categories.length,
      categories,
      tree
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category by slug or ID
// @route   GET /api/categories/:idOrSlug
// @access  Public
export const getCategoryByIdOrSlug = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const isId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

    const query = isId ? { _id: idOrSlug } : { slug: idOrSlug };
    const category = await Category.findOne(query).populate('parentCategory', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get subcategories if this is a main category
    const subcategories = await Category.find({ parentCategory: category._id, isActive: true });

    res.json({
      success: true,
      category: {
        ...category.toObject(),
        subcategories
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category (Admin)
// @route   POST /api/categories
// @access  Private (Admin)
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, parentCategory, displayOrder, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    let slug = slugify(name);
    // ensure unique slug
    const existing = await Category.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let image = { url: '', public_id: '' };
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'aura_fashion/categories');
      image = {
        url: uploadResult.url,
        public_id: uploadResult.public_id
      };
    } else if (req.body.imageUrl) {
      image = { url: req.body.imageUrl, public_id: '' };
    }

    const category = await Category.create({
      name,
      slug,
      description: description || '',
      parentCategory: parentCategory || null,
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      isActive: isActive !== undefined ? isActive === 'true' || isActive === true : true,
      image
    });

    res.status(201).json({
      success: true,
      category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category (Admin)
// @route   PUT /api/categories/:id
// @access  Private (Admin)
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, parentCategory, displayOrder, isActive } = req.body;

    if (name && name !== category.name) {
      category.name = name;
      category.slug = slugify(name);
    }
    if (description !== undefined) category.description = description;
    if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
    if (isActive !== undefined) category.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'aura_fashion/categories');
      category.image = {
        url: uploadResult.url,
        public_id: uploadResult.public_id
      };
    } else if (req.body.imageUrl) {
      category.image = { url: req.body.imageUrl, public_id: '' };
    }

    await category.save();

    res.json({
      success: true,
      category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category (Admin)
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if category has child subcategories
    const childCount = await Category.countDocuments({ parentCategory: category._id });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that contains subcategories. Please delete or reassign subcategories first.'
      });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
