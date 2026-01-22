// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let services = {};
let parts = {};

/* ===== ЗАГРУЗКА КАТАЛОГА С СЕРВЕРА ===== */
function loadCatalog() {
  console.log('Загружаю каталог с сервера...');
  return fetch('/api/items')
    .then(res => {
      if (!res.ok) throw new Error('Ошибка загрузки: ' + res.status);
      return res.json();
    })
    .then(data => {
      console.log('Каталог загружен:', data);
      return data;
    })
    .catch(err => {
      console.error('Ошибка при загрузке каталога:', err);
      return {
        services: [],
        parts: []
      };
    });
}

let allServices = [];
let allParts = [];

function applyCatalogData(data) {
  if (!data) return;

  allServices = data.services || [];
  allParts = data.parts || [];

  // Инициализируем фильтрацию
  filterAndRender();
}

function filterAndRender() {
  const searchTerm = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
  const typeFilter = document.getElementById('typeFilter')?.value || 'all';
  const priceFrom = parseFloat(document.getElementById('priceFrom')?.value) || 0;
  const priceTo = parseFloat(document.getElementById('priceTo')?.value) || Infinity;

  let filteredServices = allServices;
  let filteredParts = allParts;

  // Фильтрация по поиску
  if (searchTerm) {
    filteredServices = filteredServices.filter(s =>
      s.name.toLowerCase().includes(searchTerm) ||
      s.description.toLowerCase().includes(searchTerm)
    );
    filteredParts = filteredParts.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm)
    );
  }

  // Фильтрация по цене
  filteredServices = filteredServices.filter(s => s.price >= priceFrom && s.price <= priceTo);
  filteredParts = filteredParts.filter(p => p.price >= priceFrom && p.price <= priceTo);

  // Рендер в зависимости от типа
  if (typeFilter === 'service') {
    renderServices(filteredServices);
    renderParts([]);
  } else if (typeFilter === 'part') {
    renderServices([]);
    renderParts(filteredParts);
  } else {
    renderServices(filteredServices);
    renderParts(filteredParts);
  }
}

function calculatePrice(item, engineVolume) {
  if (!engineVolume || !item.pricingRules?.engineVolume) {
    return item.price; // базовая цена, если нет правил
  }
  const rule = item.pricingRules.engineVolume.find(r => engineVolume <= r.upTo);
  return rule ? rule.price : item.pricingRules.engineVolume.slice(-1)[0].price;
}

/* ===== РЕНДЕР УСЛУГ ===== */
function renderServices(servicesArray) {
  const container = document.querySelector('.services-grid');
  if (!container) return;

  container.innerHTML = '';

  if (!servicesArray.length) {
    container.innerHTML = '<p class="empty-message">Услуги не загружены</p>';
    return;
  }

  servicesArray.forEach(service => {
    const card = document.createElement('article');
    card.className = 'service-card';
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const finalPrice = calculatePrice(service, user?.car?.engineVolume);

    // Замена service.parts?.length → явная проверка
    const hasParts = service.parts && service.parts.length > 0;
    const partsHTML = hasParts
      ? `<p><strong>Включает:</strong></p>
         <ul>${service.parts.map(p => `<li>${p}</li>`).join('')}</ul>`
      : '';

    card.innerHTML = `
      <h3>${service.name}</h3>
      <p class="price">${finalPrice} ₽</p>
      <p class="desc">${service.description}</p>
      <div class="service-parts">${partsHTML}</div>
      <button class="btn-select-service" data-service="${service.name}">Выбрать</button>
    `;

    container.appendChild(card);
  });

  document.querySelectorAll('.btn-select-service').forEach(btn => {
    btn.addEventListener('click', handleSelectService);
  });
}

function handleSelectService(e) {
  e.preventDefault();
  const serviceName = this.dataset.service;
  const selectedService = document.getElementById('selectedService');
  if (selectedService) {
    selectedService.value = serviceName;
  }
}

