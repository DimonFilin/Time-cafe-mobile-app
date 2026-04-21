# Mobile Chat Feature

Техническое описание chat-функционала в `mobile-app`.

## Основной поток

1. Пользователь открывает booking details.
2. Переходит в чат по `orderId`/booking fallback.
3. Приложение:
   - получает/создает чат через HTTP,
   - загружает историю сообщений,
   - подключается к Socket.IO namespace `/order-chats`.

## Realtime поведение

- Входящие сообщения приходят через `chat:message:new`.
- Typing статус приходит через `chat:typing`.
- Для локально отправленного и realtime-сообщения включена дедупликация по `message.id`.
- Автоскролл в конец выполняется только если пользователь уже был внизу списка.

## Вложения

- До 4 изображений на сообщение.
- Upload выполняется перед отправкой сообщения.
- Пока идет upload, отправка блокируется.
- По клику открывается preview-модалка с кнопкой скачивания.
- Для upload используется `fetch + FormData` (вместо axios) для стабильной работы в React Native/Expo.

## Сетевые детали

- WS endpoint берется из `EXPO_PUBLIC_SHARED_API_URL`.
- Upload использует `FormData` и Bearer token из auth store.
- Для диагностики upload включены расширенные логи transport/HTTP ошибок:
  - request URL/method/status,
  - response body (если есть),
  - transport-level error diagnostics.

## Известные edge-cases

- Если signed URL содержит `localhost`, изображение не откроется на физическом устройстве.
- При нестабильной сети socket может переподключаться; обработчики построены с учетом reconnection.
