# 🚀 Inventory-Based Billing System - Setup Guide

## Overview
This implementation adds complete **GST-Ready Inventory-Based Billing** functionality to your existing Tubhyam inventory management system, following the blueprint specifications.

---

## ✅ What's Been Added

### 1. **Database Schemas** (models/Schemas.js)
- **Warehouse**: Multi-location inventory tracking
- **StockLedger**: Live stock engine with transaction history
- **BillingCustomer**: Enhanced customer management with GST
- **Invoice**: GST-compliant invoicing with auto-tax calculation
- **User**: Role-based access control
- **PurchaseOrder**: Vendor purchase management
- **BOM & ProductionOrder**: Manufacturing support (optional)
- **Enhanced Product**: Added HSN, GST rate, barcode, batch tracking

### 2. **Backend API Routes** (server.js)

#### Billing & Invoicing
- `POST /api/invoices` - Create draft invoice
- `PUT /api/invoices/:id/finalize` - Finalize & reduce stock
- `GET /api/invoices` - List invoices with filters
- `GET /api/invoices/:id/pdf` - Download GST invoice PDF
- `PUT /api/invoices/:id/cancel` - Cancel invoice

#### Customer Management
- `GET /api/billing-customers` - Get all customers
- `POST /api/billing-customers` - Add new customer
- `PUT /api/billing-customers/:id` - Update customer

#### Warehouse Management
- `GET /api/warehouses` - Get all warehouses
- `POST /api/warehouses` - Add warehouse

#### Stock Ledger (Live Inventory)
- `GET /api/stock-ledger` - View all stock transactions
- `POST /api/stock/opening` - Add opening stock
- `POST /api/stock/adjust` - Manual stock adjustment

#### Excel Import
- `POST /api/import/products` - Bulk import products
- `POST /api/import/opening-stock` - Bulk import stock

#### Reports
- `GET /api/reports/stock-on-hand` - Current inventory value
- `GET /api/reports/low-stock` - Low stock alerts
- `GET /api/reports/sales` - Sales analytics
- `GET /api/reports/profit` - Profit margin analysis

### 3. **Frontend Pages** (public/index.html)

#### Navigation Tabs Added
- **Billing** - Create GST invoices
- **Invoices** - View/manage invoices
- **Stock Ledger** - Track all stock movements
- **Import** - Bulk upload from Excel
- **Reports** - Business analytics

#### Features
- Real-time stock validation during billing
- Auto GST calculation (CGST/SGST/IGST)
- Invoice PDF generation
- Stock adjustment with audit trail
- Excel import with validation
- Comprehensive reporting

---

## 🔧 Setup Instructions

### Step 1: Install Dependencies

```bash
cd tubhyamoffical/inventory-app
npm install xlsx pdfkit
```

### Step 2: Update Environment Variables

Your `.env` file should have:
```env
MONGODB_URI=your_mongodb_connection_string
PORT=3002
NODE_ENV=development
FRONTEND_URL=http://localhost:3002
```

### Step 3: Seed Default Warehouse

Run this in MongoDB or via a temporary route:

```javascript
// Add to server.js temporarily or run as script
const warehouse = new Warehouse({
  name: 'Main Warehouse',
  code: 'WH-MAIN',
  address: 'Your warehouse address',
  city: 'Your city',
  state: 'Maharashtra',
  pincode: '400001',
  contactPerson: 'Manager',
  phone: '1234567890',
  isActive: true,
  isDefault: true
});
await warehouse.save();
```

Or use MongoDB Compass/CLI:
```javascript
db.warehouses.insertOne({
  name: "Main Warehouse",
  code: "WH-MAIN",
  address: "Your address",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  isActive: true,
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

### Step 4: Start the Server

```bash
npm start
```

The app will run on `http://localhost:3002`

---

## 📋 How to Use

### 1. **Create Your First Invoice**

1. Click **Billing** tab
2. Select customer (or add new ones via Customers page)
3. Select warehouse
4. Click **+ Add Item**
5. Search product by SKU/name
6. Enter quantity, rate, discount
7. Select GST rate (auto-filled from product)
8. Add more items if needed
9. Click **Save Draft** (optional)
10. Click **Finalize & Generate PDF**
    - Stock reduces automatically
    - Invoice PDF downloads
    - Customer record updates

### 2. **View Stock Ledger**

1. Click **Stock Ledger** tab
2. See all stock movements:
   - Opening stock entries
   - Sales deductions
   - Purchase additions
   - Adjustments
3. Filter by product or transaction type
4. Click **Adjust Stock** for manual changes

### 3. **Import Products from Excel**

1. Click **Import** tab
2. Download template
3. Fill in your product data in Excel
4. Copy and paste into the text area
5. Click **Import Data**
6. Review success/error report

**Product Template Format:**
```csv
SKU,ProductName,Category,HSN,GST,Unit,SalePrice,PurchasePrice,Barcode,Description
PROD-001,Premium Shirt,formal,6105,18,pcs,999,750,8901234567890,Formal shirt
```

