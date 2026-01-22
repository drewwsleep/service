// ===== ФУНКЦИОНАЛ КОРЗИНЫ НА СЕРВЕРЕ =====
const BTN_RESET_DELAY = 2000;

// Получить ID текущего пользователя
function getCurrentUserId() {
  const userJson = localStorage.getItem('currentUser');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      return user.role === 'user' ? user.id : null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Загрузить корзину
async function loadCart() {
  const userId = getCurrentUserId();
  if (!userId) return [];

  try {
    const res = await fetch(`/api/cart/${userId}`);
    if (!res.ok) throw new Error('Не удалось загрузить корзину');
    return await res.json();
  } catch (err) {
    console.warn('Ошибка загрузки корзины:', err);
    return [];
  }
}

// Сохранить корзину
async function saveCart(cart) {
  const userId = getCurrentUserId();
  if (!userId) return;

  try {
    await fetch(`/api/cart/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cart)
    });
  } catch (err) {
    console.error('Ошибка сохранения корзины:', err);
    alert('Не удалось сохранить корзину');
  }
}

// Обновить счётчик в хедере (если функция доступна)
function updateCartCountHeader(count) {
  if (typeof window.updateCartCountHeader === 'function') {
    // Передаём count напрямую, чтобы не читать из localStorage
    $('#cartCount').text(count);
  }
}

// Добавление в корзину
async function addToCart(item) {
  const cart = await loadCart();
  const found = cart.find(i => i.type === item.type && i.name === item.name);

  if (found) {
    found.qty++;
  } else {
    cart.push({ ...item, qty: 1 });
  }

  await saveCart(cart);
  const totalCount = cart.reduce((s, i) => s + i.qty, 0);
  updateCartCountHeader(totalCount);
}

// Визуальная обратная связь
function flashAddedButton($btn) {
  const originalText = $btn.text();
  $btn.addClass('added').text('Добавлено');
  setTimeout(() => $btn.removeClass('added').text(originalText), BTN_RESET_DELAY);
}

// Обработка кликов по кнопкам "В корзину" и "Выбрать"
$(document).on('click', '.btn-to-cart, .btn-select-service', async function (e) {
  e.preventDefault();
  const $btn = $(this);
  const isService = $btn.hasClass('btn-select-service');
  const $card = $btn.closest('.service-card, .part-card');
  const name = $card.find('h3').text().trim();
  const price = parseInt(($card.find('.price').text() || '').replace(/\D/g, '') || '0', 10);
  let image = null;
  if (!isService) {
    const $img = $card.find('.part-image img');
    image = $img.length ? $img.attr('src') : null;
  }

  await addToCart({ type: isService ? 'service' : 'part', name, price, image });

  flashAddedButton($btn);

  if (isService) {
    $('#selectedService').val(name);
  }
});

// ===== ИНИЦИАЛИЗАЦИЯ КОРЗИНЫ НА VUE (только на cart.html) =====
if (document.getElementById('cartApp')) {
  const { createApp, ref, computed, onMounted } = Vue;

  function formatPrice(num) {
    return (num || 0).toLocaleString('ru-RU') + ' ₽';
  }

  createApp({
    setup() {
      const cartItems = ref([]);
      const totalPrice = computed(() => {
        return cartItems.value.reduce((sum, item) => sum + item.price * item.qty, 0);
      });

      const saveCartVue = async () => {
        await saveCart(cartItems.value);
        const count = cartItems.value.reduce((s, i) => s + i.qty, 0);
        updateCartCountHeader(count);
      };

      const increaseItem = async (index) => {
        cartItems.value[index].qty++;
        await saveCartVue();
      };

      const decreaseItem = async (index) => {
        if (cartItems.value[index].qty > 1) {
          cartItems.value[index].qty--;
        } else {
          cartItems.value.splice(index, 1);
        }
        await saveCartVue();
      };

      const removeItem = async (index) => {
        cartItems.value.splice(index, 1);
        await saveCartVue();
      };

      const clearCart = async () => {
        cartItems.value = [];
        await saveCartVue();
      };

      // Загрузка корзины — НЕ в setup, а в onMounted
      onMounted(async () => {
        const initialCart = await loadCart();
        cartItems.value = initialCart;
      });

      return {
        cartItems,
        totalPrice,
        formatPrice,
        increaseItem,
        decreaseItem,
        removeItem,
        clearCart
      };
    }
  }).mount('#cartApp');
}

// ===== ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ ЗАКАЗА (order.html) =====
if (document.getElementById('orderItemsContainer')) {
  $(async function () {
    const cart = await loadCart();

    if (cart.length === 0) {
      $('#orderItemsContainer').html('<p class="empty-message">Ваш заказ пуст.</p>');
      return;
    }

    let total = 0;
    let partsCost = 0;
    let servicesCost = 0;

    const $container = $('#orderItemsContainer');
    $container.empty();

    cart.forEach(item => {
      const itemTotal = item.price * item.qty;
      if (item.type === 'part') {
        partsCost += itemTotal;
      } else {
        servicesCost += itemTotal;
      }
      total += itemTotal;

      let imageHtml = '';
      if (item.image) {
        imageHtml = `<img src="${item.image}" alt="${item.name}" class="order-item-image">`;
      } else if (item.type === 'service') {
        imageHtml = '<div class="order-item-icon">⚙️</div>';
      }

      const itemHtml = `
        <div class="order-item">
          ${imageHtml}
          <div class="item-info">
            <strong>${item.name}</strong>
            <div class="item-meta">${item.type === 'service' ? 'Услуга' : 'Запчасть'} — ${item.price.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div class="item-qty">×${item.qty}</div>
        </div>
      `;
      $container.append(itemHtml);
    });

    $('#sumPrice').text(servicesCost.toLocaleString('ru-RU') + ' ₽');
    $('#partsCost').text(partsCost.toLocaleString('ru-RU') + ' ₽');
    $('#total').text(total.toLocaleString('ru-RU') + ' ₽');
    const totalCount = cart.reduce((s, i) => s + i.qty, 0);
    $('#cartCount').text(totalCount);
    $('#cartCountHeader').text(totalCount);
  });
}