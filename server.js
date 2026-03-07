import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import { Product, Supplier, Alert, SalesHistory, Customer, Broadcast, PaymentInquiry, Warehouse, StockLedger, BillingCustomer, Invoice, User, PurchaseOrder, BOM, ProductionOrder } from './models/Schemas.js';
import { tubhyamProducts } from './data/seedProducts.js';
import { demandPredictor } from './ai/Predictor.js';
import { whatsappService } from './services/WhatsAppService.js';
import cron from 'node-cron';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'https://tubhyam.in',
    'https://www.tubhyam.in',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve dashboard at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tubhyam-inventory')
  .then(async () => {
    console.log('✅ MongoDB Connected');
    
    // Auto-create default warehouse if none exists
    const warehouseCount = await Warehouse.countDocuments();
    if (warehouseCount === 0) {
      const defaultWarehouse = new Warehouse({
        name: 'Main Store',
        code: 'MAIN',
        address: 'Tubhyam Fashion Store',
        city: 'Mumbai',
        state: 'Maharashtra',
        isActive: true,
        isDefault: true
      });
      await defaultWarehouse.save();
      console.log('✅ Created default warehouse: Main Store');
    }
    
    // Auto-seed Tubhyam products if DB is empty
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany(tubhyamProducts);
      console.log(`✅ Seeded ${tubhyamProducts.length} Tubhyam products into inventory`);
    }
  })
  .catch(err => console.error('❌ MongoDB Error:', err));

// ==================== PRODUCT ROUTES ====================

// Get all products with filters
app.get('/api/products', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).populate('supplier');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('supplier');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SUPPLIER ROUTES ====================

