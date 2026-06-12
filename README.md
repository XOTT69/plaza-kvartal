# 🏠 Мій Дім — PWA для мешканців будинку

Progressive Web App для багатоквартирного будинку. Встановлюється на телефон як звичайний додаток, працює онлайн та частково офлайн.

## 📱 Можливості

- **📢 Оголошення** — адмін публікує важливі новини
- **🆘 Аварійні контакти** — телефонні номери служб
- **🗳 Голосування** — створення та участь у голосуваннях
- **📌 Сусідські оголошення** — "віддам", "шукаю", "знайшов"
- **⚠️ Проблеми** — повідомити про проблему, адмін керує статусами
- **📅 Події** — календар зборів, прибирань, свят
- **⚙️ Адмінка** — управління квартирами, контактами, оголошеннями

## 🔧 Як налаштувати

### 1. Створи Firebase проект (безкоштовно)

1. Перейди на [https://console.firebase.google.com](https://console.firebase.google.com)
2. Натисни **Створити проект** (або "Add project")
3. Введи назву, наприклад `my-dim`
4. *Google Analytics можна вимкнути*
5. Після створення — натисни **Web-додаток** (або `</>` іконка)
6. Скопіюй конфіг — він виглядає так:
```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "my-dim-xxxxx.firebaseapp.com",
  projectId: "my-dim-xxxxx",
  ...
};
```

### 2. Встав конфіг у файл

Відкрий `js/config.js` і **заміни** `firebaseConfig` на свої дані з Firebase.

### 3. Створи колекції в Firestore

У Firebase Console:
1. Ліворуч обери **Firestore Database** → **Створити базу даних**
2. Обери "Почати в тестовому режимі" → **Далі**
3. Створи колекції (натисни **Старт колекції**):

#### Колекція `apartments`
Створи документи для кожної квартири:

| ID документа | Поле | Тип | Значення |
|-------------|------|-----|----------|
| `1` | `code` | string | `1234` (код для входу) |
| | `name` | string | `Квартира 1` |
| | `isAdmin` | boolean | `true` (для адміна) |

Для всіх 24 квартир створи документи з ID "1", "2", "3"... "24".  
**Увага:** хоча б одну квартиру зроби `isAdmin: true` (наприклад свою), щоб мати доступ до адмінки.

#### Колекція `announcements`
Документи створяться самі через додаток. Поля: `title`, `content`, `author`, `authorApt`, `createdAt`.

#### Колекція `contacts`
Документи створяться через адмінку. Поля: `name`, `phone`, `category`, `icon`, `order`.

#### Колекція `polls`
Для голосувань. Поля: `question`, `options`, `active`, `createdAt`.

#### Колекція `neighborPosts`
Для сусідських оголошень. Поля: `category`, `title`, `content`, `contact`, `author`, `createdAt`.

#### Колекція `issues`
Для проблем. Поля: `title`, `description`, `status`, `author`, `authorApt`, `lastComment`, `createdAt`.

#### Колекція `events`
Для подій. Поля: `title`, `description`, `eventDate`, `createdAt`.

### 4. Налаштуй правила Firestore (⚠️ важливо!)

У Firebase Console: Firestore Database → Rules

Встав ці правила:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ Це відкриває доступ до всіх даних. Для справжнього використання краще налаштувати безпечніші правила.

### 5. Залий на GitHub

```bash
cd my-dim-pwa
git init
git add .
git commit -m "Initial commit"
```

Створи репозиторій на [GitHub](https://github.com) і виконай:

```bash
git remote add origin https://github.com/ТВІЙ_ЛОГІН/my-dim.git
git branch -M main
git push -u origin main
```

### 6. Підключи Vercel

1. Перейди на [https://vercel.com](https://vercel.com)
2. Увійди через GitHub
3. Натисни **Add New** → **Project**
4. Обери репозиторій `my-dim`
5. Налаштування залиш за замовчуванням — Vercel сам визначить, що це статика
6. Натисни **Deploy**

Через хвилину твій додаток буде доступний за URL: `https://my-dim.vercel.app`

### 7. Встанови на телефон

1. Відкрий URL додатку в браузері на телефоні (Chrome/Safari)
2. Натисни **Share** (Поділитися) → **Add to Home Screen** (На екран додому)
3. Додаток з'явиться на телефоні як звичайний додаток 🎉

## 👨‍💼 Ролі

**Адмін (isAdmin: true):**
- Створює оголошення
- Створює голосування
- Додає події
- Керує контактами
- Керує квартирами та кодами
- Змінює статуси проблем

**Мешканець:**
- Переглядає оголошення, контакти, події
- Голосує
- Створює сусідські оголошення
- Повідомляє про проблеми (бачить тільки свої)

## 📋 Структура файлів

```
my-dim-pwa/
├── index.html        # Головна сторінка
├── manifest.json     # PWA налаштування
├── sw.js             # Service Worker
├── vercel.json       # Vercel конфіг
├── css/
│   └── styles.css    # Всі стилі
├── js/
│   ├── config.js     # Firebase конфіг
│   ├── auth.js       # Вхід/вихід
│   ├── db.js         # Firestore операції
│   ├── router.js     # Навігація
│   ├── ui.js         # Рендер сторінок
│   ├── admin.js      # Адмінка
│   └── app.js        # Ініціалізація
└── README.md
```

## 🆘 Потрібна допомога?

Якщо щось не працює — перевір:
1. Чи правильний `firebaseConfig` у `config.js`
2. Чи створені колекції в Firestore
3. Чи додані правила Firestore (читання/запис для всіх)
4. Чи створені документи в колекції `apartments`