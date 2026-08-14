# 🐎 BlackHorse Checkout-to-Delivery System Analysis

A comprehensive analysis of the e-commerce checkout and delivery flow for a digital goods storefront built with **Node.js + Express + SQLite**.

---

## 1. CHECKOUT FLOW STRUCTURE

### 1.1 Checkout Steps & Pages

#### **Step 1: Product Selection (Homepage)**
- **Route**: `GET /`
- **Component**: Homepage with product catalog grouped by categories
- **Features**:
  - Products displayed in category tables (Product · Price · Stock · Buy)
  - Announcement banners for promotions
  - Manual payment methods footer

#### **Step 2: Purchase Modal**
- **Trigger**: "Buy" button on any product
- **Modal Fields**:
  ```
  - Telegram Username (required)
  - Email (optional)
  - Quantity (required, minimum 1)
  - SIM Type Selection (for telecom products: Physical SIM / eSIM)
  - Delivery Address (for physical goods)
  - Payment Method Selection
  ```

#### **Step 3: Payment Method Selection**
- **Available Methods** (7 total):
  1. **Maya Checkout** - Hosted checkout redirect (Philippines)
  2. **Swiftpay PH** - Bank transfers + e-wallets (Philippines)
     - Direct checkout or QR Ph (scan-to-pay)
  3. **Magpie** - Alipay & WeChat Pay (China/Asia)
  4. **PayMongo** - Cards + GCash (Philippines)
  5. **Xendit** - Multi-currency invoices (Multi-region)
  6. **Coins.ph** - Digital wallet + bank (Philippines)
  7. **Manual Methods** - Admin-defined (Bank transfer, GCash, etc.)

#### **Step 4: Order Creation & Redirect**
- **Route**: `POST /order` (rate-limited)
- **Database Action**: Order created as `pending` status
- **Payload**:
  ```javascript
  {
    orderNumber: "ORD-XXXXX",        // Unique ID
    email: "user@example.com",
    telegramUsername: "username",
    telegramId: "123456",
    productId: 1,
    productName: "Product Name",
    quantity: 1,
    unitPrice: 99.99,
    total: 99.99,
    currency: "PHP",
    paymentType: "maya",              // or other payment type
    simTypeSelected: "eSIM",          // if applicable
    deliveryAddress: "Address",       // if applicable
    status: "pending"
  }
  ```

#### **Step 5: Payment Processing**
**For Maya/Swiftpay/Magpie/PayMongo/Xendit/Coins:**
- Checkout session created with payment provider
- Customer redirected to payment gateway
- Order fields updated with payment IDs:
  - `maya_checkout_id`
  - `swiftpay_checkout_id` + `swiftpay_checkout_url`
  - `magpie_checkout_id`
  - `paymongo_session_id`
  - `xendit_invoice_id`
  - `coins_request_id`

**For Manual Methods:**
- Customer shown payment instructions on result page
- Admin reviews payment evidence
- Admin clicks "Mark as Paid"

#### **Step 6: Payment Result/Status Page**
- **Routes**: 
  - `/order/result?ref={orderNumber}` (auto-redirect after payment)
  - `/status?ref={orderNumber}&tg={username}` (manual query)
- **Display**:
  - Order number, product, quantity, total
  - Payment method icon/name
  - Order status (Pending/Paid/Delivered/Failed)
  - **For Paid orders**: "Payment confirmed, content coming soon"
  - **For Delivered orders**: Delivery content displayed
  - **For Failed orders**: Error message with order number for support

### 1.2 Order Status Flow Diagram

```
┌─────────────┐
│  PENDING    │  Order created, awaiting payment
└──────┬──────┘
       │ (Payment confirmed via webhook or re-sync)
       ▼
┌─────────────┐
│   PAID      │  Payment confirmed, stock decremented
└──────┬──────┘  Ready for fulfillment
       │ (Admin delivers content OR auto-delivery)
       ▼
┌─────────────┐
│  DELIVERED  │  Customer sees delivery content
└─────────────┘

       └──────────┬──────────┘ (Alternative)
                  ▼
        ┌──────────────────┐
        │     FAILED       │  Payment failed/expired
        └──────────────────┘
```

---

## 2. PAYMENT INTEGRATION APPROACH

### 2.1 Payment Processor Architecture

Each payment provider has a dedicated module with standardized interface:

