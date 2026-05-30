const BALANCE_MESSAGES: Record<string, string> = {
  'Insufficient balance':
    'У вас на балансе недостаточно средств. Пополните баланс с карты в профиле или выберите другой способ оплаты.',
};

const API_MESSAGE_RULES: Array<{ match: RegExp; text: string }> = [
  { match: /email must be an email/i, text: 'Впишите правильный email, пожалуйста' },
  { match: /email must be a valid email/i, text: 'Впишите правильный email, пожалуйста' },
  { match: /must be an email/i, text: 'Впишите правильный email, пожалуйста' },
  { match: /password must be at least 8/i, text: 'Пароль должен быть не короче 8 символов' },
  { match: /password must be a string/i, text: 'Укажите пароль' },
  { match: /user with this email already exists/i, text: 'Пользователь с таким email уже зарегистрирован' },
  { match: /invalid credentials/i, text: 'Неверный email или пароль' },
  { match: /unauthorized/i, text: 'Неверный email или пароль' },
  { match: /network error/i, text: 'Нет связи с сервером. Проверьте интернет и адрес API' },
  { match: /timeout/i, text: 'Сервер не ответил вовремя. Попробуйте ещё раз' },
];

function translateApiMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'Неизвестная ошибка';
  if (BALANCE_MESSAGES[trimmed]) return BALANCE_MESSAGES[trimmed];
  if (/insufficient balance/i.test(trimmed)) return BALANCE_MESSAGES['Insufficient balance'];

  for (const rule of API_MESSAGE_RULES) {
    if (rule.match.test(trimmed)) return rule.text;
  }

  return trimmed;
}

function extractRawMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;

  const anyErr = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };

  const payloadMsg = anyErr?.response?.data?.message;
  if (Array.isArray(payloadMsg)) {
    return payloadMsg.map((m) => String(m)).join('. ');
  }
  if (typeof payloadMsg === 'string') return payloadMsg;

  return anyErr?.message || (typeof anyErr?.toString === 'function' ? anyErr.toString() : '');
}

export function getErrorMessage(err: unknown): string {
  const raw = extractRawMessage(err);
  if (!raw) return 'Неизвестная ошибка';
  return translateApiMessage(raw);
}
