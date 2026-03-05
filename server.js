import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Product, Supplier, Alert, SalesHistory, Customer, Broadcast, PaymentInquiry } from './models/Schemas.js';
import { tubhyamProducts } from './data/seedProducts.js';
import { demandPredictor } from './ai/Predictor.js';
import { whatsappService } from './services/WhatsAppService.js';
import cron from 'node-cron';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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