```javascript
// Structure: src/{provider}.js
module.exports = {
  isConfigured(),              // Check if API keys are set
  createCheckout(order, baseUrl),  // Create payment session
  getCheckoutStatus(checkoutId),   // Poll status (optional)
  normalizeStatus(raw),        // Normalize to 'paid'|'failed'|'pending'
  verifyWebhookSignature()     // HMAC verification for webhooks
};
```

### 2.2 Payment Confirmation Strategy (Dual Verification)

**Webhook Reception** (Primary):
```javascript
// POST /webhooks/{provider}/payment-status
// Receives payload from payment provider
// Verifies HMAC signature
// Updates order.status = 'paid'
// Triggers notifications
```

**Live Status Re-sync** (Backup):
```javascript
// When customer returns to result page
// GET /order/result?ref={orderNumber}
// For Maya/Magpie/Swiftpay: Call getCheckoutStatus() API
// If status === 'paid', update order
// Ensures accuracy even if webhook fails
```

### 2.3 Payment Provider Specifics

#### **Maya (Philippines)**
- **Checkout Type**: Hosted redirect
- **Flow**: Customer → Maya checkout page → Callback to webhook
- **Webhook**: `POST /webhooks/maya/payment-status`
- **Configuration**:
  ```
  Admin → Settings → Maya Checkout
  - Public Key (pk-...)
  - Secret Key (sk-...)
  - Sandbox/Live toggle
  - Register webhook URL in Maya dashboard
  ```
- **Status Query**: Uses `checkoutId` to look up payment status
- **Verification**: HMAC-SHA256 signature on webhook

#### **Swiftpay PH (Multiple Methods)**
- **Types**:
  - Standard checkout (select bank/e-wallet on Swiftpay page)
  - GCash (direct QR code)
  - QR Ph (scan-to-pay)
- **Institution Selection**: Admin can pre-select (e.g., `MAYA`, `GCASH`, `CARD`)
- **Webhook**: `POST /webhooks/swiftpay/payment-status`
- **Status Query**: Uses order number as reference

#### **Magpie (Alipay/WeChat)**
- **Checkout Type**: Creates payment source, redirects to QR
- **Flow**: Create source → Get checkout URL → Customer scans/pays → Callback
- **Methods**: `alipay` (default) or `wechat`
- **Webhook**: `POST /webhooks/magpie/payment-status`

#### **Manual Payment Methods**
- **Flow**: No automatic payment gateway
- **Admin**: Reviews payment evidence (screenshot, bank receipt, etc.)
- **Action**: Admin clicks "Confirm Payment" button
- **Stock Handling**: Decremented when marked paid

### 2.4 Payment Webhook Handling

```javascript
// Webhook pattern (example: Maya)
POST /webhooks/maya/payment-status
{
  checkoutId: "...",
  paymentStatus: "PAYMENT_SUCCESS",    // or FAILED, etc.
  ...otherFields
}

// Server processing:
1. Verify HMAC signature (header: X-MAYA-SIGNATURE)
2. Extract orderNumber from webhook
3. Get order from database
4. Update status: order.status = 'paid', order.paid_at = now()
5. Trigger NotificationService.onOrderPaid()
6. Return 200 OK (idempotent, safe to retry)
```

---

## 3. DELIVERY/FULFILLMENT PROCESS

### 3.1 Two Delivery Modes

#### **Mode A: Auto-Delivery (Digital Goods)**
**Trigger**: When payment confirmed AND product has `auto_deliver = true`

**Process**:
1. Order transitions to `paid` status
2. System automatically calls `_performAutoDeliver(orderId)`
3. Retrieves stock items from `product_stock_pool`
4. Formats delivery content (credentials, passwords, QR codes)
5. Updates order: `status = 'delivered'`, `delivered_content = ...`
6. Decrements product stock
7. Records connection history
8. Sends notification to customer (email/Telegram)

**Example Auto-Delivery Content**:
```
Email/Number: account@example.com
Password: encrypted_password_here
SIM Type: eSIM
eSIM QR Code: [BASE64_QR_DATA]

---

Email/Number: account2@example.com
Password: encrypted_password_here
SIM Type: Physical SIM
```

#### **Mode B: Manual Delivery (Admin Action Required)**
**Trigger**: Product has `auto_deliver = false`

**Process**:
1. Payment confirmed → Order transitions to `paid`
2. Admin navigates to order in admin panel
3. Admin **pastes delivery content** in textarea:
   ```
   Account Credentials / Access Details
   JSON data
   Setup instructions
   etc.
   ```
