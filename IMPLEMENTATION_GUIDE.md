# BlackHorse Implementation Guide - Code Examples & Architecture Diagrams

This document provides ready-to-use code patterns and detailed architecture diagrams for implementing a similar checkout-to-delivery system.

---

## ARCHITECTURE DIAGRAMS

### 1. Complete Order Lifecycle

```
Customer Journey:
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Browser/App                  Backend                  Database   │
│  ────────────────────────────────────────────────────────────────│
│                                                                   │
│  [Homepage]                                                       │
│      │ Select product                                             │
│      └─→ [Purchase Modal]                                         │
│           │ Email, Qty, Payment method                            │
│           │                                                       │
│           └─→ POST /order ──→ Validate input                     │
│                               Generate order#              DB:   │
│                               Create order (pending) ──→ INSERT  │
│                               Notify admin           order_audit_ │
│                               Get payment provider         log    │
│                               │                                   │
│                       ┌───────┴────────┬──────────────────────┐   │
│                       │                │                      │   │
│                   (Maya)          (Swiftpay)           (Manual)   │
│                       │                │                      │   │
│  [Maya Checkout]←─────┤                │                 [Show     │
│  Pay on Maya           │                │                  Instructions]
│      │                │                │                │          │
│      └─→ Webhook ─→ /webhooks/maya/status        Admin reviews     │
│           Verify sig.          │                   ↓               │
│           Update order  UPDATE orders             POST            │
│           status='paid' SET status='paid'     /orders/id/mark-paid │
│                │              │ └──→ DB: UPDATE order             │
│                └─→ Return ←───┘                     │              │
│                    200 OK                           └──→ Auto-    │
│                                                       delivery?    │
│  [Order Result]←──────────── GET /order/result                    │
│  Show status          (Re-sync if needed)     For auto products:  │
│  If paid:             Check webhook update       db.update orders │
│  "Paid, processing"   If still pending:         SET               │
│                       Contact API again      delivered_content    │
│  If delivered:                                   status='delivered'│
│  Show credentials     UPDATE orders             db.update stock   │
│                       SET delivered_content     SET is_sold=1     │
│                           status='delivered'                      │
│                                                                   │
│  [Status Query]←────── GET /status?ref=X&tg=Y                    │
│  Check anytime             (Lookup order)                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Payment Processing State Machine

```
                    Order Created
                         │
                         ▼
                    [PENDING] ←──────────────┐
                    ↙         ↘              │
              (Auto-      (Webhook     (Timeout/Retry)
              deliver)    received)        
                ↓            ↓
             ┌─┴──────────────┴─┐
             │                  │
             ▼                  ▼
      [DELIVERED]           [PAID]
    (Instant or            (Awaiting
     Scheduled)             fulfillment)
                            ↓
                       Admin action
                       (paste creds)
                            ↓
                       [DELIVERED]
                            ↓
                    Customer sees
                    content on site

            ┌─────────────────────────┐
            │   FAILURE STATES         │
            ├─────────────────────────┤
            │ Payment timeout         │
            │   → [FAILED]            │
            │   → Customer retries    │
            │                         │
            │ Admin cancels           │
            │   → [CANCELLED]         │
            │   → Refund issued       │
            └─────────────────────────┘
```

### 3. Database Relationships

```
products
  ├─ id (PK)
  ├─ name, price, stock
  ├─ auto_deliver (bool)
  └─ category_id (FK)
         │
         │
    ┌────┴────────┬────────────────┐
    ▼             ▼                ▼
 categories   orders         product_stock_pool
  ├─ id       ├─ id (PK)     ├─ id (PK)
  └─ name     ├─ product_id  ├─ product_id
              │   (FK)       ├─ content
              ├─ status      ├─ account_email
              ├─ payment_type├─ password
              ├─ total       ├─ is_sold
              ├─ email       └─ order_id
              ├─ telegram_username (FK)
              ├─ delivered_content
              ├─ paid_at
              ├─ delivered_at
              ├─ created_at
              └─ {payment provider IDs}
                       │
                       └────────────┬────────────────┐
                                   ▼                ▼
                          manual_payment_methods order_audit_log
                           ├─ id (PK)           ├─ id (PK)
                           ├─ name              ├─ order_id (FK)
                           ├─ instructions      ├─ old_status
                           └─ enabled           ├─ new_status
                                                ├─ changed_at
                                                └─ changed_by
