import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['formal', 'track', 'jeans', 'belt'], required: true },
  currentStock: { type: Number, required: true, default: 0 },
  minStock: { type: Number, required: true, default: 10 },
  maxStock: { type: Number, required: true, default: 100 },
  reorderPoint: { type: Number, required: true, default: 15 },
  sizes: [{
    size: String,
    stock: Number,
    salesVelocity: Number // units sold per week
  }],
  colors: [{
    color: String,
    stock: Number,
    salesVelocity: Number
  }],
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  lastRestocked: { type: Date },
  predictedDemand: { type: Number, default: 0 },
  aiRecommendation: { type: String },
  status: { 
    type: String, 
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'overstocked'],
    default: 'in-stock'
  }
}, { timestamps: true });

// Index for faster queries
productSchema.index({ sku: 1, category: 1, status: 1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  whatsappNumber: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  gstNumber: { type: String },
  productsSupplied: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  rating: { type: Number, min: 1, max: 5, default: 3 },
  averageDeliveryTime: { type: Number, default: 7 }, // days
  paymentTerms: { type: String },
  notes: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);

const alertSchema = new mongoose.Schema({
  type: { type: String, enum: ['low-stock', 'out-of-stock', 'restock-due', 'prediction', 'supplier-alert'], required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  isRead: { type: Boolean, default: false },
  isWhatsAppSent: { type: Boolean, default: false },
  whatsappSentAt: { type: Date },
  actionTaken: { type: String },
  resolvedAt: { type: Date }
}, { timestamps: true });

alertSchema.index({ isRead: 1, createdAt: -1 });

export const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);

const salesHistorySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantitySold: { type: Number, required: true },
  saleDate: { type: Date, required: true, default: Date.now },
  size: String,
  color: String,
  revenue: { type: Number, required: true },
  season: { type: String, enum: ['summer', 'winter', 'monsoon', 'festive'] },
  dayOfWeek: { type: Number, min: 0, max: 6 } // 0 = Sunday
}, { timestamps: true });

salesHistorySchema.index({ productId: 1, saleDate: -1 });

export const SalesHistory = mongoose.models.SalesHistory || mongoose.model('SalesHistory', salesHistorySchema);

// ==================== CUSTOMER SCHEMA ====================
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  whatsappNumber: { type: String },
  email: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  address: { type: String },
  // Pan-India record fields
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  preferredCategories: [{ type: String }],
  preferredSizes: [{ type: String }],
  lastPurchaseDate: { type: Date },
  notes: { type: String },
  tags: [{ type: String }], // e.g. VIP, Regular, New
  optedInBroadcast: { type: Boolean, default: true }, // consent for bulk messages
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

customerSchema.index({ phone: 1, state: 1, city: 1, status: 1 });
export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

// ==================== BROADCAST SCHEMA ====================
const broadcastSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetFilter: {
    states: [String],
    cities: [String],
    tags: [String],
    categories: [String],
    sendToAll: { type: Boolean, default: false }
  },
  status: { type: String, enum: ['draft', 'sending', 'sent', 'failed'], default: 'draft' },
  totalRecipients: { type: Number, default: 0 },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  scheduledAt: { type: Date },
  completedAt: { type: Date },
  createdBy: { type: String, default: 'admin' }
}, { timestamps: true });

export const Broadcast = mongoose.models.Broadcast || mongoose.model('Broadcast', broadcastSchema);

// ==================== PAYMENT INQUIRY SCHEMA ====================
const paymentInquirySchema = new mongoose.Schema({
  customerPhone: { type: String, required: true },
  customerName: { type: String },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String },
  quantity: { type: Number, default: 1 },
  size: { type: String },
  color: { type: String },
  amount: { type: Number, required: true },
  paymentLink: { type: String }, // UPI / Razorpay link
  upiId: { type: String },
  status: { type: String, enum: ['pending', 'sent', 'paid', 'cancelled'], default: 'pending' },
  notes: { type: String },
  paidAt: { type: Date }
}, { timestamps: true });

export const PaymentInquiry = mongoose.models.PaymentInquiry || mongoose.model('PaymentInquiry', paymentInquirySchema);
