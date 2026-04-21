# Mobile App

Клиентское мобильное приложение Time Caffe (Expo/React Native).

## Что покрывает приложение

Основные пользовательские сценарии:
- просмотр кофеен и бронирований;
- экран деталей бронирования;
- переход в чат с персоналом из booking/order контекста;
- обмен сообщениями и фото в realtime;
- профиль и базовые пользовательские операции.

## Технологический стек

- Expo + React Native + TypeScript
- React Navigation
- Zustand
- Axios/fetch для API интеграции
- Socket.IO client
- Expo Image Picker

## Быстрый запуск (dev)

```bash
npm install
npx expo start
```

Дополнительные команды:

```bash
npm run android
npm run ios
npm run web
npx tsc --noEmit
```

## Архитектура приложения

- `src/navigation` — маршруты и стек экранов
- `src/screens` — сценарные экраны
- `src/store` — глобальное состояние (auth и др.)
- `src/config` — API клиент и сетевые interceptors
- `src/api` — typed wrappers для backend endpoints
- `src/components` — UI-компоненты и элементы интерфейса

## Сетевой слой

Ключевые переменные:
- `EXPO_PUBLIC_SHARED_API_URL` — основной backend API
- `EXPO_PUBLIC_CAFE_API_URL` — cafe API (если используется экраном)
- `EXPO_PUBLIC_BACKEND_FILE_SYSTEM_URL` — публичный storage endpoint

Особенности:
- авторизация через Bearer token;
- refresh flow для `401`;
- для mobile upload в чат используется `fetch + FormData` (устойчивее для RN transport).

## Чат (текущее поведение)

Реализовано:
- вход в чат из booking details;
- загрузка до 4 изображений;
- блокировка отправки до завершения upload;
- realtime входящие сообщения, typing-индикатор;
- превью и скачивание вложений;
- дедупликация сообщений по `message.id`;
- автоскролл вниз только если пользователь уже внизу.

Подробная техдокументация:
- `docs/CHAT_FEATURE.md`

## Что проверить перед QA

- вход в чат из букинга для разных сценариев заказа;
- text-only и text+attachments отправка;
- mobile upload изображения;
- realtime phone <-> admin-web;
- preview/download вложений.