/* ===== РЕНДЕР ЗАПЧАСТЕЙ ===== */
function renderParts(partsArray) {
  const container = document.querySelector('.parts-grid');
  if (!container) return;

  container.innerHTML = '';

  if (!partsArray.length) {
    container.innerHTML = '<p class="empty-message">Запчасти не загружены</p>';
    return;
  }

  partsArray.forEach(part => {
    const card = document.createElement('article');
    card.className = 'part-card';
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const finalPrice = calculatePrice(part, user?.car?.engineVolume);

    const imageHtml = part.image
      ? `<div class="part-image"><img src="${part.image}" alt="${part.name}" onerror="this.parentElement.style.display='none'"></div>`
      : '';

    card.innerHTML = `
      ${imageHtml}
      <h3>${part.name}</h3>
      <p class="price">${finalPrice} ₽</p>
      <p class="desc">${part.description}</p>
      <button class="btn-to-cart" data-part="${part.name}">В корзину</button>
    `;

    container.appendChild(card);
  });
}

/* ===== РАБОТА С ЗАПИСЯМИ НА СЕРВЕРЕ ===== */

function loadRecords() {
  return fetch('/api/records')
    .then(res => res.json())
    .catch(() => []);
}

function deleteRecordFromServer(id) {
  return fetch(`/api/records/${id}`, { method: 'DELETE' });
}

function clearAllRecords() {
  return fetch('/api/records', { method: 'DELETE' });
}