// Get all suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find().populate('productsSupplied');
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single supplier
app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).populate('productsSupplied');
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create supplier
app.post('/api/suppliers', async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update supplier
app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete supplier
app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ALERT ROUTES ====================

// Get all alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { unread } = req.query;
    const query = {};
    if (unread === 'true') query.isRead = false;

    const alerts = await Alert.find(query)
      .populate('productId')
      .populate('supplierId')
      .sort({ createdAt: -1 });
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark alert as read
app.put('/api/alerts/:id/read', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== AI PREDICTION ROUTES ====================

// Get AI predictions for all products
app.get('/api/predictions', async (req, res) => {
  try {
    const insights = await demandPredictor.generateInsights();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get prediction for specific product
app.get('/api/predictions/:productId', async (req, res) => {
  try {
    const prediction = await demandPredictor.predictDemand(req.params.productId);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SALES TRACKING ====================

// Record sale
app.post('/api/sales', async (req, res) => {
  try {
    const { productId, quantitySold, revenue, size, color } = req.body;
    
    const sale = new SalesHistory({
      productId,
      quantitySold,
      revenue,
      size,
      color,
      season: demandPredictor.getCurrentSeason(),
      dayOfWeek: new Date().getDay()
    });

    await sale.save();

    // Update product stock
    await Product.findByIdAndUpdate(productId, {
      $inc: { currentStock: -quantitySold }
    });

    res.json(sale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get sales history
app.get('/api/sales', async (req, res) => {
  try {
    const { productId, startDate, endDate } = req.query;
    const query = {};

    if (productId) query.productId = productId;
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sales = await SalesHistory.find(query)
      .populate('productId')
      .sort({ saleDate: -1 });
    
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== WHATSAPP ROUTES ====================

// QR Code scan page — open in browser to scan
app.get('/whatsapp/qr', (req, res) => {
  res.send(whatsappService.getQRPage());
});

// Returns latest QR image as JSON (for live auto-update)
app.get('/api/whatsapp/qr-data', (req, res) => {
  const status = whatsappService.getStatus();
  if (status.isReady) return res.json({ ready: true });
  if (whatsappService.qrImageBase64) return res.json({ image: whatsappService.qrImageBase64 });
  return res.json({ image: null });
});

// WhatsApp connection status
app.get('/api/whatsapp/status', (req, res) => {
  res.json(whatsappService.getStatus());
});

// Send test WhatsApp message
app.post('/api/whatsapp/test', async (req, res) => {
  try {
    const { toNumber, message } = req.body;
    const result = await whatsappService.sendMessage(toNumber, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DASHBOARD STATS ====================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStock = await Product.countDocuments({ status: 'low-stock' });
    const outOfStock = await Product.countDocuments({ status: 'out-of-stock' });
    const totalSuppliers = await Supplier.countDocuments();
    const unreadAlerts = await Alert.countDocuments({ isRead: false });

    const recentSales = await SalesHistory.aggregate([
      { $match: { saleDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: null, totalRevenue: { $sum: '$revenue' }, totalQuantity: { $sum: '$quantitySold' } } }
    ]);

    res.json({
      totalProducts,
      lowStock,
      outOfStock,
      totalSuppliers,
      unreadAlerts,
      weeklyRevenue: recentSales[0]?.totalRevenue || 0,
      weeklySales: recentSales[0]?.totalQuantity || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CUSTOMER ROUTES ====================

app.get('/api/customers', async (req, res) => {
  try {
    const { state, city, tag, search, broadcastOnly } = req.query;
    const query = { status: 'active' };
    if (state) query.state = state;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (tag) query.tags = tag;
    if (broadcastOnly === 'true') query.optedInBroadcast = true;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers', async (req, res) => {
  try {
    const c = new Customer(req.body);
    await c.save();
    res.status(201).json(c);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const c = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get pan-India state stats
app.get('/api/customers/stats/states', async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 }, totalSpent: { $sum: '$totalSpent' } } },
      { $sort: { count: -1 } }
    ]);
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== BROADCAST ROUTES ====================

// Get all broadcasts
app.get('/api/broadcasts', async (req, res) => {
  try {
    const broadcasts = await Broadcast.find().sort({ createdAt: -1 });
    res.json(broadcasts);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create broadcast
app.post('/api/broadcasts', async (req, res) => {
  try {
    const b = new Broadcast(req.body);
    await b.save();
    res.status(201).json(b);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Send broadcast (bulk WhatsApp)
app.post('/api/broadcasts/:id/send', async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ error: 'Broadcast not found' });

    // Build customer filter
    const query = { status: 'active', optedInBroadcast: true };
    const f = broadcast.targetFilter;
    if (!f.sendToAll) {
      if (f.states && f.states.length > 0) query.state = { $in: f.states };
      if (f.cities && f.cities.length > 0) query.city = { $in: f.cities };
      if (f.tags && f.tags.length > 0) query.tags = { $in: f.tags };
    }

    const customers = await Customer.find(query);
    broadcast.totalRecipients = customers.length;
    broadcast.status = 'sending';
    await broadcast.save();

    res.json({ message: `Sending to ${customers.length} customers...`, broadcastId: broadcast._id });

    // Send in background with delay to avoid spam
    let sent = 0, failed = 0;
    for (const customer of customers) {
      const num = customer.whatsappNumber || customer.phone;
      try {
        await whatsappService.sendMessage(num, broadcast.message);
        sent++;
      } catch (e) { failed++; }
      await new Promise(r => setTimeout(r, 1500)); // 1.5s delay between messages
    }

    broadcast.sentCount = sent;
    broadcast.failedCount = failed;
    broadcast.status = 'sent';
    broadcast.completedAt = new Date();
    await broadcast.save();
    console.log(`Broadcast done: ${sent} sent, ${failed} failed`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== PAYMENT INQUIRY ROUTES ====================

app.get('/api/payments', async (req, res) => {
  try {
    const payments = await PaymentInquiry.find().populate('productId').sort({ createdAt: -1 });
    res.json(payments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create payment inquiry and send WhatsApp
app.post('/api/payments', async (req, res) => {
  try {
    const { customerPhone, customerName, productName, quantity, size, color, amount, upiId, notes } = req.body;

    // Generate UPI deep link
    const upi = upiId || process.env.UPI_ID || 'tubhyam@upi';
    const upiLink = `upi://pay?pa=${upi}&pn=Tubhyam&am=${amount}&cu=INR&tn=${encodeURIComponent(productName + ' x' + quantity)}`;

    const payment = new PaymentInquiry({
      customerPhone, customerName, productName, quantity, size, color, amount,
      paymentLink: upiLink, upiId: upi, status: 'pending', notes
    });
    await payment.save();

    // Send WhatsApp payment message
    const msg = `Hello ${customerName || 'Customer'},\n\nThank you for your interest in *Tubhyam*!\n\n*Order Summary:*\n- Product: ${productName}\n- Size: ${size || 'N/A'}, Color: ${color || 'N/A'}\n- Qty: ${quantity}\n- Amount: Rs. ${amount}\n\n*Pay via UPI:*\n${upi}\n\nOr tap to pay: ${upiLink}\n\nAfter payment, send screenshot to confirm your order.\nThank you!`;

    await whatsappService.sendMessage(customerPhone, msg);
    payment.status = 'sent';
    await payment.save();

    res.status(201).json({ payment, message: 'Payment link sent via WhatsApp' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Mark payment as paid
app.put('/api/payments/:id/paid', async (req, res) => {
  try {
    const p = await PaymentInquiry.findByIdAndUpdate(req.params.id, { status: 'paid', paidAt: new Date() }, { new: true });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ==================== STOREFRONT BRIDGE ====================
// Called by tubhyam.in website when a customer places an order
// Deducts stock and logs sale — this is the ONLY connection needed

app.post('/api/storefront/order', async (req, res) => {
  try {
    const { items, customerPhone, customerName } = req.body;
    // items = [{ sku, productId, name, quantity, size, color, price }]
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const results = [];

    for (const item of items) {
      const { sku, productId, name, quantity, size, color, price } = item;
      if (!quantity || quantity <= 0) continue;

      // Find product by productId or SKU
      const product = productId
        ? await Product.findById(productId)
        : await Product.findOne({ sku });

      if (!product) {
        results.push({ sku, status: 'not_found' });
        continue;
      }

      if (product.currentStock < quantity) {
        results.push({ sku: product.sku, name: product.name, status: 'insufficient_stock', available: product.currentStock });
        continue;
      }

      // Deduct stock
      const newStock = product.currentStock - quantity;
      let newStatus = 'in-stock';
      if (newStock === 0) newStatus = 'out-of-stock';
      else if (newStock <= product.reorderPoint) newStatus = 'low-stock';

      await Product.findByIdAndUpdate(product._id, {
        $inc: { currentStock: -quantity },
        status: newStatus,
      });

      // Log to SalesHistory for AI predictions
      await SalesHistory.create({
        productId: product._id,
        quantitySold: quantity,
        revenue: (price || product.sellingPrice) * quantity,
        size: size || null,
        color: color || null,
        season: demandPredictor.getCurrentSeason(),
        dayOfWeek: new Date().getDay(),
      });

      // Auto-create customer record if phone provided
      if (customerPhone) {
        await Customer.findOneAndUpdate(
          { phone: customerPhone },
          {
            $set: { name: customerName || 'Website Customer', lastPurchaseDate: new Date() },
            $inc: { totalOrders: 1, totalSpent: (price || product.sellingPrice) * quantity },
            $addToSet: { preferredCategories: product.category },
          },
          { upsert: true, new: true }
        );
      }

      results.push({ sku: product.sku, name: product.name, status: 'ok', newStock, newStatus });
    }

    res.json({ success: true, results });
  } catch (e) {
    console.error('Storefront order error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/storefront/stock/:sku — website can check live stock before showing "Add to Cart"
app.get('/api/storefront/stock/:sku', async (req, res) => {
  try {
    const product = await Product.findOne({ sku: req.params.sku.toUpperCase() }, 'name sku currentStock status sizes colors');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({
      sku: product.sku,
      name: product.name,
      currentStock: product.currentStock,
      status: product.status,
      sizes: product.sizes,
      colors: product.colors,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== BILLING & INVOICING ROUTES (GST-Ready) ====================

// Helper: Generate Invoice Number
function generateInvoiceNumber(year) {
  return `TB/${year}/000${Math.floor(Math.random() * 9000) + 1000}`;
}

// Helper: Calculate GST
function calculateGST(item, isInterstate) {
  const gstRate = item.gstRate || 18;
  const taxableValue = item.rate * item.quantity - (item.discount || 0);
  
  let cgstRate = 0, sgstRate = 0, igstRate = 0;
  
  if (isInterstate) {
    igstRate = gstRate;
  } else {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
  }
  
  const cgstAmount = (taxableValue * cgstRate) / 100;
  const sgstAmount = (taxableValue * sgstRate) / 100;
  const igstAmount = (taxableValue * igstRate) / 100;
  const totalAmount = taxableValue + cgstAmount + sgstAmount + igstAmount;
  
  return {
    taxableValue,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount
  };
}

// Get all billing customers
app.get('/api/billing-customers', async (req, res) => {
  try {
    const { search, state, type } = req.query;
    const query = { status: 'active' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { gstin: { $regex: search, $options: 'i' } }
      ];
    }
    if (state) query['billingAddress.state'] = state;
    if (type) query.type = type;
    
    const customers = await BillingCustomer.find(query).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create billing customer
app.post('/api/billing-customers', async (req, res) => {
  try {
    const customer = new BillingCustomer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update billing customer
app.put('/api/billing-customers/:id', async (req, res) => {
  try {
    const customer = await BillingCustomer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get warehouses
app.get('/api/warehouses', async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ isActive: true }).sort({ isDefault: -1, name: 1 });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create warehouse
app.post('/api/warehouses', async (req, res) => {
  try {
    const warehouse = new Warehouse(req.body);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create invoice (draft)
app.post('/api/invoices', async (req, res) => {
  try {
    const { customer, customerName, customerPhone, customerState, items, warehouseId, paymentMode, remarks, customerGstin, billingAddress } = req.body;
    
    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer and items are required' });
    }
    
    // Try to find customer - first check BillingCustomer, then regular Customer
    let customerDoc = await BillingCustomer.findById(customer);
    let customerFromRegular = null;
    
    if (!customerDoc) {
      // Try regular Customer collection
      customerFromRegular = await Customer.findById(customer);
      if (!customerFromRegular) {
        return res.status(404).json({ error: 'Customer not found. Please add customer first.' });
      }
    }
    
    // Get or create default warehouse
    let warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      // Try to find any existing warehouse
      warehouse = await Warehouse.findOne({ isActive: true });
      if (!warehouse) {
        // Create default warehouse for single-vendor setup
        warehouse = new Warehouse({
          name: 'Main Store',
          code: 'MAIN',
          address: 'Tubhyam Store',
          city: 'Mumbai',
          state: 'Maharashtra',
          isActive: true,
          isDefault: true
        });
        await warehouse.save();
      }
    }
    
    // Determine if interstate based on customer state (if provided) or billing address
    const custState = customerState || billingAddress?.state || customerFromRegular?.state || 'Maharashtra';
    const isInterstate = custState !== 'Maharashtra';
    
    // Use customer info from regular Customer if available
    const finalCustomerName = customerName || customerFromRegular?.name || customerDoc?.name;
    const finalCustomerPhone = customerPhone || customerFromRegular?.phone || customerDoc?.phone;
    const finalCustomerGstin = customerGstin || customerFromRegular?.gstin || customerDoc?.gstin || '';
    const finalBillingAddress = billingAddress || {
      address: customerFromRegular?.address || customerDoc?.billingAddress?.address || '',
      city: customerFromRegular?.city || customerDoc?.billingAddress?.city || '',
      state: custState,
      pincode: customerFromRegular?.pincode || customerDoc?.billingAddress?.pincode || ''
    };
    
    // Process items with GST calculation and stock validation
    const processedItems = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    
    for (const item of items) {
      const product = await Product.findOne({ sku: item.sku });
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.sku}` });
      }
      
      // Validate stock
      if (product.currentStock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}` 
        });
      }
      
      const gstCalc = calculateGST({
        rate: item.rate || product.sellingPrice,
        quantity: item.quantity,
        discount: item.discount || 0,
        gstRate: item.gstRate || product.gstRate || 18
      }, isInterstate);
      
      processedItems.push({
        product: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        hsn: product.hsn,
        quantity: item.quantity,
        unit: product.unit,
        rate: item.rate || product.sellingPrice,
        discount: item.discount || 0,
        taxableValue: gstCalc.taxableValue,
        gstRate: item.gstRate || product.gstRate || 18,
        cgstRate: gstCalc.cgstRate,
        sgstRate: gstCalc.sgstRate,
        igstRate: gstCalc.igstRate,
        cgstAmount: gstCalc.cgstAmount,
        sgstAmount: gstCalc.sgstAmount,
        igstAmount: gstCalc.igstAmount,
        totalAmount: gstCalc.totalAmount
      });
      
      subtotal += gstCalc.taxableValue;
      totalDiscount += item.discount || 0;
      totalCgst += gstCalc.cgstAmount;
      totalSgst += gstCalc.sgstAmount;
      totalIgst += gstCalc.igstAmount;
    }
    
    const totalGst = totalCgst + totalSgst + totalIgst;
    const grandTotal = subtotal + totalGst;
    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalTotal = Math.round(grandTotal);
    
    const invoice = new Invoice({
      invoiceNo: generateInvoiceNumber(new Date().getFullYear()),
      invoiceDate: new Date(),
      customer: customerDoc?._id || customerFromRegular?._id,
      customerName: finalCustomerName,
      customerGstin: finalCustomerGstin,
      billingAddress: finalBillingAddress,
      shippingAddress: finalBillingAddress,
      items: processedItems,
      subtotal,
      totalDiscount,
      totalTaxableValue: subtotal,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGst,
      roundOff,
      grandTotal: finalTotal,
      paymentMode: paymentMode || 'cash',
      paymentStatus: paymentMode === 'credit' ? 'credit' : 'paid',
      amountPaid: paymentMode === 'credit' ? 0 : finalTotal,
      balanceDue: paymentMode === 'credit' ? finalTotal : 0,
      remarks,
      status: 'draft',
      warehouse: warehouse._id,
      createdBy: req.body.createdBy // User ID
    });
    
    await invoice.save();
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Finalize invoice (reduces stock)
app.put('/api/invoices/:id/finalize', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    if (invoice.status === 'finalized') {
      return res.status(400).json({ error: 'Invoice already finalized' });
    }
    
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot finalize cancelled invoice' });
    }
    
    // Reduce stock for each item and create ledger entries
    const userId = req.body.userId || 'system';
    
    // Ensure we have a valid warehouse
    let warehouseId = invoice.warehouse;
    if (!warehouseId) {
      // Try to get default warehouse or create one
      let warehouse = await Warehouse.findOne({ isActive: true });
      if (!warehouse) {
        warehouse = new Warehouse({
          name: 'Main Store',
          code: 'MAIN',
          address: 'Tubhyam Store',
          city: 'Mumbai',
          state: 'Maharashtra',
          isActive: true,
          isDefault: true
        });
        await warehouse.save();
      }
      warehouseId = warehouse._id;
      invoice.warehouse = warehouseId;
      await invoice.save();
    }
    
    // Get or create a system user for ledger entries
    let systemUser = await User.findOne({ username: 'system' });
    if (!systemUser) {
      systemUser = new User({
        username: 'system',
        password: 'system123',
        name: 'System',
        role: 'admin'
      });
      await systemUser.save();
    }
    const ledgerCreatedBy = userId === 'system' || userId === 'admin' ? systemUser._id : userId;
    
    for (const item of invoice.items) {
      // Validate item has required fields
      if (!item.product) {
        console.log('Skipping item without product reference:', item);
        continue;
      }
      if (!item.quantity || isNaN(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity for item: ${item.name || item.sku}` });
      }
      
      const product = await Product.findById(item.product);
      if (!product) {
        console.log('Product not found for item:', item.sku);
        continue;
      }
      
      // Calculate new stock
      const newStock = product.currentStock - item.quantity;
      let newStatus = 'in-stock';
      if (newStock === 0) newStatus = 'out-of-stock';
      else if (newStock <= product.reorderPoint) newStatus = 'low-stock';
      
      // Update product stock
      await Product.findByIdAndUpdate(product._id, {
        $inc: { currentStock: -item.quantity },
        status: newStatus
      });
      
      // Create stock ledger entry
      const ledgerEntry = new StockLedger({
        product: product._id,
        sku: product.sku,
        warehouse: warehouseId,
        qtyChange: -item.quantity,
        balanceAfter: newStock,
        unitCost: product.costPrice || 0,
        totalValue: -item.quantity * (product.costPrice || 0),
        referenceType: 'sales',
        referenceId: invoice._id,
        createdBy: ledgerCreatedBy,
        remarks: `Invoice ${invoice.invoiceNo} - ${product.name}`
      });
      await ledgerEntry.save();
    }
    
    // Update invoice status
    invoice.status = 'finalized';
    invoice.finalizedAt = new Date();
    await invoice.save();
        
    // Update customer totals - try BillingCustomer first, then regular Customer
    try {
      await BillingCustomer.findByIdAndUpdate(invoice.customer, {
        $inc: {
          totalOrders: 1,
          totalSpent: invoice.grandTotal,
          outstandingAmount: invoice.balanceDue
        }
      });
    } catch(e) {
      // If not in BillingCustomer, try regular Customer
      try {
        await Customer.findByIdAndUpdate(invoice.customer, {
          $inc: {
            totalOrders: 1,
            totalSpent: invoice.grandTotal
          }
        });
      } catch(e2) {
        console.log('Could not update customer totals:', e2.message);
      }
    }
        
    res.json({ message: 'Invoice finalized successfully', invoice });
  } catch (error) {
    console.error('Finalize invoice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const { status, customer, startDate, endDate } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (startDate && endDate) {
      query.invoiceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const invoices = await Invoice.find(query)
      .populate('customer', 'name phone gstin')
      .populate('warehouse', 'name code')
      .sort({ invoiceDate: -1 });
    
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single invoice
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'name phone email gstin billingAddress shippingAddress')
      .populate('warehouse', 'name code address city state pincode')
      .populate('items.product', 'name category hsn gstRate barcode images');
    
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel invoice
app.put('/api/invoices/:id/cancel', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    if (invoice.status === 'cancelled') {
      return res.status(400).json({ error: 'Invoice already cancelled' });
    }
    
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancelReason = req.body.reason || 'Cancelled by user';
    await invoice.save();
    
    res.json({ message: 'Invoice cancelled', invoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stock ledger
app.get('/api/stock-ledger', async (req, res) => {
  try {
    const { product, warehouse, referenceType, startDate, endDate } = req.query;
    const query = {};
    
    if (product) query.product = product;
    if (warehouse) query.warehouse = warehouse;
    if (referenceType) query.referenceType = referenceType;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const ledger = await StockLedger.find(query)
      .populate('product', 'name sku category')
      .populate('warehouse', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add opening stock (manual entry)
app.post('/api/stock/opening', async (req, res) => {
  try {
    const { sku, warehouseId, quantity, unitCost, batchNo, mfgDate, expiryDate, reason } = req.body;
    
    if (!sku || !warehouseId || !quantity || !unitCost) {
      return res.status(400).json({ error: 'SKU, warehouse, quantity, and cost are required' });
    }
    
    const product = await Product.findOne({ sku });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });
    
    // Update product stock
    const newStock = product.currentStock + quantity;
    await Product.findByIdAndUpdate(product._id, {
      $inc: { currentStock: quantity },
      costPrice: unitCost
    });
    
    // Create ledger entry
    const ledger = new StockLedger({
      product: product._id,
      sku: product.sku,
      warehouse: warehouse._id,
      qtyChange: quantity,
      balanceAfter: newStock,
      unitCost,
      totalValue: quantity * unitCost,
      referenceType: 'opening',
      referenceId: `OPENING-${Date.now()}`,
      batchNo,
      mfgDate,
      expiryDate,
      createdBy: req.body.userId || 'admin',
      reason: reason || 'Opening stock entry'
    });
    await ledger.save();
    
    res.json({ message: 'Opening stock added', ledger, newStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock adjustment
app.post('/api/stock/adjust', async (req, res) => {
  try {
    const { sku, warehouseId, qtyChange, reason, userId } = req.body;
    
    if (!sku || !warehouseId || !qtyChange || !reason) {
      return res.status(400).json({ error: 'SKU, warehouse, quantity change, and reason are required' });
    }
    
    const product = await Product.findOne({ sku });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });
    
    const newStock = product.currentStock + qtyChange;
    
    // Check for negative stock
    if (newStock < 0) {
      return res.status(400).json({ 
        error: 'Cannot adjust to negative stock. Current: ' + product.currentStock,
        currentStock: product.currentStock
      });
    }
    
    await Product.findByIdAndUpdate(product._id, {
      $inc: { currentStock: qtyChange }
    });
    
    const ledger = new StockLedger({
      product: product._id,
      sku: product.sku,
      warehouse: warehouse._id,
      qtyChange,
      balanceAfter: newStock,
      unitCost: product.costPrice,
      totalValue: qtyChange * product.costPrice,
      referenceType: 'adjustment',
      referenceId: `ADJ-${Date.now()}`,
      reason,
      createdBy: userId || 'admin'
    });
    await ledger.save();
    
    res.json({ message: 'Stock adjusted', ledger, newStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXCEL IMPORT ROUTES ====================

// Import products from Excel
app.post('/api/import/products', async (req, res) => {
  try {
    const { data } = req.body; // Excel data as array of objects
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const results = {
      success: [],
      errors: []
    };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (header is row 1)
      
      try {
        // Validate required fields
        if (!row.SKU || !row.ProductName || !row.Unit || !row.SalePrice) {
          throw new Error('Missing required fields: SKU, ProductName, Unit, or SalePrice');
        }
        
        const productData = {
          sku: row.SKU.toUpperCase(),
          name: row.ProductName,
          category: row.Category?.toLowerCase() || 'formal',
          hsn: row.HSN || '',
          gstRate: row.GST ? parseFloat(row.GST) : 18,
          unit: row.Unit || 'pcs',
          barcode: row.Barcode || '',
          costPrice: parseFloat(row.PurchasePrice || row.CostPrice || 0),
          sellingPrice: parseFloat(row.SalePrice),
          mrp: parseFloat(row.MRP || row.SalePrice),
          minStock: parseInt(row.MinStock || 10),
          maxStock: parseInt(row.MaxStock || 100),
          reorderPoint: parseInt(row.ReorderPoint || 15),
          description: row.Description || '',
          isFinishedGoods: true,
          isRawMaterial: row.IsRawMaterial === 'Yes' || row.IsRawMaterial === true
        };
        
        // Upsert product
        const product = await Product.findOneAndUpdate(
          { sku: productData.sku },
          productData,
          { upsert: true, new: true, runValidators: true }
        );
        
        results.success.push({ sku: product.sku, id: product._id, action: row.SKU ? 'updated' : 'created' });
      } catch (error) {
        results.errors.push({
          row: rowNum,
          sku: row.SKU || 'N/A',
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Imported ${results.success.length} products`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import opening stock from Excel
app.post('/api/import/opening-stock', async (req, res) => {
  try {
    const { data, warehouseId, userId } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    if (!warehouseId) {
      return res.status(400).json({ error: 'Warehouse ID is required' });
    }
    
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) return res.status(404).json({ error: 'Warehouse not found' });
    
    const results = { success: [], errors: [] };
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      
      try {
        if (!row.SKU || !row.Qty || !row.UnitCost) {
          throw new Error('Missing required fields: SKU, Qty, or UnitCost');
        }
        
        const product = await Product.findOne({ sku: row.SKU.toUpperCase() });
        if (!product) {
          throw new Error('Product not found');
        }
        
        const quantity = parseInt(row.Qty);
        const unitCost = parseFloat(row.UnitCost);
        
        if (quantity <= 0 || unitCost < 0) {
          throw new Error('Quantity must be > 0 and cost >= 0');
        }
        
        // Update product stock
        const newStock = product.currentStock + quantity;
        await Product.findByIdAndUpdate(product._id, {
          $inc: { currentStock: quantity },
          costPrice: unitCost
        });
        
        // Create ledger entry
        const ledger = new StockLedger({
          product: product._id,
          sku: product.sku,
          warehouse: warehouse._id,
          qtyChange: quantity,
          balanceAfter: newStock,
          unitCost,
          totalValue: quantity * unitCost,
          referenceType: 'opening',
          referenceId: `IMPORT-OPENING-${Date.now()}`,
          batchNo: row.BatchNo || '',
          mfgDate: row.MFGDate ? new Date(row.MFGDate) : null,
          expiryDate: row.ExpiryDate ? new Date(row.ExpiryDate) : null,
          createdBy: userId || 'admin',
          remarks: 'Opening stock import'
        });
        await ledger.save();
        
        results.success.push({
          sku: product.sku,
          name: product.name,
          quantity,
          newStock,
          ledgerId: ledger._id
        });
      } catch (error) {
        results.errors.push({
          row: rowNum,
          sku: row.SKU || 'N/A',
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Imported ${results.success.length} stock entries`,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== INVOICE PDF GENERATION ====================

app.get('/api/invoices/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer')
      .populate('warehouse');
    
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    
    // Logo path
    const logoPath = path.join(__dirname, '../src/assets/looo.png');
    
    // Create PDF - A4 size with compact margins
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: `Invoice ${invoice.invoiceNo}`,
        Author: 'TUBHYAM'
      }
    });
    const buffers = [];
    
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res
        .setHeader('Content-Type', 'application/pdf')
        .setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNo}.pdf`)
        .send(pdfData);
    });
    
    // Colors
    const primaryColor = '#1a1a2e';
    const accentColor = '#e94560';
    const grayColor = '#666666';
    
    // ===== HEADER WITH LOGO =====
    let y = 40;
    
    // Try to add logo
    try {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, y, { width: 60, height: 60 });
      }
    } catch(e) {
      console.log('Logo not found, using text header');
    }
    
    // Company name next to logo
    doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold');
    doc.text('TUBHYAM', 110, y + 10);
    doc.fontSize(9).fillColor(grayColor).font('Helvetica');
    doc.text('Premium Fashion Store', 110, y + 35);
    
    // Invoice details on right
    doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold');
    doc.text('TAX INVOICE', 400, y, { align: 'right', width: 150 });
    doc.fontSize(8).fillColor(grayColor).font('Helvetica');
    doc.text(`Invoice No: ${invoice.invoiceNo}`, 400, y + 15, { align: 'right', width: 150 });
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, 400, y + 28, { align: 'right', width: 150 });
    
    y += 75;
    
    // ===== HORIZONTAL LINE =====
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#e0e0e0').lineWidth(1).stroke();
    y += 15;
    
    // ===== CUSTOMER DETAILS =====
    doc.fontSize(8).fillColor(grayColor).font('Helvetica-Bold');
    doc.text('BILL TO:', 40, y);
    doc.fontSize(10).fillColor(primaryColor).font('Helvetica-Bold');
    doc.text(invoice.customerName || 'Customer', 40, y + 12);
    doc.fontSize(8).fillColor(grayColor).font('Helvetica');
    if (invoice.customerGstin) {
      doc.text(`GSTIN: ${invoice.customerGstin}`, 40, y + 26);
      y += 40;
    } else {
      y += 28;
    }
    if (invoice.billingAddress) {
      const addr = invoice.billingAddress;
      doc.text(`${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`, 40, y);
      y += 12;
    }
    
    y += 10;
    
    // ===== ITEMS TABLE =====
    // Table header background
    doc.rect(40, y, 515, 22).fillColor('#f5f5f5').fill();
    
    doc.fontSize(8).fillColor(primaryColor).font('Helvetica-Bold');
    doc.text('Item', 45, y + 6, { width: 150 });
    doc.text('HSN', 170, y + 6, { width: 50 });
    doc.text('Qty', 225, y + 6, { width: 30, align: 'center' });
    doc.text('Rate', 260, y + 6, { width: 60, align: 'right' });
    doc.text('Disc', 325, y + 6, { width: 50, align: 'right' });
    doc.text('Taxable', 380, y + 6, { width: 60, align: 'right' });
    doc.text('GST', 445, y + 6, { width: 50, align: 'right' });
    doc.text('Total', 500, y + 6, { width: 50, align: 'right' });
    
    y += 22;
    
    // Table rows
    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    let rowNum = 0;
    for (const item of invoice.items) {
      // Alternate row background
      if (rowNum % 2 === 0) {
        doc.rect(40, y, 515, 18).fillColor('#fafafa').fill();
      }
      
      doc.fillColor('#333333');
      doc.text(item.name || item.sku, 45, y + 5, { width: 150 });
      doc.text(item.hsn || '-', 170, y + 5, { width: 50 });
      doc.text(String(item.quantity || 1), 225, y + 5, { width: 30, align: 'center' });
      doc.text(`₹${(item.rate || 0).toFixed(0)}`, 260, y + 5, { width: 60, align: 'right' });
      doc.text(`₹${(item.discount || 0).toFixed(0)}`, 325, y + 5, { width: 50, align: 'right' });
      doc.text(`₹${(item.taxableValue || 0).toFixed(0)}`, 380, y + 5, { width: 60, align: 'right' });
      const gstAmt = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
      doc.text(`₹${gstAmt.toFixed(0)}`, 445, y + 5, { width: 50, align: 'right' });
      doc.text(`₹${(item.totalAmount || 0).toFixed(0)}`, 500, y + 5, { width: 50, align: 'right' });
      
      y += 18;
      rowNum++;
    }
    
    // ===== TOTALS SECTION =====
    y += 5;
    doc.moveTo(350, y).lineTo(555, y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
    y += 8;
    
    doc.fontSize(8).font('Helvetica').fillColor('#333333');
    
    // Subtotal
    doc.text('Subtotal:', 380, y, { width: 70, align: 'right' });
    doc.text(`₹${(invoice.subtotal || 0).toFixed(2)}`, 500, y, { width: 50, align: 'right' });
    y += 14;
    
    // CGST + SGST (Intra-state)
    if (invoice.totalCgst > 0 || invoice.totalSgst > 0) {
      const gstRate = invoice.items[0]?.gstRate || 18;
      doc.text(`CGST (${gstRate / 2}%):`, 380, y, { width: 70, align: 'right' });
      doc.text(`₹${(invoice.totalCgst || 0).toFixed(2)}`, 500, y, { width: 50, align: 'right' });
      y += 12;
      doc.text(`SGST (${gstRate / 2}%):`, 380, y, { width: 70, align: 'right' });
      doc.text(`₹${(invoice.totalSgst || 0).toFixed(2)}`, 500, y, { width: 50, align: 'right' });
      y += 12;
    }
    
    // IGST (Inter-state)
    if (invoice.totalIgst > 0) {
      const gstRate = invoice.items[0]?.gstRate || 18;
      doc.text(`IGST (${gstRate}%):`, 380, y, { width: 70, align: 'right' });
      doc.text(`₹${(invoice.totalIgst || 0).toFixed(2)}`, 500, y, { width: 50, align: 'right' });
      y += 12;
    }
    
    // Grand Total
    y += 3;
    doc.rect(350, y, 205, 20).fillColor(primaryColor).fill();
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Grand Total:', 380, y + 5, { width: 70, align: 'right' });
    doc.text(`₹${(invoice.grandTotal || 0).toFixed(0)}`, 500, y + 5, { width: 50, align: 'right' });
    y += 30;
    
    // ===== PAYMENT INFO =====
    doc.fontSize(8).fillColor(grayColor).font('Helvetica');
    doc.text(`Payment Mode: ${(invoice.paymentMode || 'cash').toUpperCase()}`, 40, y);
    doc.text(`Status: ${invoice.paymentStatus || 'Paid'}`, 200, y);
    y += 20;
    
    // ===== FOOTER =====
    y += 10;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
    y += 10;
    
    doc.fontSize(8).fillColor(grayColor).font('Helvetica-Oblique');
    doc.text('Thank you for your business!', 40, y, { align: 'center', width: 515 });
    y += 12;
    doc.fontSize(7);
    doc.text('Terms & Conditions apply. This is a computer generated invoice.', 40, y, { align: 'center', width: 515 });
    
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REPORTING ROUTES ====================

// Stock on hand report
app.get('/api/reports/stock-on-hand', async (req, res) => {
  try {
    const { warehouse, category } = req.query;
    const query = {};
    
    if (warehouse) query.warehouse = warehouse;
    if (category) query.category = category;
    
    const products = await Product.find(query)
      .populate('warehouse', 'name code')
      .sort({ category: 1, name: 1 });
    
    const stockReport = products.map(p => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      currentStock: p.currentStock,
      unit: p.unit,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      totalValue: p.currentStock * p.costPrice,
      status: p.status,
      warehouse: p.warehouse?.name
    }));
    
    const totalInventoryValue = stockReport.reduce((sum, item) => sum + item.totalValue, 0);
    
    res.json({
      stockReport,
      totalInventoryValue,
      totalProducts: stockReport.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Low stock report
app.get('/api/reports/low-stock', async (req, res) => {
  try {
    const products = await Product.find({
      $or: [
        { currentStock: { $lte: '$reorderPoint' } },
        { currentStock: { $lte: '$minStock' } },
        { status: { $in: ['low-stock', 'out-of-stock'] } }
      ]
    }).sort({ currentStock: 1 });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sales report
app.get('/api/reports/sales', async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    const query = {};
    
    if (productId) query.productId = productId;
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const sales = await SalesHistory.find(query)
      .populate('productId', 'name sku category')
      .sort({ saleDate: -1 });
    
    const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
    const totalUnits = sales.reduce((sum, s) => sum + s.quantitySold, 0);
    
    res.json({
      sales,
      summary: {
        totalRevenue,
        totalUnits,
        averageOrderValue: totalUnits > 0 ? totalRevenue / totalUnits : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Profit report
app.get('/api/reports/profit', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    
    if (startDate && endDate) {
      query.saleDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const sales = await SalesHistory.find(query).populate('productId');
    
    const profitData = sales.map(sale => {
      const product = sale.productId;
      const revenue = sale.revenue;
      const cost = product ? product.costPrice * sale.quantitySold : 0;
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      return {
        productName: product?.name || 'Unknown',
        sku: product?.sku || 'N/A',
        quantity: sale.quantitySold,
        revenue,
        cost,
        profit,
        profitMargin: profitMargin.toFixed(2) + '%',
        saleDate: sale.saleDate
      };
    });
    
    const totalRevenue = profitData.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = profitData.reduce((sum, p) => sum + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    res.json({
      profitData,
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        overallMargin: overallMargin.toFixed(2) + '%'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CRON JOBS ====================

// Daily check for low stock and send alerts
cron.schedule('0 9 * * *', async () => {
  console.log('🔄 Running daily inventory check...');
  
  const lowStockProducts = await Product.find({ 
    $or: [
      { currentStock: { $lte: '$reorderPoint' } },
      { status: 'low-stock' }
    ]
  }).populate('supplier');

  for (const product of lowStockProducts) {
    if (product.supplier && product.supplier.status === 'active') {
      // Create alert
      const alert = new Alert({
        type: product.currentStock === 0 ? 'out-of-stock' : 'low-stock',
        productId: product._id,
        supplierId: product.supplier._id,
        title: product.currentStock === 0 ? 'Out of Stock' : 'Low Stock Alert',
        message: `${product.name} needs restocking. Current: ${product.currentStock}`,
        severity: product.currentStock === 0 ? 'critical' : 'high'
      });
      
      await alert.save();

      // Send WhatsApp
      if (product.currentStock === 0) {
        await whatsappService.sendOutOfStockAlert(product, product.supplier);
      } else {
        await whatsappService.sendLowStockAlert(product, product.supplier);
      }
    }
  }

  console.log('✅ Daily check completed');
});

// Weekly AI predictions
cron.schedule('0 10 * * 1', async () => {
  console.log('🤖 Generating weekly AI predictions...');
  
  const products = await Product.find().populate('supplier');
  
  for (const product of products) {
    const prediction = await demandPredictor.predictDemand(product._id);
    
    await Product.findByIdAndUpdate(product._id, {
      predictedDemand: prediction.predictedDemand,
      aiRecommendation: prediction.recommendation
    });

    // Send prediction alert if high demand expected
    if (prediction.predictedDemand > 20 && product.supplier) {
      await whatsappService.sendPredictionAlert(product, prediction, product.supplier);
    }
  }

  console.log('✅ Predictions generated');
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`🚀 Tubhyam Inventory AI Server running on port ${PORT}`);
  console.log(`📊 Dashboard:  http://localhost:${PORT}`);
  console.log(`📷 Scanner:    http://localhost:${PORT}/scanner.html`);
  console.log(`📱 WhatsApp QR: http://localhost:${PORT}/whatsapp/qr`);
});
