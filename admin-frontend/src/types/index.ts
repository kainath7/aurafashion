export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; public_id: string };
  parentCategory?: any;
  displayOrder: number;
  isActive: boolean;
  subcategories?: Category[];
}

export interface ProductVariant {
  _id: string;
  product: any;
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
  specifications: { key: string; value: string }[];
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
}

export interface OrderItem {
  _id: string;
  product: any;
  variant: any;
  productName: string;
  productImage: string;
  size: string;
  color: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    houseNo: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };
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
  notifications?: {
    orderConfirmationEmail: boolean;
    paymentConfirmationEmail: boolean;
    orderStatusEmail: boolean;
    adminNewOrderAlert: boolean;
    adminLowStockAlert: boolean;
    adminOrderCancelledAlert: boolean;
    adminNotificationEmail: string;
  };
}

export interface EmailLog {
  _id: string;
  recipient: string;
  emailType: string;
  subject: string;
  orderNumber?: string;
  status: 'SENT' | 'FAILED' | 'RETRYING' | 'SKIPPED';
  attempts: number;
  messageId?: string;
  errorMessage?: string;
  createdAt: string;
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

export interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number | null;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
}