4. Admin clicks "Send to Customer"
5. Order transitions to `delivered`
6. Customer sees content on result page
7. Notification sent to customer

### 3.2 Stock Pool Management

#### **Database Structure**
```sql
CREATE TABLE product_stock_pool (
  id                  INTEGER PRIMARY KEY,
  product_id          INTEGER,
  content             TEXT,                -- Legacy plain text
  account_email_number TEXT,               -- New: structured data
  account_password    TEXT,                -- Encrypted
  sim_type            TEXT,                -- 'SIM' or 'eSIM'
  esim_qrcode         TEXT,                -- Base64 QR code
  is_sold             INTEGER DEFAULT 0,
  order_id            INTEGER,             -- Links to orders
  added_at            DATETIME,
  sold_at             DATETIME
);
```

#### **Stock Admin Panel**
- **Add Stock**: Admin uploads accounts (one per line)
  ```
  account1@email.com
  account2@email.com
  account3@email.com
  ```
- **View Available**: Shows unsold items in stock pool
- **Track Sold**: Historical record of delivered items with order links
- **Bulk Operations**: Clear all unsold stock, sync inventory counts

#### **Auto-Inventory Sync**
```javascript
// Product table has real-time stock count
// Synced from: COUNT(*) WHERE product_stock_pool.is_sold = 0
// Updates on: product created, stock added, auto-delivery triggered
syncProductStockCount(productId) {
  const count = db.query(
    'SELECT COUNT(*) FROM product_stock_pool WHERE is_sold = 0'
  );
  db.update('products SET stock = ?', count);
}
```

### 3.3 Delivery Content Display

**Customer View (Order Result Page)**:
```html
<div class="delivery">
  <h3>Your Delivery</h3>
  <pre>{{ order.delivered_content }}</pre>
  <button>Copy All</button>
  <a href="...">Download QR Code</a>
</div>
```

**Supported Content Types**:
- Plain text (credentials, instructions)
- JSON (structured API keys, merchant IDs)
- Base64-encoded QR codes (for eSIM provisioning)
- HTML/markdown-like formatted content

---

## 4. ORDER TRACKING SYSTEM

### 4.1 Customer Order Query

#### **Public Routes**
```
GET /status
  - Input: email + order_number  OR  telegram_username + order_number
  - Display: Full order details, delivery content if available
  - No login required

GET /account
  - Requires: Telegram login (OAuth-like flow)
  - Display: All orders for authenticated customer
  - Shows: Order list with status pills, links to details
```

#### **Query Methods**
```javascript
// By order number (order_number is UNIQUE)
getOrder(orderNumber)

// By Telegram + order number (customers remember both)
getOrderByTGAndRef(telegramUsername, orderNumber)

// All customer orders (by Telegram username)
getOrdersByTelegramUsername(telegramUsername)
```

### 4.2 Admin Order Management

#### **Admin Dashboard**
```
GET /admin
  - Statistics: Total orders, pending, paid, delivered, failed
  - Revenue metrics: Today, this month, all-time
  - Order count graphs (last 7 days)
  - Payment breakdown by method
  - Low stock warnings
```

#### **Order Filtering & Search**
```
GET /admin?status={all|pending|paid|delivered|failed}
         &search={order#|email|telegram|id}
  - Filters: By order status
  - Search: Order number, email, Telegram username, order ID
  - Results: 200 orders per page, ordered newest first
```

#### **Order Detail Page**
```
GET /admin/orders/{orderId}
  - View all order fields
  - Payment details (method, payment ID, timestamps)
  - Customer history (last 5 orders from same customer)
  - Stock pool items (for auto-delivery products)
  - Admin notes
  - Delivery content textarea
  - Action buttons: Mark Paid, Deliver, Cancel, Update Details
```

### 4.3 Order Audit Log

**Database**:
```sql
CREATE TABLE order_audit_log (
  id              INTEGER PRIMARY KEY,
  order_id        INTEGER NOT NULL,
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  change_type     TEXT,           -- 'auto' or 'admin'
  admin_username  TEXT,
  notes           TEXT,
  changed_at      DATETIME DEFAULT now()
);
```

**Tracked Events**:
- Status transitions (pending → paid → delivered)
- Manual admin actions (mark paid, cancel)
- Auto-delivery triggers
- Admin notes added

**Admin View**: Searchable log with filters by order, date range, change type

### 4.4 Payment Channel Connection Tracking

**For Payment Channel Products** (e.g., payment processing APIs):

