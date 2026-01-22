// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const DATA_DIR = path.join(__dirname, 'src', 'data');

// Вспомогательные функции
function readJSON(filename) {
  const fullPath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;
  const data = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(data || '[]');
}

function writeJSON(filename, data) {
  const fullPath = path.join(DATA_DIR, filename);
  // Создаём папку, если не существует
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
}

// ===== ИНИЦИАЛИЗАЦИЯ ПО УМОЛЧАНИЮ =====
function initDefaultData() {
  // Пользователи
  if (!fs.existsSync(path.join(DATA_DIR, 'users.json'))) {
    writeJSON('users.json', []);
  }

  // Каталог
  if (!fs.existsSync(path.join(DATA_DIR, 'items.json'))) {
    writeJSON('items.json', {
      services: [
        {
          id: 1,
          name: "Замена масла и фильтров",
          price: 2000,
          description: "Замена моторного масла и масляного фильтра",
          parts: ["Моторное масло 5W-30", "Масляный фильтр"]
        }
      ],
      parts: [
        {
          id: 1,
          name: "Моторное масло 5W-30",
          price: 1500,
          description: "Синтетическое масло, объём 4л"
        }
      ]
    });
  }

  // Записи
  if (!fs.existsSync(path.join(DATA_DIR, 'records.json'))) {
    writeJSON('records.json', []);
  }
}

initDefaultData();

// ===== API: Получить каталог =====
app.get('/api/items', (req, res) => {
  try {
    const items = readJSON('items.json') || { services: [], parts: [] };
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки каталога' });
  }
});

// ===== API: Получить пользователей =====
app.get('/api/users', (req, res) => {
  try {
    const users = readJSON('users.json') || [];
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки пользователей' });
  }
});

// ===== API: Регистрация =====
app.post('/api/register', (req, res) => {
  try {
    const { name, email, password, carModel, engineVolume } = req.body;
    let users = readJSON('users.json') || [];

    if (users.some(u => u.email === email)) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      role: 'user',
      car: {
        model: carModel,
        engineVolume: engineVolume
      }
    };

    users.push(newUser);
    writeJSON('users.json', users);
    res.json({ message: 'Регистрация успешна', user: newUser });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// ===== API: Вход =====
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readJSON('users.json') || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    res.json({ message: 'Вход выполнен', user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// ===== API: Удаление карточки (админ) =====
app.delete('/api/items/:type/:name', (req, res) => {
  try {
    const { type, name } = req.params;
    const items = readJSON('items.json') || { services: [], parts: [] };

    if (type === 'service') {
      items.services = items.services.filter(s => s.name !== name);
    } else if (type === 'part') {
      items.parts = items.parts.filter(p => p.name !== name);
    } else {
      return res.status(400).json({ error: 'Неверный тип' });
    }

    writeJSON('items.json', items);
    res.json({ message: 'Карточка удалена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// ===== API: Запись на приём =====
app.post('/api/booking', (req, res) => {
  try {
    const record = req.body;
    const records = readJSON('records.json') || [];
    records.push({
      ...record,
      id: Date.now(),
      createdAt: new Date().toISOString()
    });
    writeJSON('records.json', records);
    res.json({ message: 'Запись создана', id: record.id });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка записи' });
  }
});

// ===== API: Получить все записи =====
app.get('/api/records', (req, res) => {
  try {
    const records = readJSON('records.json') || [];
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки записей' });
  }
});

// ===== API: Удалить запись по ID =====
app.delete('/api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    let records = readJSON('records.json') || [];
    records = records.filter(r => r.id != id); // != для строк/чисел
    writeJSON('records.json', records);
    res.json({ message: 'Запись удалена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка удаления записи' });
  }
});

// ===== API: Очистить все записи =====
app.delete('/api/records', (req, res) => {
  try {
    writeJSON('records.json', []);
    res.json({ message: 'Все записи удалены' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка очистки' });
  }
});

// ===== API: Получить корзину (только для авторизованного пользователя) =====
app.get('/api/cart/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    const cart = readJSON(`cart_${userId}.json`) || [];
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка загрузки корзины' });
  }
});

// ===== API: Сохранить корзину =====
app.post('/api/cart/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Неверный ID пользователя' });
    }
    writeJSON(`cart_${userId}.json`, req.body);
    res.json({ message: 'Корзина сохранена' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сохранения корзины' });
  }
});

// ===== API: Добавить товар/услугу =====
app.post('/api/items', (req, res) => {
  try {
    const { type, name, price, description, parts, image } = req.body;

    if (!type || !name || !price || !description) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const items = readJSON('items.json') || { services: [], parts: [] };

    const newItem = {
      id: Date.now(),
      name,
      price: Number(price),
      description
    };

    if (type === 'service') {
      newItem.parts = (parts || '').split('\n').map(p => p.trim()).filter(p => p);
      items.services.push(newItem);
    } else if (type === 'part') {
      if (image) newItem.image = image;
      items.parts.push(newItem);
    } else {
      return res.status(400).json({ error: 'Неверный тип' });
    }

    writeJSON('items.json', items);
    res.json({ message: 'Товар добавлен', item: newItem });
  } catch (err) {
    console.error('Ошибка добавления товара:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Запуск
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
});