# Time Cafe - Mobile App

Мобильное приложение для клиентов Time Cafe.

## Технологии

- React Native
- Expo
- TypeScript
- React Query - для работы с API
- Zustand - для управления состоянием
- React Hook Form - для форм
- React Navigation - для навигации

## Установка

```bash
npm install
```

## Настройка

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Установите переменные окружения:
- `EXPO_PUBLIC_SHARED_API_URL` - URL общего API
- `EXPO_PUBLIC_CAFE_API_URL` - URL API кофейни

## Запуск

```bash
# Запуск Expo
npm start

# Запуск на Android
npm run android

# Запуск на iOS
npm run ios

# Запуск на Web
npm run web
```

## Структура проекта

- `src/config` - Конфигурация (API клиенты)
- `src/types` - TypeScript типы
- `src/store` - Zustand хранилища состояния
- `src/modules` - Модули приложения (будут добавлены)

## Функционал

- Регистрация и авторизация
- Просмотр и редактирование профиля
- Управление балансом и картами
- Поиск и просмотр кофеен
- Бронирование мест
- Просмотр истории бронирований
- QR код для входа в кофейню
- Заказы и чеки