```

### 4. Payment Gateway Integration Pattern

```
┌──────────────────────────────────────────────────────────┐
│           Payment Integration Architecture                │
└──────────────────────────────────────────────────────────┘

Client Flow:
┌────────────┐
│   Order    │  POST /order
│  Created   │  {productId, qty, paymentType}
└─────┬──────┘
      │
      ▼
 ┌─────────────────────────────────────┐
 │ Route Handler (/order)              │
 ├─────────────────────────────────────┤
 │ 1. Validate input                   │
 │ 2. Create order (pending)           │
 │ 3. Switch by payment_type           │
 └─────┬──────────────────────────────┘
       │
       ├─────────────┬──────────────┬──────────────┐
       ▼             ▼              ▼              ▼
    [Maya]      [Swiftpay]    [PayMongo]      [Manual]
       │             │            │              │
       ▼             ▼            ▼              ▼
   maya.js      swiftpay.js   paymongo.js    Show form
   │             │            │              │
   ├─ Create  ├─ Create   ├─ Create      ├─ Instructions
   │  checkout│  checkout │  session     │  page
   │  via API │  via API  │  via API     │
   │          │          │              │
   ├─ Get URL├─ Get URL ├─ Get URL     └─ Admin
   │  to      │  to      │  to            marks paid
   │  redirect│ redirect │ redirect      later
   │          │          │              (webhook)
   └──────────┴──────────┴──────────────┘
          │
          └─→ Redirect customer to payment page
              (Maya checkout, Swiftpay page, etc.)
              │
              Customer completes payment
              │
              Payment provider → Webhook endpoint
              │
              POST /webhooks/{provider}/status
              ├─ Verify HMAC signature
              ├─ Get order from payload
              ├─ Update: status='paid'
              ├─ Trigger auto-delivery (if enabled)
              ├─ Send notification
              └─ Return 200 OK (idempotent)
