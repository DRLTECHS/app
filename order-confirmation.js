// Order confirmation page
function displayOrderConfirmation() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  if (!orderId) {
    window.location.href = 'shop.html';
    return;
  }

  const order = getOrder(orderId);
  if (!order) {
    window.location.href = 'shop.html';
    return;
  }

  // Display order details
  document.getElementById('orderNumber').textContent = order.orderId;
  document.getElementById('orderDate').textContent = new Date(order.timestamp).toLocaleDateString();
  document.getElementById('orderTotal').textContent = '$' + order.total.toFixed(2);
  document.getElementById('confirmEmail').textContent = order.shippingData.email;

  // Display order items
  const itemsHtml = order.items.map(item => `
    <div class="order-item">
      <div class="item-info">
        <h4>${item.name}</h4>
        <p class="muted">Quantity: ${item.quantity}</p>
      </div>
      <div class="item-price">
        $${item.total.toFixed(2)}
      </div>
    </div>
  `).join('');

  document.getElementById('orderItems').innerHTML = itemsHtml;

  // Update order status to confirmed
  order.status = 'confirmed';
  order.paymentStatus = 'confirmed';
  saveOrder(order);
}

function getOrder(orderId) {
  const orders = JSON.parse(localStorage.getItem('orders') || '{}');
  return orders[orderId];
}

function saveOrder(order) {
  const orders = JSON.parse(localStorage.getItem('orders') || '{}');
  orders[order.orderId] = order;
  localStorage.setItem('orders', JSON.stringify(orders));
}

// Initialize on page load
if (document.getElementById('orderNumber')) {
  displayOrderConfirmation();
}
