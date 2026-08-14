// Checkout flow management
function proceedToPayment() {
  const form = document.getElementById('checkoutForm');
  const formData = new FormData(form);
  
  // Validate shipping form
  if (!form.fullName.value || !form.email.value || !form.phone.value || 
      !form.address.value || !form.city.value || !form.postal.value) {
    alert('Please fill in all required fields');
    return;
  }

  // Save shipping data to session storage
  const shippingData = {
    fullName: form.fullName.value,
    email: form.email.value,
    phone: form.phone.value,
    country: form.country.value,
    address: form.address.value,
    city: form.city.value,
    state: form.state.value || '',
    postal: form.postal.value,
    billingSame: form.billingSame.checked
  };

  sessionStorage.setItem('shippingData', JSON.stringify(shippingData));

  // Update progress
  document.getElementById('step1').classList.add('completed');
  document.getElementById('step2').classList.add('active');

  // Hide shipping section, show payment section
  document.getElementById('shippingSection').style.display = 'none';
  document.getElementById('paymentSection').style.display = 'block';
}

function goBackToShipping() {
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step1').classList.remove('completed');
  
  document.getElementById('paymentSection').style.display = 'none';
  document.getElementById('shippingSection').style.display = 'block';
}

function proceedToConfirm() {
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
  sessionStorage.setItem('paymentMethod', paymentMethod);

  // Update progress
  document.getElementById('step2').classList.add('completed');
  document.getElementById('step3').classList.add('active');

  // Populate review section
  const shippingData = JSON.parse(sessionStorage.getItem('shippingData'));
  const { subtotal, shipping, tax, total } = getCartTotals();

  const shippingAddress = `
    ${shippingData.fullName}<br/>
    ${shippingData.address}<br/>
    ${shippingData.city}, ${shippingData.state} ${shippingData.postal}<br/>
    ${shippingData.country}
  `;

  const paymentMethodLabel = {
    'swiftpay-card': 'Credit/Debit Card via SwiftPay',
    'swiftpay-wallet': 'SwiftPay Wallet',
    'swiftpay-bancnet': 'Local Bank Transfer (BancNet)'
  }[paymentMethod] || 'SwiftPay';

  document.getElementById('reviewShipping').innerHTML = shippingAddress;
  document.getElementById('reviewPayment').textContent = paymentMethodLabel;
  document.getElementById('reviewTotal').textContent = '$' + total.toFixed(2);

  // Hide payment section, show confirm section
  document.getElementById('paymentSection').style.display = 'none';
  document.getElementById('confirmSection').style.display = 'block';
}

function goBackToPayment() {
  document.getElementById('step3').classList.remove('active');
  document.getElementById('step2').classList.remove('completed');
  
  document.getElementById('confirmSection').style.display = 'none';
  document.getElementById('paymentSection').style.display = 'block';
}

function completePayment() {
  const shippingData = JSON.parse(sessionStorage.getItem('shippingData'));
  const paymentMethod = sessionStorage.getItem('paymentMethod');
  const { items, total } = getCartTotals();

  // Create order object
  const order = {
    orderId: generateOrderId(),
    timestamp: new Date().toISOString(),
    shippingData: shippingData,
    paymentMethod: paymentMethod,
    items: items,
    subtotal: items.reduce((sum, item) => sum + item.total, 0),
    shipping: total > items.reduce((sum, item) => sum + item.total, 0) * 1.08 ? 0 : 10,
    tax: items.reduce((sum, item) => sum + item.total, 0) * 0.08,
    total: total,
    status: 'processing',
    paymentStatus: 'pending'
  };

  // Save order
  saveOrder(order);

  // Clear cart and session data
  localStorage.removeItem('cart');
  sessionStorage.removeItem('shippingData');
  sessionStorage.removeItem('paymentMethod');

  // Redirect to confirmation
  window.location.href = 'order-confirmation.html?orderId=' + order.orderId;
}

function generateOrderId() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `ORD-${year}-${random}`;
}

function saveOrder(order) {
  const orders = JSON.parse(localStorage.getItem('orders') || '{}');
  orders[order.orderId] = order;
  localStorage.setItem('orders', JSON.stringify(orders));
}

function getOrder(orderId) {
  const orders = JSON.parse(localStorage.getItem('orders') || '{}');
  return orders[orderId];
}

// Initialize checkout on page load
if (document.getElementById('checkoutForm')) {
  // Prefill email if available from session
  const shippingData = sessionStorage.getItem('shippingData');
  if (shippingData) {
    const data = JSON.parse(shippingData);
    document.getElementById('checkoutForm').fullName.value = data.fullName;
    document.getElementById('checkoutForm').email.value = data.email;
  }
}
