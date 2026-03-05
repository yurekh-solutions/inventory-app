# 🚀 Tubhyam Inventory AI - Complete Inventory Management System

**AI-Powered Inventory Management for Clothing Brands**  
*WhatsApp Alerts • Supplier Management • Demand Prediction*

---

## ✨ Features

### 📦 **Inventory Management**
- Real-time stock tracking
- Size and color variants
- Automatic status updates (In Stock, Low Stock, Out of Stock)
- SKU management

### 🤖 **AI Predictions**
- Demand forecasting using machine learning
- Seasonal trend analysis
- Stock recommendations
- Sales velocity tracking

### 💬 **WhatsApp Alerts**
- Low stock notifications
- Out of stock urgent alerts
- AI prediction updates
- Restock reminders to suppliers

### 👥 **Supplier Management**
- Complete contact database
- WhatsApp integration
- Performance tracking
- Product-supplier linking

### 📊 **Analytics Dashboard**
- Sales tracking
- Revenue reports
- Stock insights
- Weekly trends

---

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- MongoDB (Database)
- Mongoose (ODM)
- Socket.IO (Real-time)

**AI/ML:**
- Custom demand prediction algorithms
- Seasonal analysis
- Trend detection

**Integrations:**
- Twilio (WhatsApp API)
- Node-Cron (Scheduled tasks)

---

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
   ```bash
   node --version
   ```

2. **MongoDB** (Local or Atlas)
   - Local: Install MongoDB Community Server
   - Cloud: MongoDB Atlas free tier

3. **Twilio Account** (Optional - for WhatsApp)
   - Sign up at https://twilio.com

---

## 🚀 Installation

### 1. Install Dependencies
```bash
cd inventory-app
npm install
```

### 2. Setup Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials
```

**Required in `.env`:**
```env
MONGODB_URI=mongodb://localhost:27017/tubhyam-inventory
PORT=3001

# Optional - WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 3. Start MongoDB
**Windows:**
```bash
net start MongoDB
```

**Mac/Linux:**
```bash
sudo systemctl start mongod
```

### 4. Run the Application

**Development Mode:**
```bash
# Terminal 1 - Backend Server
npm run dev

# Terminal 2 - Frontend (if separate)
# Coming soon...
```

---

## 📱 Usage Guide

### Add Your First Product

**Via API:**
```javascript
POST http://localhost:3001/api/products

{
  "sku": "FP-001-BLK",
  "name": "Premium Black Formal Pants",
  "category": "formal",
  "currentStock": 50,
  "minStock": 10,
  "maxStock": 100,
  "reorderPoint": 15,
  "sizes": [
    { "size": "M", "stock": 15, "salesVelocity": 5 },
    { "size": "L", "stock": 20, "salesVelocity": 8 },
    { "size": "XL", "stock": 15, "salesVelocity": 6 }
  ],
  "colors": [
    { "color": "Black", "stock": 50, "salesVelocity": 19 }
  ],
  "costPrice": 800,
  "sellingPrice": 1499
}
```

### Add a Supplier

```javascript
POST http://localhost:3001/api/suppliers

{
  "name": "Delhi Garments Ltd",
  "contactPerson": "Rajesh Kumar",
  "email": "rajesh@delhigarments.com",
  "phone": "+919876543210",
  "whatsappNumber": "+919876543210",
  "address": "123 Industrial Area",
  "city": "New Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "gstNumber": "07AABCU1234A1Z5"
}
```

### Record a Sale

```javascript
POST http://localhost:3001/api/sales

{
  "productId": "65e1234567890abcdef12345",
  "quantitySold": 2,
  "revenue": 2998,
  "size": "L",
  "color": "Black"
}
```

---

## 🔔 WhatsApp Alerts

### Automatic Alerts

The system automatically sends:

1. **Low Stock Alert** (Daily at 9 AM)
   ```
   🚨 LOW STOCK ALERT
   
   Product: Premium Black Formal Pants
   SKU: FP-001-BLK
   Current Stock: 8 units
   Reorder Point: 15 units
   
   ⚠️ Please restock soon!
   ```