```

---

## CODE EXAMPLES

### 1. Order Creation Handler

```javascript
// src/routes/public.js
router.post('/order', rateLimit, asyncHandler(async (req, res) => {
  // 1. Validate inputs
  const telegramUsername = String(req.body.telegram_username || '')
    .trim()
    .replace(/^@/, '');
  const productId = parseInt(req.body.product_id, 10);
  const quantity = Math.max(1, parseInt(req.body.quantity, 10) || 1);
  const paymentType = req.body.payment_type;
  const simTypeSelected = req.body.sim_type_selected || null;
  const deliveryAddress = req.body.delivery_address || null;

  if (!telegramUsername) {
    return res.status(400).render('error', {
      title: 'Invalid Input',
      message: 'Telegram username is required.'
    });
  }

  const product = StoreService.getProduct(productId);
  if (!product || !product.active) {
    return res.status(404).render('error', {
      title: 'Product Not Found',
      message: 'This product is not available.'
    });
  }

  // 2. Create order in database
  const orderNumber = generateOrderNumber();  // e.g., 'ORD-20250814-ABC123'
  const total = +(product.price * quantity).toFixed(2);
  
  const order = StoreService.createOrder({
    orderNumber,
    email: String(req.body.email || '').trim() || null,
    telegramUsername,
    telegramId: null,
    productId: product.id,
    productName: product.name,
    quantity,
    unitPrice: product.price,
    total,
    currency: getSetting('currency', 'PHP'),
    paymentType,
    manualMethodId: paymentType === 'manual' ? req.body.manual_method_id : null,
    simTypeSelected,
    deliveryAddress
  });

  // 3. Notify admin
  NotificationService.onNewOrder(order).catch(console.error);

  // 4. Route to appropriate payment handler
  const baseUrl = res.locals.baseUrl;  // Set in middleware

  if (paymentType === 'maya') {
    try {
      const { checkoutId, redirectUrl } = await maya.createCheckout(order, baseUrl);
      db.prepare('UPDATE orders SET maya_checkout_id = ? WHERE id = ?')
        .run(checkoutId, order.id);
      return res.redirect(redirectUrl);
    } catch (e) {
      db.prepare("UPDATE orders SET status = 'failed', admin_notes = ? WHERE id = ?")
        .run('Maya error: ' + e.message, order.id);
      return res.status(502).render('error', {
        title: 'Payment Error',
        message: `Could not create Maya checkout. ${e.message}`
      });
    }
  }

  if (paymentType === 'swiftpay_maya' || paymentType === 'swiftpay_qrph') {
    try {
      const institutionCode = paymentType === 'swiftpay_maya' ? 'MAYA' : null;
      const { checkoutId, checkoutUrl } = await swiftpay.createCheckout(
        order, 
        baseUrl, 
        institutionCode
      );
      db.prepare('UPDATE orders SET swiftpay_checkout_id = ?, swiftpay_checkout_url = ? WHERE id = ?')
        .run(checkoutId, checkoutUrl, order.id);
      return res.redirect(checkoutUrl);
    } catch (e) {
      db.prepare("UPDATE orders SET status = 'failed', admin_notes = ? WHERE id = ?")
        .run('Swiftpay error: ' + e.message, order.id);
      return res.status(502).render('error', {
        title: 'Payment Error',
        message: `Could not start Swiftpay checkout. ${e.message}`
      });
    }
  }

  // Manual payment method
  if (paymentType === 'manual') {
    return res.redirect(`/order/result?ref=${encodeURIComponent(orderNumber)}`);
  }

  // ... (similar for other payment methods)
}));
```

### 2. Webhook Handler (Maya Example)

```javascript
// src/routes/webhook.js
router.post('/webhooks/maya/payment-status', async (req, res) => {
  try {
    // 1. Verify HMAC signature
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.get('X-MAYA-SIGNATURE') || '';
    
    if (!maya.verifyWebhookSignature(rawBody, signature)) {
      console.warn('Invalid Maya webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Extract payment details
    const body = req.body || {};
    const checkoutId = body.checkoutId;
    const paymentStatus = body.paymentStatus;  // e.g., 'PAYMENT_SUCCESS'

    if (!checkoutId) {
      return res.status(200).json({ ok: true, note: 'No checkoutId' });
    }

    // 3. Find order by payment ID
    const order = db.prepare(
      'SELECT * FROM orders WHERE maya_checkout_id = ?'
    ).get(checkoutId);

    if (!order) {
      return res.status(200).json({ ok: true, note: 'Order not found' });
    }

    // 4. Update order status based on payment status
    const normalizedStatus = maya.normalizeStatus(paymentStatus);

    if (normalizedStatus === 'paid') {
      StoreService.updateOrderStatus(order.id, 'paid', "datetime('now')");
      console.info(`[Webhook] Maya payment confirmed for order ${order.order_number}`);
    } else if (normalizedStatus === 'failed' && order.status === 'pending') {
      StoreService.updateOrderStatus(order.id, 'failed');
      console.info(`[Webhook] Maya payment failed for order ${order.order_number}`);
    }

    // 5. Always return 200 OK (webhook acknowledgement)
    return res.status(200).json({ ok: true });

  } catch (e) {
    console.error('[Webhook] Maya error:', e);
    // Still return 200 OK even on error (to prevent retries)
    return res.status(200).json({ ok: false, error: e.message });
  }
});
```

### 3. Order Status Sync (Backup Verification)

```javascript
// src/routes/public.js
router.get('/order/result', asyncHandler(async (req, res) => {
  const ref = String(req.query.ref || '').trim();
  let order = StoreService.getOrder(ref);

  if (!order) {
    return res.status(404).render('error', {
      title: 'Not Found',
      message: 'Order not found.'
    });
  }

  // Re-sync status from payment provider (fallback if webhook failed)
  if (order.payment_type === 'maya' && order.status === 'pending' && order.maya_checkout_id) {
    try {
      const status = await maya.getCheckoutStatus(order.maya_checkout_id);
      if (status === 'paid') {
        StoreService.updateOrderStatus(order.id, 'paid', "datetime('now')");
      } else if (status === 'failed') {
        StoreService.updateOrderStatus(order.id, 'failed');
      }
      order = StoreService.getOrder(order.id);  // Refresh from DB
    } catch (error) {
      console.error('Status re-sync failed:', error);
      // Continue with current status
    }
  }

  // For Swiftpay
  if (order.payment_type === 'swiftpay_qrph' && order.status === 'pending') {
    order = await syncSwiftpayOrderStatus(order);
  }

  const manualMethod = order.manual_method_id
    ? db.prepare('SELECT * FROM manual_payment_methods WHERE id = ?')
        .get(order.manual_method_id)
    : null;

  res.render('order-result', {
    title: `Order ${order.order_number}`,
    order,
    manualMethod,
    queryStatus: String(req.query.status || '')
  });
}));
```

### 4. Auto-Delivery Logic

```javascript
// src/services/store.js
_performAutoDeliver(orderId) {
  const order = this.getOrder(orderId);
  if (!order || order.status !== 'paid' || order.delivered_content) {
    return false;
  }

  const product = this.getProduct(order.product_id, false);
  if (!product || !product.auto_deliver) {
    return false;
  }

  // Fetch stock items for this product
  const items = db.prepare(
    'SELECT * FROM product_stock_pool WHERE product_id = ? AND is_sold = 0 LIMIT ?'
  ).all(order.product_id, order.quantity);

  // Check if we have enough stock
  if (items.length < order.quantity) {
    db.prepare(
      "UPDATE orders SET admin_notes = 'AUTO-DELIVERY FAILED: Insufficient stock' WHERE id = ?"
    ).run(orderId);
    return false;
  }

  // Build delivery content from stock items
  let deliveredContent = '';
  
  if (items[0].account_email_number) {
    // Structured account data (newer format)
    deliveredContent = items.map(item => {
      const decryptedPassword = decrypt(item.account_password);
      let content = `Email/Number: ${item.account_email_number}\n`;
      content += `Password: ${decryptedPassword}\n`;
      content += `SIM Type: ${item.sim_type || 'SIM'}\n`;
      
      if (item.sim_type === 'eSIM' && item.esim_qrcode) {
        content += `eSIM QR: [QR Code included]\n`;
      }
      
      return content;
    }).join('\n---\n');
  } else {
    // Legacy plain text format
    deliveredContent = items.map(i => i.content).join('\n');
  }

  // Mark items as sold
  const itemIds = items.map(i => i.id);
  const markSold = db.prepare(
    "UPDATE product_stock_pool SET is_sold = 1, order_id = ?, sold_at = datetime('now') WHERE id = ?"
  );
  for (const id of itemIds) {
    markSold.run(orderId, id);
  }

  // Update order with delivery content
  db.prepare(
    "UPDATE orders SET delivered_content = ?, status = 'delivered', delivered_at = datetime('now') WHERE id = ?"
  ).run(deliveredContent, orderId);

  // Update product stock count (from pool)
  this.syncProductStockCount(order.product_id);

  // Record connection history (for payment channels)
  this.recordPaymentChannelConnection(orderId, product.id, order.telegram_username);

  return true;
}
```

### 5. Manual Delivery (Admin Action)

```javascript
// src/routes/admin.js
router.post('/orders/:id/deliver', (req, res) => {
  const order = StoreService.getOrder(req.params.id);
  if (!order) return res.redirect('/admin');

  const content = String(req.body.delivered_content || '').trim();
  if (!content) {
    flash(req, 'Delivery content cannot be empty.', 'error');
    return res.redirect('/admin/orders/' + req.params.id);
  }

  // Deliver order
  StoreService.deliverOrder(order.id, content);

  flash(req, 'Goods delivered. Customer can now see content on their order page.');
  res.redirect('/admin/orders/' + req.params.id);
});

// In store.js
deliverOrder(orderId, content) {
  const order = this.getOrder(orderId);
  
  db.prepare(
    "UPDATE orders SET delivered_content = ?, status = 'delivered', delivered_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(content, orderId);

  // Decrement stock if not already decremented
  if (order && order.product_id) {
    const product = this.getProduct(order.product_id, false);
    if (product && !product.auto_deliver && 
        order.status !== 'paid' && order.status !== 'delivered') {
      this.updateProductStock(order.product_id, -order.quantity);
    }
  }

  // Notify customer
  const updatedOrder = this.getOrder(orderId);
  NotificationService.onOrderDelivered(updatedOrder).catch(console.error);
}
```

### 6. Order Status Update with Atomicity

```javascript
// src/services/store.js
updateOrderStatus(orderId, status, paidAt = null) {
  const order = this.getOrder(orderId);
  if (!order) return;

  // Use transaction for atomicity
  const tx = db.transaction(() => {
    // Only update if status actually changed
    if (order.status === status) return;

    // Update order
    db.prepare(
      "UPDATE orders SET status = ?, paid_at = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(status, paidAt, orderId);

    // Log the change
    db.prepare(
      "INSERT INTO order_audit_log (order_id, old_status, new_status, change_type, notes) VALUES (?, ?, ?, 'auto', null)"
    ).run(orderId, order.status, status);

    // If transitioning to paid: decrement stock or trigger auto-delivery
    if (status === 'paid' && order.status !== 'paid' && order.product_id) {
      const product = this.getProduct(order.product_id, false);
      
      if (product && product.auto_deliver) {
        // Auto-delivery will handle stock decrement
        this._performAutoDeliver(orderId);
      } else {
        // Manual delivery: decrement stock now
        this.updateProductStock(order.product_id, -order.quantity);
      }
    }
  });

  // Execute transaction
  tx();

  // Post-transaction notifications (outside transaction)
  const updatedOrder = this.getOrder(orderId);
  if (status === 'paid' && order.status !== 'paid') {
    NotificationService.onOrderPaid(updatedOrder).catch(console.error);
  } else if (status === 'delivered' && order.status !== 'delivered') {
    NotificationService.onOrderDelivered(updatedOrder).catch(console.error);
  }
}
```

### 7. Database Schema Creation

```javascript
// src/db.js
db.exec(`
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number     TEXT UNIQUE NOT NULL,
  email            TEXT,
  product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name     TEXT NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price       REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'PHP',
  payment_type     TEXT NOT NULL DEFAULT 'manual',
  manual_method_id INTEGER REFERENCES manual_payment_methods(id),
  telegram_username TEXT,
  telegram_id      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  maya_checkout_id TEXT,
  swiftpay_checkout_id TEXT,
  swiftpay_checkout_url TEXT,
  paymongo_session_id TEXT,
  xendit_invoice_id TEXT,
  magpie_checkout_id TEXT,
  delivered_content TEXT,
  admin_notes      TEXT,
  sim_type_selected TEXT,
  delivery_address TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at          TEXT,
  delivered_at     TEXT,
  updated_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_stock_pool (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id            INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  content               TEXT NOT NULL DEFAULT '',
  account_email_number  TEXT,
  account_password      TEXT,
  sim_type              TEXT DEFAULT 'SIM',
  esim_qrcode          TEXT,
  is_sold               INTEGER NOT NULL DEFAULT 0,
  order_id              INTEGER REFERENCES orders(id),
  added_at              TEXT NOT NULL DEFAULT (datetime('now')),
  sold_at               TEXT
);

CREATE TABLE IF NOT EXISTS order_audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  change_type     TEXT NOT NULL,
  admin_username  TEXT,
  notes           TEXT,
  changed_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_telegram ON orders(telegram_username);
CREATE INDEX IF NOT EXISTS idx_orders_payment_type ON orders(payment_type);
CREATE INDEX IF NOT EXISTS idx_stock_product ON product_stock_pool(product_id, is_sold);
CREATE INDEX IF NOT EXISTS idx_audit_order ON order_audit_log(order_id);
`);
```

### 8. Payment Provider Integration Template

```javascript
// src/providers/template.js
'use strict';

const { getSetting } = require('../db');

function isConfigured() {
  const key = getSetting('provider_api_key');
  return !!key;
}

async function createCheckout(order, baseUrl) {
  const apiKey = getSetting('provider_api_key');
  if (!apiKey) throw new Error('Provider not configured');

  const payload = {
    amount: order.total,
    currency: order.currency,
    reference: order.order_number,
    customer_email: order.email,
    success_url: `${baseUrl}/order/result?ref=${order.order_number}`,
    failure_url: `${baseUrl}/order/result?ref=${order.order_number}&status=fail`
  };

  const res = await fetch('https://api.provider.com/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Provider error: ${res.status}`);
  }

  const data = await res.json();
  return {
    checkoutId: data.id,
    checkoutUrl: data.checkout_url
  };
}

async function getCheckoutStatus(checkoutId) {
  const apiKey = getSetting('provider_api_key');
  const res = await fetch(`https://api.provider.com/checkout/${checkoutId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  if (!res.ok) return null;
  const data = await res.json();
  return normalizeStatus(data.status);
}

function normalizeStatus(raw) {
  const status = String(raw).toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'PAID'].includes(status)) return 'paid';
  if (['FAILED', 'CANCELLED'].includes(status)) return 'failed';
  return 'pending';
}

function verifyWebhookSignature(rawBody, signature) {
  const crypto = require('crypto');
  const secret = getSetting('provider_webhook_secret');
  
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}

module.exports = {
  isConfigured,
  createCheckout,
  getCheckoutStatus,
  normalizeStatus,
  verifyWebhookSignature
};
```

### 9. Customer Order Query

```javascript
// src/routes/public.js
router.get('/status', (req, res) => {
  const ref = String(req.query.ref || '').trim();
  const tg = String(req.query.tg || '').trim();

  if (ref && tg) {
    const order = StoreService.getOrderByTGAndRef(tg, ref);
    if (order) {
      const manualMethod = order.manual_method_id
        ? db.prepare('SELECT * FROM manual_payment_methods WHERE id = ?').get(order.manual_method_id)
        : null;

      return res.render('status', {
        title: 'Order Status',
        order,
        manualMethod,
        searched: true,
        error: null
      });
    }

    return res.render('status', {
      title: 'Order Status',
      order: null,
      manualMethod: null,
      searched: true,
      error: 'Order not found. Please check your order number and Telegram username.'
    });
  }

  res.render('status', {
    title: 'Order Status',
    order: null,
    manualMethod: null,
    searched: false,
    error: null
  });
});
```

### 10. Admin Order Dashboard

```javascript
// src/routes/admin.js
router.get('/', (req, res) => {
  const stats = StoreService.getStats();
  const filter = String(req.query.status || 'all');
  const search = String(req.query.search || '').trim().toLowerCase();

  let orders;
  let sql = 'SELECT * FROM orders';
  let params = [];

  if (filter !== 'all') {
    sql += ' WHERE status = ?';
    params.push(filter);
  }

  if (search) {
    const where = filter !== 'all' ? ' AND ' : ' WHERE ';
    sql += where + '(order_number LIKE ? OR email LIKE ? OR telegram_username LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  sql += ' ORDER BY id DESC LIMIT 200';
  orders = db.prepare(sql).all(...params);

  res.render('admin/dashboard', {
    title: 'Dashboard',
    orders,
    stats,
    filter,
    search,
    flash: takeFlash(req)
  });
});

// Stats calculation
getStats() {
  return {
    orders: db.prepare('SELECT COUNT(*) c FROM orders').get().c,
    pending: db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'pending'").get().c,
    paid: db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'paid'").get().c,
    delivered: db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'delivered'").get().c,
    failed: db.prepare("SELECT COUNT(*) c FROM orders WHERE status = 'failed'").get().c,
    
    revenueToday: db.prepare(`
      SELECT SUM(total) revenue FROM orders 
      WHERE status IN ('paid', 'delivered') 
      AND date(created_at) = date('now')
    `).get().revenue || 0,
    
    revenueThisMonth: db.prepare(`
      SELECT SUM(total) revenue FROM orders 
      WHERE status IN ('paid', 'delivered') 
      AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get().revenue || 0,

    paymentBreakdown: db.prepare(`
      SELECT payment_type, COUNT(*) count, SUM(total) sum
      FROM orders
      WHERE status IN ('paid', 'delivered')
      GROUP BY payment_type
      ORDER BY count DESC
    `).all()
  };
}
```

---

## IMPLEMENTATION CHECKLIST

- [ ] Set up Express.js project with SQLite
- [ ] Create database schema (orders, products, stock_pool, audit_log)
- [ ] Implement authentication (admin login)
- [ ] Build product catalog UI (homepage)
- [ ] Create order creation endpoint (`POST /order`)
- [ ] Integrate first payment provider (e.g., Maya or manual)
- [ ] Set up webhook handler with signature verification
- [ ] Implement auto-delivery logic for digital goods
- [ ] Build order result page (`/order/result`)
- [ ] Build order query page (`/status`)
- [ ] Create admin dashboard (view orders, statistics)
- [ ] Build stock pool management UI
- [ ] Implement manual delivery interface (admin paste credentials)
- [ ] Add notification service (email/Telegram)
- [ ] Set up audit logging
- [ ] Add more payment providers as needed
- [ ] Deploy to production (Railway, Heroku, etc.)
- [ ] Configure webhook URLs in payment provider dashboards

---

## NEXT STEPS FOR YOUR SHOP

1. **Choose Payment Providers**: Maya, Swiftpay, or simpler (Stripe, Square)?
2. **Define Product Types**: Digital goods, physical goods, services?
3. **Decide on Fulfillment**: Auto-delivery or manual?
4. **Plan Notifications**: Email, Telegram, SMS?
5. **Set Up Hosting**: Railway, Vercel, Heroku, VPS?
6. **Customize Branding**: Logo, colors, shop name
7. **Configure Payment Credentials**: Get API keys from providers
8. **Test End-to-End**: Create test orders, verify payments, deliver goods
9. **Launch and Monitor**: Track orders, monitor errors, iterate

Good luck with your e-commerce platform! 🚀
