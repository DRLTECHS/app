// Cart management
const PRODUCTS = [
  { id: 1, name: 'Pro Gaming Headset', price: 89.00 },
  { id: 2, name: 'RGB Mechanical Keyboard', price: 119.00 },
  { id: 3, name: '4K Streaming Camera', price: 149.00 },
  { id: 4, name: 'Ultra Gaming Mouse', price: 79.00 },
  { id: 5, name: 'Stream Deck Console', price: 129.00 },
  { id: 6, name: 'Gaming USB Hub', price: 59.00 }
];

function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '{}');
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(productId, quantity = 1) {
  const cart = getCart();
  const key = 'product_' + productId;
  cart[key] = (cart[key] || 0) + quantity;
  saveCart(cart);
  alert('Item added to cart!');
}

function removeFromCart(productId) {
  const cart = getCart();
  const key = 'product_' + productId;
  delete cart[key];
  saveCart(cart);
  renderCart();
}

function updateCartQuantity(productId, quantity) {
  const cart = getCart();
  const key = 'product_' + productId;
  if (quantity <= 0) {
    delete cart[key];
  } else {
    cart[key] = quantity;
  }
  saveCart(cart);
  renderCart();
}

function getCartTotals() {
  const cart = getCart();
  let subtotal = 0;
  const items = [];

  for (const [key, qty] of Object.entries(cart)) {
    const productId = parseInt(key.replace('product_', ''));
    const product = PRODUCTS.find(p => p.id === productId);
    if (product) {
      subtotal += product.price * qty;
      items.push({
        ...product,
        quantity: qty,
        total: product.price * qty
      });
    }
  }

  const shipping = subtotal > 0 ? (subtotal > 200 ? 0 : 10) : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return { subtotal, shipping, tax, total, items };
}

function renderCart() {
  const { subtotal, shipping, tax, total, items } = getCartTotals();
  const cartItemsDiv = document.getElementById('cartItems');
  const emptyCart = document.getElementById('emptyCart');

  if (items.length === 0) {
    cartItemsDiv.innerHTML = '';
    emptyCart.style.display = 'block';
  } else {
    emptyCart.style.display = 'none';
    cartItemsDiv.innerHTML = items.map(item => `
      <div class="cart-item">
        <div class="item-info">
          <h3>${item.name}</h3>
          <p class="item-price">$${item.price.toFixed(2)} each</p>
        </div>
        <div class="item-quantity">
          <button onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
          <input type="number" value="${item.quantity}" readonly />
          <button onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
        </div>
        <div class="item-total">
          <p>$${item.total.toFixed(2)}</p>
          <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('subtotal').textContent = '$' + subtotal.toFixed(2);
  document.getElementById('shipping').textContent = '$' + shipping.toFixed(2);
  document.getElementById('tax').textContent = '$' + tax.toFixed(2);
  document.getElementById('total').textContent = '$' + total.toFixed(2);
}

function proceedToCheckout() {
  const { items } = getCartTotals();
  if (items.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  window.location.href = 'checkout.html';
}

// Initialize cart on page load
if (document.getElementById('cartItems')) {
  renderCart();
}