2. **Out of Stock - URGENT**
   ```
   🔴 OUT OF STOCK - URGENT!
   
   Product: Premium Black Formal Pants
   Status: SOLD OUT
   
   ❗ Immediate restocking required!
   ```

3. **AI Demand Prediction** (Weekly on Monday 10 AM)
   ```
   🤖 AI DEMAND PREDICTION
   
   Predicted Demand: 25 units/week
   Confidence: 85%
   Trend: +15%
   
   💡 High demand expected! Consider restocking 50 units
   ```

### Manual Test Message

```javascript
POST http://localhost:3001/api/whatsapp/test

{
  "toNumber": "+919876543210",
  "message": "Test message from Tubhyam Inventory"
}
```

---

## 📊 API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get single supplier
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Alerts
- `GET /api/alerts` - Get all alerts
- `PUT /api/alerts/:id/read` - Mark as read

### AI Predictions
- `GET /api/predictions` - Get all predictions
- `GET /api/predictions/:productId` - Get specific prediction

### Sales
- `POST /api/sales` - Record sale
- `GET /api/sales` - Get sales history

### Dashboard
- `GET /api/dashboard/stats` - Get overview stats

---

## 🤖 AI Prediction Features

### What It Predicts:
1. **Weekly Demand** - Units expected to sell next week
2. **Seasonal Trends** - Impact of current season
3. **Growth Trends** - Increasing/decreasing popularity
4. **Stock Recommendations** - When and how much to order

### Algorithm:
- Moving average analysis (4-week window)
- Seasonal adjustment factors
- Trend detection (percentage change)
- Confidence scoring

### Example Output:
```json
{
  "predictedDemand": 25,
  "confidence": 85,
  "trend": "+15.5",
  "season": "festive",
  "recommendation": "High demand expected! Consider restocking 50 units"
}
```

---

## 🎯 Cron Jobs (Automated Tasks)

### Daily Check (9:00 AM)
- Scans for low stock items
- Creates alerts
- Sends WhatsApp to suppliers

### Weekly Predictions (Monday 10:00 AM)
- Generates AI predictions for all products
- Updates database
- Sends high-demand alerts

---

## 📈 Dashboard Stats

Access key metrics:
```javascript
GET http://localhost:3001/api/dashboard/stats

Response:
{
  "totalProducts": 45,
  "lowStock": 8,
  "outOfStock": 2,
  "totalSuppliers": 12,
  "unreadAlerts": 5,
  "weeklyRevenue": 125000,
  "weeklySales": 85
}
```

---

## 🔧 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
net start MongoDB  # Windows
sudo systemctl status mongod  # Linux/Mac

# Restart MongoDB
net stop MongoDB && net start MongoDB
```

### WhatsApp Not Sending
1. Verify Twilio credentials in `.env`
2. Check account balance
3. Ensure WhatsApp sandbox is activated

### Port Already in Use
```bash
# Change PORT in .env to different port
PORT=3002
```

---

## 📱 Mobile App (Coming Soon)

A React Native mobile app is planned for:
- Real-time notifications
- Barcode scanning
- Quick stock updates
- Supplier chat

---

## 🎨 Frontend Dashboard (Planned)

Features will include:
- Interactive charts
- Real-time stock updates
- Drag-and-drop reordering
- Bulk operations
- Export reports

---

## 💡 Best Practices

1. **Update Stock Daily** - Record all sales
2. **Review Predictions Weekly** - Check AI recommendations
3. **Maintain Supplier Data** - Keep contacts updated
4. **Monitor Alerts** - Read and act on notifications
5. **Backup Database** - Regular MongoDB backups

---

## 📞 Support

For issues or questions:
- Email: support@tubhyam.com
- WhatsApp: +91-7039382706

---

## 📄 License

Proprietary - Tubhyam Fashion Brand

---

## 🚀 Next Steps

1. ✅ Install dependencies
2. ✅ Setup MongoDB
3. ✅ Configure `.env`
4. ✅ Run `npm run dev`
5. ✅ Add first product
6. ✅ Add first supplier
7. ✅ Record first sale
8. ✅ Receive AI predictions

---

**Built with ❤️ for Tubhyam Fashion Brand**  
*Empowering clothing brands with AI-driven inventory management*