```sql
CREATE TABLE payment_channel_connections (
  id                    INTEGER PRIMARY KEY,
  order_id              INTEGER,
  product_id            INTEGER,
  telegram_username     TEXT,
  channel_name          TEXT,
  connection_status     TEXT,        -- 'connected', 'failed'
  connection_ip         TEXT,        -- Customer IP
  connection_user_agent TEXT,        -- Browser info
  resent_count          INTEGER,     -- How many times resent
  last_resent_at        DATETIME,
  connected_at          DATETIME,
  updated_at            DATETIME
);
```

**Features**:
- Track which customers connected to which payment channels
- Monitor connection failures
- Resend credentials (admin can trigger from order page)
- Customer connection history dashboard

---

## 5. CODE PATTERNS & ARCHITECTURE

### 5.1 Tech Stack

```
Frontend:
  - EJS templates (server-side rendering)
  - Vanilla JS + HTML5 (no build tool)
  - CSS (custom dark/light theme)

Backend:
  - Node.js + Express.js
  - SQLite3 (node:sqlite)
  - Zero external dependencies for payments (built-in modules)

Database:
  - SQLite3 with WAL (Write-Ahead Logging)
  - Foreign key constraints enabled
  - Transactions for atomicity
  - Indices for common queries

Security:
  - CSRF protection (tokens on all forms)
  - Rate limiting (on order creation)
  - Password hashing (bcrypt)
  - HMAC-SHA256 webhook verification
```

### 5.2 Service Layer Pattern

```javascript
// src/services/store.js - Centralized business logic
const StoreService = {
  // Products
  getCatalog(),
  getProduct(id),
  createProduct(data),
  updateProduct(id, data),
  deleteProduct(id),
  updateProductStock(id, delta),

  // Orders
  createOrder(data),           // Creates order in 'pending' state
  getOrder(idOrNumber),
  getOrderByTGAndRef(tg, ref),
  updateOrderStatus(id, status),  // Handles paid → delivered transitions
  deliverOrder(id, content),   // Delivers content manually
  autoDeliver(id),             // Auto-delivery for paid orders

  // Stock Management
  addStockToPool(productId, lines),
  syncProductStockCount(productId),
  _performAutoDeliver(orderId),  // Internal: does the actual delivery

  // Notifications
  onOrderPaid(order),          // Triggers notifications
  onOrderDelivered(order),
};

// Services are called from routes
router.post('/order', async (req, res) => {
  const order = StoreService.createOrder({...});
  NotificationService.onNewOrder(order);
  // Redirect to payment
});
```

### 5.3 Database Schema Patterns

#### **Orders Table** (Central entity)
```sql
orders {
  id                    PK
  order_number          UNIQUE (customer-facing ID)
  email                 NULLABLE
  telegram_username     NULLABLE
  telegram_id           NULLABLE
  product_id            FK
  product_name          (denormalized for history)
  quantity              INTEGER
  total                 REAL
  currency              VARCHAR (e.g., 'PHP')
  
  -- Payment fields
  payment_type          'maya'|'swiftpay_qrph'|'manual'|...
  manual_method_id      FK (if manual method)
  maya_checkout_id      VARCHAR (payment provider's ID)
  swiftpay_checkout_id  VARCHAR
  paymongo_session_id   VARCHAR
  xendit_invoice_id     VARCHAR
  magpie_checkout_id    VARCHAR
  
  -- Status tracking
  status                'pending'|'paid'|'delivered'|'failed'|'cancelled'
  paid_at               DATETIME (when payment confirmed)
  delivered_at         DATETIME (when content delivered)
  
  -- Delivery content
  delivered_content     TEXT (credentials, instructions, etc.)
  admin_notes          TEXT (internal notes)
  
  -- Metadata
  sim_type_selected    'SIM'|'eSIM' (for telecom products)
  delivery_address     TEXT (for physical goods)
  created_at           DATETIME
  updated_at           DATETIME
}
```

#### **Product Stock Pool** (Inventory)
```sql
product_stock_pool {
  id                    PK
  product_id            FK
  content               TEXT (legacy: plain account credentials)
  account_email_number  VARCHAR (structured: email or phone)
  account_password      TEXT (encrypted)
  sim_type              'SIM'|'eSIM'
  esim_qrcode          TEXT (Base64 QR code)
  is_sold               BOOLEAN
  order_id              FK (which order consumed this)
  added_at              DATETIME
  sold_at               DATETIME
}
```