function submitBooking(record) {
  return fetch('/api/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
}

/* ===== ОТОБРАЖЕНИЕ БЛИЖАЙШИХ ЗАПИСЕЙ ===== */
async function displayUpcomingBookings() {
  try {
    const records = await loadRecords();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureRecords = records
      .filter(r => new Date(r.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    const el = document.getElementById('upcomingBookings');
    if (!el) return;

    if (futureRecords.length === 0) {
      el.innerHTML = '<p class="empty-message">Нет предстоящих записей</p>';
      return;
    }

    el.innerHTML = futureRecords.map(record => `
      <div class="booking-item">
        <div class="booking-info">
          <h4>${record.clientName}</h4>
          <p><strong>Услуга:</strong> ${record.service}</p>
          <p><strong>Дата:</strong> ${new Date(record.date).toLocaleDateString('ru-RU')} ${record.time}</p>
          <p><strong>Автомобиль:</strong> ${record.carModel}</p>
          <p><strong>Стоимость:</strong> ${record.total} ₽</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Ошибка загрузки записей:', err);
  }
}

/* ===== АДМИНИСТРИРОВАНИЕ ===== */
async function updateAdmin() {
  try {
    const records = await loadRecords();
    const recordsList = document.getElementById('adminRecordsList');
    if (!recordsList) return;

    if (records.length === 0) {
      recordsList.innerHTML = '<p class="empty-message">Записей нет</p>';
    } else {
      recordsList.innerHTML = records.map((r, i) => `
        <div class="admin-record-item">
          <div class="record-header">
            <span class="record-number">#${i + 1}</span>
            <button class="btn-delete-record" data-id="${r.id}">Удалить</button>
          </div>
          <div class="record-details">
            <p><strong>Имя:</strong> ${r.clientName}</p>
            <p><strong>Телефон:</strong> ${r.clientPhone}</p>
            <p><strong>Email:</strong> ${r.clientEmail}</p>
            <p><strong>Авто:</strong> ${r.carModel}</p>
            <p><strong>Услуга:</strong> ${r.service}</p>
            <p><strong>Дата:</strong> ${r.date} ${r.time}</p>
            <p><strong>Стоимость:</strong> ${r.total} ₽</p>
          </div>
        </div>
      `).join('');

      // Обработчики удаления
      document.querySelectorAll('.btn-delete-record').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          await deleteRecordFromServer(id);
          updateAdmin();
          displayUpcomingBookings();
        });
      });
    }

    // Статистика
    const totalRecordsEl = document.getElementById('totalRecords');
    if (totalRecordsEl) {
      totalRecordsEl.textContent = records.length;
    }

    const today = new Date().toISOString().split('T')[0];
    const todayCount = records.filter(r => r.date === today).length;
    
    const todayRecordsEl = document.getElementById('todayRecords');
    if (todayRecordsEl) {
      todayRecordsEl.textContent = todayCount;
    }

    const total = records.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalRevenueEl = document.getElementById('totalRevenue');
    if (totalRevenueEl) {
      totalRevenueEl.textContent = total + ' ₽';
    }
  } catch (err) {
    console.error('Ошибка обновления админки:', err);
  }
}

/* ===== ОБРАБОТЧИК ФОРМЫ БРОНИРОВАНИЯ ===== */
document.addEventListener('DOMContentLoaded', async function () {
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const clientName = document.getElementById('clientName').value.trim();
      const clientPhone = document.getElementById('clientPhone').value.trim();
      const clientEmail = document.getElementById('clientEmail').value.trim();
      const carModel = document.getElementById('carModel').value.trim();
      const selectedService = document.getElementById('selectedService').value;
      const bookingDate = document.getElementById('bookingDate').value;
      const bookingTime = document.getElementById('bookingTime').value;
      const comments = document.getElementById('comments').value.trim();

      // Проверка даты
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(bookingDate);
      if (selectedDate < today) {
        window.showNotification('Нельзя записаться на прошедшую дату');
        return;
      }

      // Проверка времени
      if (!bookingTime) {
        window.showNotification('Выберите время');
        return;
      }

      if (!clientName || !clientPhone || !carModel || !selectedService || !bookingDate || !bookingTime) {
        window.showNotification('Пожалуйста, заполните все обязательные поля');
        return;
      }

      const service = services[selectedService];
      if (!service) {
        window.showNotification('Выбранная услуга не найдена');
        return;
      }

      const partsCost = (service.parts || []).reduce((sum, partName) => {
        return sum + (parts[partName] ? parts[partName].price : 0);
      }, 0);

      const total = service.price + partsCost;

      const record = {
        clientName,
        clientPhone,
        clientEmail,
        carModel,
        service: selectedService,
        date: bookingDate,
        time: bookingTime,
        comments,
        total
      };

      try {
        await submitBooking(record);
        bookingForm.reset();
        window.showNotification(`Вы записаны на ${bookingDate} в ${bookingTime}. Стоимость: ${total} ₽`);
        displayUpcomingBookings();
        updateAdmin();
      } catch (err) {
        alert('Ошибка отправки записи. Попробуйте позже.');
        console.error(err);
      }
    });
  }

  // Кнопки администрирования
  const btnShowAllRecords = document.getElementById('btnShowAllRecords');
  if (btnShowAllRecords) {
    btnShowAllRecords.addEventListener('click', () => {
      updateAdmin();
      const adminSection = document.getElementById('admin');
      if (adminSection) {
        adminSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const btnClearRecords = document.getElementById('btnClearRecords');
  if (btnClearRecords) {
    btnClearRecords.addEventListener('click', async () => {
        await clearAllRecords();
        updateAdmin();
        displayUpcomingBookings();
        window.showNotification('Все записи удалены');
    });
  }

  // ===== ВАЛИДАЦИЯ ДАТЫ И ВРЕМЕНИ =====
  function setupBookingValidation() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const minDate = `${year}-${month}-${day}`;

    const dateInput = document.getElementById('bookingDate');
    const timeSelect = document.getElementById('bookingTime');

    if (dateInput) {
      dateInput.min = minDate; // Запретить прошлые даты
    }

    if (timeSelect) {
      // Генерация временных слотов: 9:00, 9:30, ..., 17:30
      timeSelect.innerHTML = '<option value="">Выберите время</option>';
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute of ['00', '30']) {
          const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
          const option = document.createElement('option');
          option.value = timeValue;
          option.textContent = timeValue;
          timeSelect.appendChild(option);
        }
      }
    }
  }

  // ===== ПОИСК И ФИЛЬТРАЦИЯ =====
  const searchInput = document.getElementById('searchInput');
  const typeFilter = document.getElementById('typeFilter');
  const priceFrom = document.getElementById('priceFrom');
  const priceTo = document.getElementById('priceTo');
  const resetFilters = document.getElementById('resetFilters');

  if (searchInput) {
    searchInput.addEventListener('input', filterAndRender);
  }
  if (typeFilter) {
    typeFilter.addEventListener('change', filterAndRender);
  }
  if (priceFrom) {
    priceFrom.addEventListener('input', filterAndRender);
  }
  if (priceTo) {
    priceTo.addEventListener('input', filterAndRender);
  }
  if (resetFilters) {
    resetFilters.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (typeFilter) typeFilter.value = 'all';
      if (priceFrom) priceFrom.value = '';
      if (priceTo) priceTo.value = '';
      filterAndRender();
    });
  }

  // Инициализация
  console.log('Инициализирую приложение...');
  const catalog = await loadCatalog();
  applyCatalogData(catalog);
  await displayUpcomingBookings();
  await updateAdmin();
  setupBookingValidation();
  console.log('Приложение готово!');
});