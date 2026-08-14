// Order tracking functionality
function searchOrder(event) {
  event.preventDefault();

  const orderNumber = document.getElementById('orderNumberInput').value.toUpperCase();
  const email = document.getElementById('emailInput').value.toLowerCase();

  const order = getOrder(orderNumber);

  if (!order || order.shippingData.email.toLowerCase() !== email) {
    document.getElementById('trackingForm').style.display = 'none';
    document.getElementById('trackingResult').style.display = 'none';
    document.getElementById('trackingError').style.display = 'block';
    return;
  }

  // Display order tracking
  displayTracking(order);
}

function displayTracking(order) {
  document.getElementById('trackingForm').style.display = 'none';
  document.getElementById('trackingError').style.display = 'none';
  document.getElementById('trackingResult').style.display = 'block';

  document.getElementById('trackingOrderNumber').textContent = order.orderId;

  // Set status badge
  const statusBadge = document.getElementById('trackingStatus');
  const statuses = {
    'processing': { label: 'Processing', class: 'status-processing' },
    'confirmed': { label: 'Confirmed', class: 'status-confirmed' },
    'shipped': { label: 'Shipped', class: 'status-shipped' },
    'delivered': { label: 'Delivered', class: 'status-delivered' }
  };

  const status = statuses[order.status] || statuses['processing'];
  statusBadge.textContent = status.label;
  statusBadge.className = 'status-badge ' + status.class;

  // Update timeline based on order status
  const orderDate = new Date(order.timestamp);
  const estimatedDelivery = new Date(orderDate);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  document.getElementById('dateReceived').textContent = orderDate.toLocaleDateString();

  // Payment confirmed (day after order)
  const paymentDate = new Date(orderDate);
  paymentDate.setDate(paymentDate.getDate() + 1);
  document.getElementById('datePayment').textContent = paymentDate.toLocaleDateString();
  markTimelineStep(2, ['processing', 'confirmed', 'shipped', 'delivered'].includes(order.status));

  // Preparing shipment (2-3 days after order)
  const shippingDate = new Date(orderDate);
  shippingDate.setDate(shippingDate.getDate() + 3);
  const isShipping = ['shipped', 'delivered'].includes(order.status);
  document.getElementById('dateShipping').textContent = isShipping 
    ? shippingDate.toLocaleDateString() 
    : 'Estimated 2-3 business days';
  markTimelineStep(3, isShipping);

  // Out for delivery
  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + 5);
  const isOutForDelivery = order.status === 'shipped' || order.status === 'delivered';
  document.getElementById('dateDelivery').textContent = isOutForDelivery 
    ? deliveryDate.toLocaleDateString() 
    : 'Tracking number to be provided';
  markTimelineStep(4, isOutForDelivery);

  // Delivered
  const deliveredDate = order.status === 'delivered' 
    ? new Date(orderDate).toLocaleDateString() 
    : 'Expected by ' + estimatedDelivery.toLocaleDateString();
  document.getElementById('estimatedDelivery').textContent = estimatedDelivery.toLocaleDateString();
  markTimelineStep(5, order.status === 'delivered');

  // Shipping address
  const addr = order.shippingData;
  document.getElementById('shippingAddress').innerHTML = `
    ${addr.fullName}<br/>
    ${addr.address}<br/>
    ${addr.city}, ${addr.state} ${addr.postal}<br/>
    ${addr.country}
  `;

  // Shipping method
  const methods = {
    'swiftpay-card': 'Credit/Debit Card via SwiftPay',
    'swiftpay-wallet': 'SwiftPay Wallet',
    'swiftpay-bancnet': 'Local Bank Transfer'
  };
  document.getElementById('shippingMethod').textContent = methods[order.paymentMethod] || 'SwiftPay';

  // Items
  const itemsHtml = order.items.map(item => `
    <div class="tracking-item">
      <p><strong>${item.name}</strong></p>
      <p class="muted">Qty: ${item.quantity} | $${item.total.toFixed(2)}</p>
    </div>
  `).join('');
  document.getElementById('trackingItems').innerHTML = itemsHtml;
}

function markTimelineStep(stepNumber, isCompleted) {
  const marker = document.getElementById('marker' + stepNumber);
  if (isCompleted) {
    marker.classList.add('completed');
    marker.innerHTML = '<span>✓</span>';
  }
}

function startNewSearch() {
  document.getElementById('trackingForm').style.display = 'block';
  document.getElementById('trackingResult').style.display = 'none';
  document.getElementById('trackingError').style.display = 'none';
  document.getElementById('trackingForm').reset();
}

function resetTracking() {
  startNewSearch();
}

function getOrder(orderId) {
  const orders = JSON.parse(localStorage.getItem('orders') || '{}');
  return orders[orderId];
}

// Initialize if on tracking page
if (document.getElementById('trackingForm')) {
  document.getElementById('trackingForm').addEventListener('submit', searchOrder);
}