#### **Indices** (Performance optimization)
```sql
-- Order queries
idx_orders_order_number (order_number)
idx_orders_status (status)
idx_orders_created_at (created_at)
idx_orders_telegram (telegram_username)
idx_orders_status_created (status, created_at) -- Combined

-- Stock queries
idx_stock_product (product_id, is_sold)
idx_stock_pool_added_at (added_at)

-- Audit queries
idx_audit_log_order (order_id)
idx_audit_log_changed_at (changed_at)
```

### 5.4 Transaction Pattern (Atomicity)

```javascript
// Ensure status transitions are atomic
updateOrderStatus(orderId, status, paidAt = null) {
  const tx = db.transaction(() => {
    // All-or-nothing: update order + audit log + notifications
    db.update('orders SET status = ?, paid_at = ? WHERE id = ?');
    db.insert('order_audit_log (order_id, old_status, new_status, ...)');
    
    // For paid orders: decrement stock or trigger auto-delivery
    if (status === 'paid') {
      if (product.auto_deliver) {
        this._performAutoDeliver(orderId);
      } else {
        this.updateProductStock(product.id, -quantity);
      }
    }
  });
  
  tx();  // Execute transaction
  
  // Post-transaction notifications (outside transaction)
  NotificationService.onOrderPaid(order);
}
```

### 5.5 Route Structure

```
src/routes/
  ├── public.js           # Customer-facing routes
  │   ├── GET  /                    Homepage
  │   ├── POST /order               Create order
  │   ├── GET  /order/result        Order result page
  │   ├── GET  /swiftpay/checkout   Swiftpay checkout page
  │   ├── GET  /magpie/status       Magpie redirect handler
  │   ├── GET  /status              Manual order query
  │   ├── GET  /account             Customer account (Telegram login)
  │   └── GET  /auth/telegram       Telegram OAuth callback
  │
  └── admin.js            # Admin-facing routes
      ├── GET  /admin               Dashboard
      ├── GET  /admin/orders        Order list
      ├── GET  /admin/orders/{id}   Order detail
      ├── POST /admin/orders/{id}/mark-paid
      ├── POST /admin/orders/{id}/deliver
      ├── POST /admin/orders/{id}/cancel
      ├── GET  /admin/products      Product management
      ├── POST /admin/products/{id}/stock  Add stock
      ├── GET  /admin/settings      Settings
      └── ... (15+ admin endpoints)
```

### 5.6 Notification Service Pattern

```javascript
// src/services/notifications.js
const NotificationService = {
  async onNewOrder(order) {
    // Send to admin (Telegram bot)
    // Message: Order #{number}, Product: {name}, Amount: {total}
  },

  async onOrderPaid(order) {
    // Send to admin: Payment confirmed
    // Message: Order #{number} paid, ready for delivery
  },

  async onOrderDelivered(order) {
    // Send to customer (if Telegram bot configured)
    // Message: Your delivery is ready, check order status page
  }
};
```

### 5.7 Error Handling Pattern

```javascript
// Graceful degradation for payment status checks
try {
  const status = await maya.getCheckoutStatus(checkoutId);
  if (status === 'paid') {
    StoreService.updateOrderStatus(order.id, 'paid');
  }
} catch (error) {
  // Log error but don't fail the request
  console.error('Status check failed', error);
  // Show current order status instead
}

// Webhook endpoints always return 200 OK
// Even if processing fails, acknowledge receipt (idempotent processing)
router.post('/webhooks/maya/payment-status', (req, res) => {
  try {
    // Process webhook
  } catch (error) {
    console.error('Webhook error', error);
  }
  return res.status(200).json({ ok: true });  // Always 200
});
```

---

## 6. KEY IMPLEMENTATION PATTERNS FOR YOUR SHOP

### 6.1 Order Creation Flow (Pseudocode)
```
1. User selects product + quantity + payment method
2. POST /order
   ├─ Validate inputs (product exists, quantity valid)
   ├─ Generate unique order number
   ├─ Create order record: status='pending'
   ├─ Notify admin (Telegram/email)
   └─ Route based on payment_type:
       ├─ maya: Create Maya checkout → Redirect to Maya
       ├─ swiftpay: Create Swiftpay checkout → Redirect
       ├─ magpie: Create Magpie charge → Redirect to QR
       ├─ manual: Show instructions page
       └─ etc.
3. Customer completes payment
4. Payment provider sends webhook
5. Webhook handler:
   ├─ Verify signature
   ├─ Update order: status='paid', paid_at=now()
   ├─ Auto-deliver or wait for admin
   ├─ Notify customer
6. Customer returns to site
   ├─ GET /order/result (re-sync if webhook not received)
   └─ Show delivery content if available
```

