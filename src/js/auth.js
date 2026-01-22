$(function () {
  const CURRENT_USER_KEY = 'currentUser';

  // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
  function setError($input) {
    $input.addClass("error").removeClass("valid");
  }

  function setValid($input) {
    $input.removeClass("error").addClass("valid");
  }

  function clearState($input) {
    $input.removeClass("error valid");
  }

  function showMessage(selector, text) {
    const $el = $(selector);
    if (text) {
      $el.text(text).show();
    } else {
      $el.hide().text('');
    }
  }

  function showNotification(text) {
    let $note = $("#notification");
    if (!$note.length) {
      $note = $('<div id="notification"></div>').appendTo('body');
    }
    $note.text(text).addClass("show");
    setTimeout(() => $note.removeClass("show"), 3000);
  }

  // ===== ПОЛУЧЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО ДЛЯ UI) =====
  function getCurrentUser() {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  // ===== ВЫХОД =====
  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    location.reload();
  }

  // ===== ОБРАБОТКА ФОРМЫ РЕГИСТРАЦИИ =====
  $("#registerForm").on("submit", function (e) {
    e.preventDefault();

    const $name = $("#name");
    const $password = $("#password");
    const $confirm = $("#confirmPassword");
    const $email = $("#email");
    const $terms = $("#terms");

    let hasError = false;
    clearState($name);
    clearState($password);
    clearState($confirm);
    clearState($email);

    if (!$name.val().trim()) {
      setError($name);
      hasError = true;
    } else {
      setValid($name);
    }

    if ($password.val().length < 8) {
      setError($password);
      hasError = true;
    } else {
      setValid($password);
    }

    if ($password.val() !== $confirm.val()) {
      setError($confirm);
      hasError = true;
    } else {
      setValid($confirm);
    }

    if (!$email.val().includes("@")) {
      setError($email);
      hasError = true;
    } else {
      setValid($email);
    }

    if (!$terms.is(":checked")) {
      hasError = true;
      showMessage("#regMessage", "Необходимо принять условия использования");
      $terms.addClass("error");
      $terms.closest(".form-checkbox").addClass("error");
    } else {
      $terms.removeClass("error");
      $terms.closest(".form-checkbox").removeClass("error");
    }

    if (hasError) {
      showMessage("#regMessage", "Проверьте поля формы");
      return;
    }

    // Отправка на сервер
    $.ajax({
      url: '/api/register',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        name: $name.val().trim(),
        email: $email.val().trim(),
        password: $password.val(),
        carModel: $('#carModel').val().trim(),
        engineVolume: parseFloat($('#engineVolume').val())
      }),
      success: function (data) {  
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        showNotification("Регистрация прошла успешно!");
        setTimeout(() => window.location.href = 'index.html', 1500);
      },
      error: function (xhr) {
        const err = xhr.responseJSON?.error || 'Ошибка регистрации';
        showMessage("#regMessage", err);
        setError($email);
      }
    });
  });

  // ===== ОБРАБОТКА ФОРМЫ ВХОДА =====
  $("#loginForm").on("submit", function (e) {
    e.preventDefault();

    const $email = $("#loginEmail");
    const $password = $("#loginPassword");

    clearState($email);
    clearState($password);

    let hasError = false;

    if (!$email.val().includes("@")) {
      setError($email);
      showMessage("#loginMessage", "Некорректный email");
      hasError = true;
    } else {
      setValid($email);
    }

    if ($password.val().length < 8) {
      setError($password);
      showMessage("#loginMessage", "Пароль должен быть не менее 8 символов");
      hasError = true;
    } else {
      setValid($password);
    }

    if (hasError) return;

    // Отправка на сервер
    $.ajax({
      url: '/api/login',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        email: $email.val(),
        password: $password.val()
      }),
      success: function (data) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
        showNotification("Вход выполнен!");
        setTimeout(() => window.location.href = 'index.html', 1500);
      },
      error: function (xhr) {
        const err = xhr.responseJSON?.error || 'Ошибка входа';
        showMessage("#loginMessage", err);
        setError($email);
      }
    });
  });

  // ===== УПРАВЛЕНИЕ КНОПКАМИ НА КАРТОЧКАХ =====
  function updateProductButtons() {
    const user = getCurrentUser();

    if (!user) {
      $('.btn-to-cart, .btn-select-service').hide();
    } else if (user.role === 'admin') {
      $('.btn-to-cart, .btn-select-service').each(function () {
        const $btn = $(this);
        $btn
          .removeClass('btn-to-cart btn-select-service')
          .addClass('btn-delete-admin')
          .text('Удалить')
          .show();
      });
    } else {
      $('.btn-to-cart, .btn-select-service').show();
    }
  }

  // ===== НАБЛЮДЕНИЕ ЗА КАРТОЧКАМИ =====
  const observer = new MutationObserver(function (mutations) {
    for (let mutation of mutations) {
      if (mutation.type === 'childList' && $('.service-card, .part-card').length > 0) {
        updateProductButtons();
        break;
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(updateProductButtons, 100);

  // ===== УДАЛЕНИЕ КАРТОЧЕК (АДМИН) =====
  $(document).on('click', '.btn-delete-admin', function () {
    const $card = $(this).closest('.service-card, .part-card');
    const name = $card.find('h3').text().trim();
    const isService = $card.hasClass('service-card');
    const type = isService ? 'service' : 'part';

    $.ajax({
      url: `/api/items/${type}/${encodeURIComponent(name)}`,
      method: 'DELETE',
      success: function () {
        $card.fadeOut(300, function () {
          $(this).remove();
        });
      },
      error: function () {
        alert('Ошибка удаления карточки');
      }
    });
  });

  // ===== ОТОБРАЖЕНИЕ UI В ЗАВИСИМОСТИ ОТ РОЛИ =====
  function renderUserUI() {
    const user = getCurrentUser();
    const isAuthPage = location.pathname.includes('login') || location.pathname.includes('reg');

    $('body').removeClass('is-auth is-user is-admin');

    if (user) {
      if (user.role === 'admin') {
        $('body').addClass('is-admin');
      } else {
        $('body').addClass('is-user');
      }
    }

    $('#authButtons, #userInfo, .btn-cart').hide();
    $('#adminNav').remove();

    if (user) {
      $('#userInfo').show();
      $('#userName').text(user.name);
      $('#userRole').text(user.role === 'admin' ? '(Администратор)' : '(Пользователь)');
      $('#logoutBtn').off('click').on('click', logout);
      
      if (user.car && user.car.model && user.car.engineVolume) {
        const carText = `${user.car.model} • ${user.car.engineVolume} л`;
        $('#userCarInfo').text(carText).show();
      } else {
        $('#userCarInfo').hide();
      }

      if (user.role === 'admin') {
        $('.btn-cart').hide();
        $('#booking').hide();
        $('#nav-booking').hide();
        $('.btn-secondary').hide();
        $('header nav ul').append('<li id="adminNav"><a href="index.html#admin">Администрирование</a></li>');
        $('#admin').show();
      } else {
        $('.btn-cart').show();
        $('#admin').hide();
        $('#booking').show();
        $('#nav-booking').show();
        $('.btn-secondary').show();
      }
    } else {
      $('#authButtons').show();
      $('#admin').hide();
      $('#booking').hide();
      $('#nav-booking').hide();
      $('.btn-secondary').hide();
      if (!isAuthPage) {
        $('.btn-cart').hide();
      }
    }

    // ===== ДОБАВЛЕНИЕ ТОВАРА (АДМИН) — ТОЛЬКО НА index.html =====
    if (document.getElementById('btnAddItem') && document.getElementById('addItemModal')) {
      const addItemModal = document.getElementById('addItemModal');
      const addItemForm = document.getElementById('addItemForm');
      const itemTypeSelect = document.getElementById('itemType');
      const servicePartsDiv = document.getElementById('serviceParts');
      const partImageDiv = document.getElementById('partImage');

      // Показать/скрыть поля в зависимости от типа
      itemTypeSelect.addEventListener('change', () => {
        if (itemTypeSelect.value === 'service') {
          servicePartsDiv.style.display = 'block';
          partImageDiv.style.display = 'none';
        } else {
          servicePartsDiv.style.display = 'none';
          partImageDiv.style.display = 'block';
        }
      });

      // Открыть модалку
      document.getElementById('btnAddItem').addEventListener('click', () => {
        addItemForm.reset();
        itemTypeSelect.dispatchEvent(new Event('change'));
        addItemModal.style.display = 'block';
      });

      // Закрыть модалку
      document.getElementById('closeModal').addEventListener('click', () => {
        addItemModal.style.display = 'none';
      });

      // Отправка формы
      addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
          type: itemTypeSelect.value,
          name: document.getElementById('itemName').value.trim(),
          price: document.getElementById('itemPrice').value,
          description: document.getElementById('itemDesc').value.trim(),
          parts: document.getElementById('itemParts')?.value || '',
          image: document.getElementById('itemImage')?.value.trim() || ''
        };

        try {
          const res = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });

          if (!res.ok) throw new Error('Ошибка добавления');

          showNotification('Товар успешно добавлен!');
          addItemModal.style.display = 'none';

          // Перезагрузить каталог
          const catalog = await loadCatalog();
          applyCatalogData(catalog);
        } catch (err) {
          showNotification('Не удалось добавить товар: ' + (err.message || 'ошибка'));
        }
      });
    }
  }

  // ===== ЗАЩИТА СТРАНИЦЫ КОРЗИНЫ =====
  const currentPage = location.pathname.split('/').pop();
  if (currentPage === 'cart.html') {
    const user = getCurrentUser();
    if (!user || user.role !== 'user') {
      window.location.href = 'login.html';
      return;
    }
  }

  // ===== ЗАПУСК =====
  renderUserUI();

  // Обновляем счётчик корзины при загрузке любой страницы
  if (typeof window.updateCartCountHeader === 'function') {
    // Но только если пользователь — обычный
    const user = getCurrentUser();
    if (user && user.role === 'user') {
      // Загружаем корзину и обновляем счётчик
      fetch(`/api/cart/${user.id}`)
        .then(res => res.json())
        .then(cart => {
          const count = cart.reduce((s, i) => s + i.qty, 0);
          $('#cartCount').text(count);
        })
        .catch(() => $('#cartCount').text('0'));
    }
  }

  // ===== СБРОС ОШИБОК ПРИ ВВОДЕ =====
  $(document).on("input", "input", function () {
    if ($(this).hasClass("error")) {
      $(this).removeClass("error");
    }
  });

  // Экспорт
  window.showNotification = showNotification;
});