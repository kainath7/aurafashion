export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; public_id: string };
  parentCategory?: Category | string | null;
  displayOrder: number;
  isActive: boolean;
  subcategories?: Category[];
}

export interface ProductVariant {
  _id: string;
  product: string | Product;
  size: string;
  color: string;
  colorCode: string;
  sku: string;
  stockQuantity: number;
  additionalPrice: number;
  isActive: boolean;
}

export interface ProductImage {
  _id?: string;
  url: string;
  public_id?: string;
  isPrimary: boolean;
  altText?: string;
}

export interface Specification {
  key: string;
  value: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: Category;
  subcategory?: Category | null;
  brand: string;
  fabric?: string;
  specifications: Specification[];
  images: ProductImage[];
  basePrice: number;
  discountPrice?: number | null;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isActive: boolean;
  variants?: ProductVariant[];
  relatedProducts?: Product[];
  ratingsAverage: number;
  ratingsQuantity: number;
}

export interface Address {
  _id?: string;
  fullName: string;
  phone: string;
  houseNo: string;
  street: string;
  area?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string;
  addressSource?: 'GPS' | 'MANUAL' | 'MAP_PICKER';
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  addresses: Address[];
}

export interface CartItem {
  _id?: string;
  product: Product;
  variant: ProductVariant;
  size: string;
  color: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface GuestCartItem {
  variantId: string;
  productId: string;
  quantity: number;
  size: string;
  color: string;
  price: number;
  productName: string;
  productImage: string;
}

export interface OrderItem {
  _id: string;
  product: string | Product;
  variant: string | ProductVariant;
  productName: string;
  productImage: string;
  size: string;
  color: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface StatusHistory {
  status: string;
  timestamp: string;
  comment?: string;
  updatedBy?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: Address;
  items: OrderItem[];
  pricing: {
    itemsTotal: number;
    deliveryCharge: number;
    couponCode?: string | null;
    discountAmount: number;
    grandTotal: number;
  };
  paymentMethod: 'RAZORPAY' | 'COD';
  paymentInfo: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    paidAt?: string;
  };
  orderStatus:
    | 'PENDING'
    | 'CONFIRMED'
    | 'PROCESSING'
    | 'PACKED'
    | 'SHIPPED'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'RETURNED';
  statusHistory: StatusHistory[];
  trackingNumber?: string;
  createdAt: string;
}

export interface StoreSettings {
  shopName: string;
  ownerName: string;
  shopAddress: string;
  shopLocation: string;
  contactNumber: string;
  whatsappNumber: string;
  email: string;
  tagline: string;
  announcementText: string;
  logoUrl?: string;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  codAvailable: boolean;
  codExtraCharge: number;
  primaryColor: string;
  accentColor: string;
  returnPolicy: string;
  exchangePolicy: string;
  refundPolicy: string;
  businessHours: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
}

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  buttonText: string;
  position: 'HERO' | 'PROMO' | 'FEATURED_GRID';
  displayOrder: number;
  isActive: boolean;
}

export interface FilterCategoryItem {
  _id: string;
  name: string;
  slug: string;
  productCount: number;
  subcategories?: {
    _id: string;
    name: string;
    slug: string;
    productCount: number;
  }[];
}

export interface FilterColorItem {
  color: string;
  colorCode: string;
}

export interface FilterSpecification {
  key: string;
  options: string[];
}

export interface FilterMetadata {
  categories: FilterCategoryItem[];
  brands: string[];
  fabrics: string[];
  sizes: string[];
  colors: FilterColorItem[];
  priceRange: {
    min: number;
    max: number;
  };
  specifications: FilterSpecification[];
  ratings: { rating: number; label: string }[];
  discounts: { minDiscount: number; label: string }[];
  inStockCount: number;
  totalMatchingProducts: number;
}