### 4. **Generate Reports**

1. Click **Reports** tab
2. Choose report type:
   - **Stock on Hand**: Current inventory value
   - **Low Stock Alert**: Items needing reorder
   - **Sales Report**: Revenue analytics
   - **Profit Report**: Margin analysis
3. View interactive tables with totals

---

## 🎯 Key Features

### Live Stock Engine
- **Never manually overwrite stock** - All changes via transactions
- **Real-time calculation** - Stock = Sum of all ledger entries
- **Automatic deduction** - Every invoice reduces stock instantly
- **Audit trail** - Every change tracked with reason

### GST Compliance
- **Auto tax calculation** - CGST/SGST for intrastate, IGST for interstate
- **HSN codes** - Product classification
- **GST invoices** - Ready for printing/sharing
- **Tax reports** - Total GST collected/payable

### Negative Stock Prevention
- **Validation before finalize** - Blocks insufficient stock
- **Role-based override** - Admin can allow negative with reason
- **Configurable policy** - Set per warehouse

### Multi-Warehouse Support
- **Track per location** - Separate stock for each warehouse
- **Transfer tracking** - Stock transfers between locations
- **Location-based reports** - See stock by warehouse

---

## 📊 Data Flow

### Invoice Creation Flow
```
1. User creates invoice → Draft status
2. Add items → Validates stock availability
3. Calculate GST → Based on customer state
4. Save draft → No stock change yet
5. Finalize → Creates stock ledger entries
              ↓
         Reduces product.currentStock
              ↓
         Generates invoice number
              ↓
         Creates PDF
              ↓
         Updates customer totals
```

### Stock Ledger Entry Types
- `+opening` - Initial stock setup
- `+purchase` - Stock received from vendor
- `-sales` - Stock sold via invoice
- `-adjustment` - Manual correction
- `+production-output` - Finished goods from manufacturing
- `-production-consume` - Raw materials consumed
- `±transfer-in/out` - Between warehouses

---

## 🔒 Security & Roles

### Default User Roles (from blueprint)
- **Admin**: Full access including stock override
- **Accounts**: Invoices, payments, GST compliance
- **Inventory Manager**: Stock adjustments, imports, warehouse
- **Production Supervisor**: BOM, production orders
- **Viewer**: Read-only reports

### Audit Trail
Every stock change logs:
- User who made the change
- Timestamp
- Reason/remarks
- Before/after values
- Reference document (invoice ID, PO number, etc.)

---

## 📱 Mobile/Scanner Integration

### Barcode Scanning
The existing scanner page now supports:
- Scan to add items to invoice
- Scan to check stock levels
- Scan to record sales

Simply navigate to **Scanner** tab and scan product barcodes.

---

## 🧪 Testing Checklist

### Test Scenarios

- [ ] Create a draft invoice
- [ ] Finalize invoice (check stock reduces)
- [ ] Try to finalize with insufficient stock (should block)
- [ ] Cancel an invoice
- [ ] Download invoice PDF
- [ ] Add opening stock via import
- [ ] Adjust stock manually
- [ ] View stock ledger entries
- [ ] Generate low stock report
- [ ] Generate profit report
- [ ] Import products from Excel
- [ ] Create new customer with GSTIN
- [ ] Add multiple warehouses

---

## 🐛 Troubleshooting

### "MongoDB not connected"
- Check your `.env` file has correct MongoDB URI
- Ensure MongoDB Atlas allows your IP

### "Warehouse not found"
- Run the warehouse seed script above
- Or add warehouse via MongoDB Compass

### "PDF not downloading"
- Check browser popup blocker settings
- Ensure server is running on correct port

### "Excel import failing"
- Ensure CSV format matches template exactly
- Check for special characters in data
- Verify required fields: SKU, ProductName, Unit, SalePrice

---

## 📈 Next Steps (Phase 2)

From the blueprint, these can be added next:

1. **Production Module**
   - Bill of Materials (BOM) creation
   - Raw material consumption tracking
   - Finished goods output

2. **Advanced Features**
   - Barcode printing
   - WhatsApp invoice sharing
   - Tally/Zoho export
   - e-Invoice/e-Waybill integration

3. **Mobile App**
   - Inventory counting
   - Billing on-the-go
   - Barcode scanning

---

## 📞 Support

For issues or questions:
- Check the blueprint PDF for business logic
- Review schema definitions in `models/Schemas.js`
- Check API routes in `server.js`
- Inspect frontend code in `public/index.html`

---

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Creating invoice reduces stock automatically
- ✅ Stock ledger shows every transaction
- ✅ PDF invoices generate with GST details
- ✅ Excel import creates/updates products
- ✅ Reports show accurate profit margins
- ✅ Low stock alerts appear correctly

---

**Built according to Tubhyam.in Inventory-Based Billing Software Blueprint**
*Mass Production • Live Stock Engine • GST-Ready • India-Made*
