# 🚀 Quick Start - Tubhyam Inventory AI

## Step-by-Step Setup (5 Minutes)

### 1️⃣ Install Node.js
Download from: https://nodejs.org/en/download/

### 2️⃣ Install MongoDB
**Windows:** Download MongoDB Community Server
**Mac:** `brew install mongodb-community`
**Linux:** `sudo apt-get install mongodb`

### 3️⃣ Setup Project
```bash
cd inventory-app

# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Edit .env with your settings
notepad .env
```

### 4️⃣ Start MongoDB
**Windows:**
```bash
net start MongoDB
```

**Mac/Linux:**
```bash
mongod --config /usr/local/etc/mongod.conf
```

### 5️⃣ Run the App
```bash
npm run dev
```

✅ **Server running at:** http://localhost:3001

---

## 📱 Test It Out

### Using Postman or cURL:

**1. Add a Product:**
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d "{\"sku\":\"TEST-001\",\"name\":\"Test Product\",\"category\":\"formal\",\"currentStock\":50,\"minStock\":10,\"maxStock\":100,\"reorderPoint\":15,\"costPrice\":800,\"sellingPrice\":1499}"
```

**2. Check Products:**
```bash
curl http://localhost:3001/api/products
```

**3. Get Dashboard Stats:**
```bash
curl http://localhost:3001/api/dashboard/stats
```

---

## 🔔 Optional: WhatsApp Setup

1. Sign up at https://www.twilio.com
2. Get Account SID and Auth Token
3. Activate WhatsApp sandbox
4. Add to `.env`:
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## 🎯 What's Next?

- Add your real products via API
- Add suppliers with WhatsApp numbers
- Record sales to train AI predictions
- Receive automated alerts

---

## 📞 Need Help?

Check the full README.md for detailed documentation!
