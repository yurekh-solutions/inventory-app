import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcodePkg from 'qrcode';

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.currentQR = null;       // stores latest QR string
    this.qrImageBase64 = null;   // stores QR as base64 PNG image
    this.messageQueue = [];
    this.initialize();
  }

  initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'tubhyam-inventory' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions'
        ]
      }
    });

    // Generate QR and serve it as image
    this.client.on('qr', async (qr) => {
      this.currentQR = qr;
      this.isReady = false;

      try {
        // Convert QR to a base64 PNG image
        this.qrImageBase64 = await qrcodePkg.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });

        console.log('\n✅ QR Code ready!');
        console.log('📱 Open this URL in your browser to scan:');
        console.log('   http://localhost:3002/whatsapp/qr\n');
        console.log('   Then scan the QR with WhatsApp Business:');
        console.log('   Settings → Linked Devices → Link a Device\n');
      } catch (err) {
        console.error('QR generation error:', err.message);
      }
    });

    // Ready
    this.client.on('ready', () => {
      this.isReady = true;
      this.currentQR = null;
      this.qrImageBase64 = null;
      console.log('✅ WhatsApp Business connected!');
      this.processQueue();
    });

    // Disconnected - auto reconnect
    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      console.log('❌ WhatsApp disconnected:', reason);
      setTimeout(() => {
        console.log('🔄 Reconnecting...');
        this.initialize();
      }, 10000);
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Auth failed:', msg);
    });

    this.client.initialize().catch(err => {
      console.error('WhatsApp init error:', err.message);
    });
  }

  // Returns HTML page with scannable QR code
  getQRPage() {
    if (this.isReady) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#f0fdf4">
        <h1 style="color:#16a34a">WhatsApp Connected!</h1>
        <p style="font-size:18px">Your WhatsApp Business is linked and ready to send alerts.</p>
        <a href="/" style="color:#16a34a">Go to Dashboard</a>
      </body></html>`;
    }
    if (!this.qrImageBase64) {
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Loading QR...</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:40px;background:#fff7ed">
          <h2>Generating QR Code...</h2>
          <p>Please wait a few seconds...</p>
          <script>setTimeout(()=>location.reload(),3000)<\/script>
        </body></html>`;
    }
    return `<!DOCTYPE html><html>
    <head>
      <title>Scan QR - Tubhyam WhatsApp</title>
      <meta charset="UTF-8">
      <style>
        body{font-family:sans-serif;text-align:center;padding:40px;background:#1a1a2e;color:#eee;margin:0}
        h1{color:#f0bc72;margin-bottom:8px}
        #qr-img{width:300px;height:300px;border:5px solid #4ade80;border-radius:12px;margin:20px auto;display:block;background:#fff;padding:6px}
        .steps{color:#ccc;font-size:15px;max-width:440px;margin:16px auto;line-height:2.2}
        .steps strong{color:#f0bc72}
        #timer{color:#f87171;font-size:15px;margin-top:14px;font-weight:bold}
        #status{color:#86efac;font-size:14px;margin-top:6px}
        .btn{display:inline-block;margin-top:20px;padding:10px 28px;background:#4ade80;color:#000;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px}
      </style>
    </head>
    <body>
      <h1>Scan with WhatsApp Business</h1>
      <img id="qr-img" src="${this.qrImageBase64}" />
      <div id="timer">QR expires in: <span id="cd">20</span>s - scan quickly!</div>
      <div id="status">Waiting for scan...</div>
      <div class="steps">
        Open <strong>WhatsApp Business</strong><br>
        Tap <strong>3 dots (top right)</strong><br>
        Tap <strong>Linked Devices</strong><br>
        Tap <strong>Link a Device</strong><br>
        Scan the QR above
      </div>
      <a class="btn" href="/whatsapp/qr">Get Fresh QR</a>
      <script>
        var t = 20;
        setInterval(function(){
          t--;
          document.getElementById('cd').textContent = t;
          if(t <= 0){
            document.getElementById('status').textContent = 'Loading new QR...';
            fetch('/api/whatsapp/qr-data').then(r=>r.json()).then(d=>{
              if(d.ready){ window.location.href='/whatsapp/qr'; return; }
              if(d.image){ document.getElementById('qr-img').src=d.image; t=20; document.getElementById('status').textContent='New QR ready - scan now!'; }
              else{ location.reload(); }
            }).catch(()=>location.reload());
          }
        }, 1000);
      </script>
    </body></html>`;
  }

  // Format phone number
  formatNumber(number) {
    let cleaned = number.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned + '@c.us';
  }

  // Send message
  async sendMessage(toNumber, message) {
    const chatId = this.formatNumber(toNumber);

    if (!this.isReady) {
      this.messageQueue.push({ chatId, message });
      console.log(`⏳ Queued message for ${toNumber}`);
      return { success: false, reason: 'queued' };
    }

    try {
      await this.client.sendMessage(chatId, message);
      console.log(`✅ Sent to ${toNumber}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to send to ${toNumber}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async processQueue() {
    if (this.messageQueue.length === 0) return;
    console.log(`📤 Sending ${this.messageQueue.length} queued messages...`);
    for (const item of this.messageQueue) {
      try {
        await this.client.sendMessage(item.chatId, item.message);
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error('Queue error:', err.message);
      }
    }
    this.messageQueue = [];
  }

  // ===== ALERT TEMPLATES =====

  async sendLowStockAlert(product, supplier) {
    const message =
      `🚨 *LOW STOCK ALERT - Tubhyam*\n\n` +
      `📦 *Product:* ${product.name}\n` +
      `🔖 *SKU:* ${product.sku}\n` +
      `📉 *Current Stock:* ${product.currentStock} units\n` +
      `⚠️ *Reorder Point:* ${product.reorderPoint} units\n\n` +
      `Please restock at the earliest!\n\n— Tubhyam Inventory`;
    return this.sendMessage(supplier.whatsappNumber, message);
  }

  async sendOutOfStockAlert(product, supplier) {
    const message =
      `🔴 *OUT OF STOCK — URGENT!*\n\n` +
      `📦 *Product:* ${product.name}\n` +
      `🔖 *SKU:* ${product.sku}\n` +
      `❌ *Status:* SOLD OUT\n\n` +
      `🚚 Immediate restocking required!\n\n— Tubhyam Inventory`;
    return this.sendMessage(supplier.whatsappNumber, message);
  }

  async sendRestockReminder(product, supplier) {
    const message =
      `📦 *RESTOCK REMINDER - Tubhyam*\n\n` +
      `*Product:* ${product.name}\n` +
      `*Predicted Weekly Demand:* ${product.predictedDemand} units\n\n` +
      `💡 *AI Recommendation:*\n${product.aiRecommendation}\n\n— Tubhyam AI`;
    return this.sendMessage(supplier.whatsappNumber, message);
  }

  async sendPredictionAlert(product, prediction, supplier) {
    const trendSign = prediction.trend > 0 ? '+' : '';
    const message =
      `🤖 *AI DEMAND PREDICTION — Tubhyam*\n\n` +
      `📦 *Product:* ${product.name}\n` +
      `📊 *Predicted Demand:* ${prediction.predictedDemand} units/week\n` +
      `🎯 *Confidence:* ${prediction.confidence}%\n` +
      `📈 *Trend:* ${trendSign}${prediction.trend}%\n` +
      `🌤️ *Season:* ${prediction.season}\n\n` +
      `💡 ${prediction.recommendation}\n\n— Tubhyam AI`;
    return this.sendMessage(supplier.whatsappNumber, message);
  }

  async sendBulkAlerts(alerts) {
    const results = [];
    for (const alert of alerts) {
      const result = await this.sendMessage(alert.supplier.whatsappNumber, alert.message);
      results.push({ productId: alert.productId, ...result });
      await new Promise(r => setTimeout(r, 1500));
    }
    return results;
  }

  getStatus() {
    return {
      isReady: this.isReady,
      queuedMessages: this.messageQueue.length,
      scanRequired: !this.isReady && !!this.qrImageBase64
    };
  }
}

export const whatsappService = new WhatsAppService();
