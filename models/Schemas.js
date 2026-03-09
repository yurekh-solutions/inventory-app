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
  mrp: { type: Number },
  lastRestocked: { type: Date },
  predictedDemand: { type: Number, default: 0 },
  aiRecommendation: { type: String },
  status: { 
    type: String, 
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'overstocked'],
    default: 'in-stock'
  },
  // Blueprint fields
  hsn: { type: String }, // HSN/SAC code
  gstRate: { type: Number, default: 18 }, // GST percentage
  unit: { type: String, default: 'pcs' }, // pcs/kg/ltr
  barcode: { type: String },
  description: { type: String },
  images: [{ type: String }],
  mfgDate: { type: Date },
  expiryDate: { type: Date },
  batchNo: { type: String },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }, // Default warehouse
  isFinishedGoods: { type: Boolean, default: true },
  isRawMaterial: { type: Boolean, default: false }
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

// ==================== WAREHOUSE SCHEMA ====================
const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true }, // WH-MAIN, WH-STORE
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  contactPerson: { type: String },
  phone: { type: String },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });

export const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);

// ==================== STOCK LEDGER SCHEMA (Core of Live Stock Engine) ====================
const stockLedgerSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true }, // Denormalized for faster queries
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  qtyChange: { type: Number, required: true }, // +ve for inward, -ve for outward
  balanceAfter: { type: Number, required: true }, // Running balance
  unitCost: { type: Number, required: true },
  totalValue: { type: Number, required: true }, // qtyChange * unitCost
  referenceType: { 
    type: String, 
    enum: ['purchase', 'sales', 'production-consume', 'production-output', 'transfer-in', 'transfer-out', 'adjustment', 'opening', 'return-in', 'return-out'],
    required: true 
  },
  referenceId: { type: mongoose.Schema.Types.Mixed, required: true }, // Invoice ID, PO ID, etc.
  reason: { type: String }, // For adjustments
  batchNo: { type: String },
  mfgDate: { type: Date },
  expiryDate: { type: Date },
  createdBy: { type: String, default: 'admin' },
  remarks: { type: String }
}, { timestamps: true });

stockLedgerSchema.index({ product: 1, warehouse: 1, createdAt: -1 });
stockLedgerSchema.index({ sku: 1, referenceType: 1 });

export const StockLedger = mongoose.models.StockLedger || mongoose.model('StockLedger', stockLedgerSchema);

// ==================== CUSTOMER (BILLING) SCHEMA - Enhanced for GST ====================
const billingCustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['retail', 'wholesale', 'corporate'], default: 'retail' },
  phone: { type: String, required: true },
  whatsappNumber: { type: String },
  email: { type: String },
  gstin: { type: String }, // GST number for B2B
  pan: { type: String },
  billingAddress: {
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String, default: 'India' }
  },
  shippingAddress: {
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String }
  },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  outstandingAmount: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  preferredCategories: [{ type: String }],
  tags: [{ type: String }],
  notes: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' }
}, { timestamps: true });

billingCustomerSchema.index({ phone: 1, gstin: 1, name: 1 });

export const BillingCustomer = mongoose.models.BillingCustomer || mongoose.model('BillingCustomer', billingCustomerSchema);

// ==================== INVOICE SCHEMA ====================
const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true }, // TB/2026-27/000123
  invoiceDate: { type: Date, required: true, default: Date.now },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingCustomer', required: true },
  customerName: { type: String, required: true },
  customerGstin: { type: String },
  billingAddress: {
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  shippingAddress: {
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String },
    hsn: { type: String },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'pcs' },
    rate: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    taxableValue: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  totalTaxableValue: { type: Number, required: true },
  totalCgst: { type: Number, default: 0 },
  totalSgst: { type: Number, default: 0 },
  totalIgst: { type: Number, default: 0 },
  totalGst: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentMode: { type: String, enum: ['cash', 'upi', 'bank', 'credit', 'card'], default: 'cash' },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid', 'credit'], default: 'paid' },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  dueDate: { type: Date },
  remarks: { type: String },
  status: { type: String, enum: ['draft', 'finalized', 'cancelled'], default: 'draft' },
  finalizedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String },
  pdfUrl: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }
}, { timestamps: true });

invoiceSchema.index({ invoiceNo: 1, customer: 1, invoiceDate: -1, status: 1 });

export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

// ==================== USER SCHEMA (for Role-Based Access) ====================
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  role: { 
    type: String, 
    enum: ['admin', 'accounts', 'inventory-manager', 'production-supervisor', 'viewer'],
    default: 'viewer'
  },
  permissions: {
    canCreateInvoice: { type: Boolean, default: false },
    canFinalizeInvoice: { type: Boolean, default: false },
    canAdjustStock: { type: Boolean, default: false },
    canImportInventory: { type: Boolean, default: false },
    canViewReports: { type: Boolean, default: true },
    canManageProducts: { type: Boolean, default: false },
    canManageCustomers: { type: Boolean, default: false },
    canOverrideNegativeStock: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date }
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);

// ==================== PURCHASE ORDER SCHEMA ====================
const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true },
  poDate: { type: Date, required: true, default: Date.now },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: { type: String, required: true },
  supplierGstin: { type: String },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    receivedQty: { type: Number, default: 0 },
    rate: { type: Number, required: true },
    gstRate: { type: Number, default: 0 },
    amount: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'approved', 'partial-received', 'received', 'cancelled'], default: 'draft' },
  receivedAt: { type: Date },
  remarks: { type: String }
}, { timestamps: true });

export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);

// ==================== PRODUCTION SCHEMAS (BOM & Production Orders) ====================
const bomSchema = new mongoose.Schema({
  finishedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  finishedProductSku: { type: String, required: true },
  rawMaterials: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantityRequired: { type: Number, required: true },
    unit: { type: String, default: 'pcs' },
    wastePercentage: { type: Number, default: 0 }
  }],
  totalCost: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 }
}, { timestamps: true });

export const BOM = mongoose.models.BOM || mongoose.model('BOM', bomSchema);

const productionOrderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true },
  orderDate: { type: Date, required: true, default: Date.now },
  finishedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  finishedProductSku: { type: String, required: true },
  quantityToProduce: { type: Number, required: true },
  bomVersion: { type: Number, default: 1 },
  status: { 
    type: String, 
    enum: ['planned', 'in-progress', 'completed', 'cancelled'],
    default: 'planned'
  },
  rawMaterialsConsumed: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: { type: String },
    name: { type: String },
    plannedQty: { type: Number },
    actualQty: { type: Number },
    ledgerEntryId: { type: mongoose.Schema.Types.ObjectId }
  }],
  outputQuantity: { type: Number, default: 0 },
  outputLedgerEntryId: { type: mongoose.Schema.Types.ObjectId },
  startedAt: { type: Date },
  completedAt: { type: Date },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const ProductionOrder = mongoose.models.ProductionOrder || mongoose.model('ProductionOrder', productionOrderSchema);