### 6.2 Database Indexes to Add
```sql
-- For faster order queries
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_type ON orders(payment_type);
CREATE INDEX idx_orders_telegram ON orders(telegram_username);

-- For stock inventory
CREATE INDEX idx_stock_unsold ON product_stock_pool(product_id, is_sold);

-- For audit trail
CREATE INDEX idx_audit_order ON order_audit_log(order_id, changed_at);

-- For payment channel tracking
CREATE INDEX idx_pc_telegram ON payment_channel_connections(telegram_username);
```

### 6.3 Webhook Verification Template
```javascript
// All payment providers use HMAC-SHA256
const crypto = require('crypto');

function verifySignature(payload, incomingSignature, secret) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(incomingSignature)
  );
}

// Use in webhook handler:
router.post('/webhooks/provider/status', (req, res) => {
  const signature = req.get('X-PROVIDER-SIGNATURE');
  const rawBody = req.rawBody;
  
  if (!verifySignature(rawBody, signature, SECRET_KEY)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
});
```

### 6.4 Rate Limiting on Order Creation
```javascript
// Prevent abuse/duplicate submissions
const rateLimit = (req, res, next) => {
  const key = req.ip;  // IP address
  
  if (recentOrders[key] && Date.now() - recentOrders[key] < 3000) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  recentOrders[key] = Date.now();
  next();
};

router.post('/order', rateLimit, async (req, res) => {
  // Process order...
});
```

---

## 7. RECOMMENDED ARCHITECTURE FOR YOUR SHOP

### Directory Structure
```
your-shop/
├── src/
│   ├── app.js                    # Express app + middleware
│   ├── db.js                     # SQLite schema + helpers
│   ├── services/
│   │   ├── store.js              # Business logic (orders, products)
│   │   └── notifications.js      # Email/SMS/Telegram notifications
│   ├── routes/
│   │   ├── public.js             # Customer routes
│   │   ├── admin.js              # Admin routes
│   │   └── webhook.js            # Payment webhooks
│   ├── payments/
│   │   ├── maya.js               # Maya integration
│   │   ├── swiftpay.js           # Swiftpay integration
│   │   ├── paymongo.js           # PayMongo integration
│   │   └── ... (other providers)
│   └── utils/
│       ├── helpers.js            # Utilities
│       └── encryption.js         # Encrypt passwords
├── views/
│   ├── index.ejs                 # Homepage
│   ├── checkout.ejs              # Checkout page
│   ├── order-result.ejs          # Order result
│   ├── admin/
│   │   ├── dashboard.ejs
│   │   ├── orders.ejs
│   │   ├── order-detail.ejs
│   │   └── ... (admin pages)
├── public/
│   ├── css/style.css
│   ├── js/checkout.js
│   └── img/
├── data/
│   └── shop.db                   # SQLite database
└── package.json
```

### Key Technologies
- **Framework**: Express.js (minimal overhead)
- **Database**: SQLite (single file, great for small-medium shops)
- **Templating**: EJS (simple, no build step)
- **Auth**: Session-based (no JWT complexity for simple shops)
- **Security**: HMAC for webhooks, CSRF tokens for forms

---

## 8. METRICS & MONITORING

### Admin Dashboard Shows
- Total orders, orders in last 24h
- Pending vs. Paid vs. Delivered breakdown
- Revenue today, this month, all-time
- Payment method breakdown (which methods are popular)
- Low stock warnings
- Order graphs (order count trend)
- Revenue graphs (revenue trend)

### Audit Trail Tracks
- Every order status change (when, who, why)
- Manual admin actions (mark paid, cancel)
- Auto-delivery events
- Stock depletion

---

## SUMMARY

The BlackHorse checkout-to-delivery system is architected as:

1. **Stateless Checkout**: Minimal server state, relies on payment provider for truth
2. **Dual Verification**: Webhooks + re-sync ensures payment reliability
3. **Flexible Fulfillment**: Auto-delivery for digital goods, manual for others
4. **Audit Trail**: Every event tracked for compliance and support
5. **Modular Payments**: Easy to add/remove payment methods
6. **Simple Tech**: No build tools, no complex frameworks — just Express + SQLite

**Perfect for**: Digital goods shops, SaaS onboarding, account reselling, course delivery
