# 🚀 Quick Start Guide - Billing System

## ⚡ 3-Minute Setup

### 1. Install & Start
```bash
cd inventory-app
npm install xlsx pdfkit
npm start
```
Open: `http://localhost:3002`

### 2. Add Your First Warehouse (Required!)
Go to MongoDB and add:
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

### 3. Import Your Products
1. Click **Import** tab
2. Download product template
3. Fill in Excel with your products
4. Copy-paste data into text box
5. Click **Import Data**

Example CSV format:
```csv
SKU,ProductName,Category,HSN,GST,Unit,SalePrice,PurchasePrice
SHIRT-001,Premium Formal Shirt,formal,6105,18,pcs,999,750
PANT-001,Classic Track Pant,track,6103,18,pcs,799,600
```

### 4. Add Opening Stock
1. Still in **Import** tab
2. Select "Opening Stock" from dropdown
3. Select warehouse
4. Paste stock data:
```csv
SKU,Qty,UnitCost,BatchNo
SHIRT-001,100,750,BATCH-001
PANT-001,50,600,BATCH-002
```
5. Click **Import Data**

---

## 💨 Create First Invoice (60 seconds)

1. **Click Billing tab**
2. **Select Customer** → Choose from list or add new
3. **Select Warehouse** → WH-MAIN
4. **Click + Add Item**
5. **Search product** → Type SKU or name
6. **Enter details:**
   - Qty: 5
   - Rate: 999
   - Discount: 0
   - GST: 18%
7. **Click Add Item**
8. **Click Finalize & Generate PDF**

✅ **Done!** Stock reduced automatically. PDF downloaded.

---

## 📊 Daily Operations

### Morning Checklist
- [ ] Check **Dashboard** for low stock alerts
- [ ] Review **Stock Ledger** for yesterday's transactions
- [ ] Check **Invoices** for pending payments

### During Day
- Create invoices as customers order
- Scan barcodes for quick billing
- Check stock levels in real-time
- Adjust stock if needed (with reason)

### Evening Reports
1. Click **Reports** → Sales Report
2. Check daily revenue
3. Review profit margins
4. Note low stock items for reorder

---

## 🔥 Pro Tips

### Quick Customer Search
Type phone number or name in customer dropdown

### Bulk Invoice Items
Copy multiple rows from Excel and paste in Import section

### Stock Adjustment Shortcuts
Use **Stock Ledger** → Adjust Stock for quick corrections

### Invoice Templates
Save common item combinations as drafts for reuse

### Barcode Scanning
Navigate to Scanner tab → Scan product → Auto-adds to bill

---

## 🎯 Common Tasks

### Add New Customer
1. Go to **Customers** tab
2. Click **+ Add Customer**
3. Fill details:
   - Name, Phone, WhatsApp
   - Billing address
   - GSTIN (for B2B)
4. Click Save

### Check Stock History
1. Go to **Stock Ledger**
2. Search by SKU
3. See all movements:
   - When stock came in
   - When sold
   - Any adjustments

### Generate GST Report
1. Go to **Reports**
2. Click any report type
3. Export data for CA

### Reorder Alert Setup
Products automatically show in:
- Dashboard (low stock section)
- Low Stock Report
- Alerts when below reorder point

---

## ⚠️ Important Rules

### DO ✅
- Always finalize invoices same day
- Add reason for stock adjustments
- Keep customer GSTIN updated
- Review ledger weekly

### DON'T ❌
- Don't manually edit product.currentStock
- Don't delete finalized invoices (cancel instead)
- Don't allow negative stock without reason
- Don't skip warehouse selection

---

## 🆘 Quick Fixes

### "No warehouses showing"
→ Add warehouse in MongoDB (see step 2 above)

### "Can't finalize invoice"
→ Check if customer and warehouse selected
→ Ensure items added to bill

### "Stock not reducing"
→ Make sure you clicked **Finalize**, not just Save Draft

### "PDF not downloading"
→ Check browser popup blocker
→ Allow popups for localhost:3002

### "Import failing"
→ Check CSV format matches template exactly
→ Ensure no empty cells in required columns

---

## 📱 Mobile Use

The app works on mobile browsers:
- Create invoices on-the-go
- Scan barcodes with phone camera
- Check stock anytime
- Send payment links via WhatsApp

---

## 🎉 Success!

You're ready when:
- ✅ Warehouse created
- ✅ Products imported
- ✅ Opening stock added
- ✅ Test invoice created
- ✅ PDF downloaded
- ✅ Stock ledger shows entries

**Next:** Explore advanced features like:
- Multi-warehouse transfers
- Production/BOM management
- Advanced profit reports
- Customer payment tracking

---

**Need Help?** Check `BILLING_SETUP.md` for detailed documentation.
