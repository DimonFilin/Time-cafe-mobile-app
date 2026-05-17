const BALANCE_MESSAGES: Record<string, string> = {
  'Insufficient balance':
    'У вас на балансе недостаточно средств. Пополните баланс с карты в профиле или выберите другой способ оплаты.',
};

export function getErrorMessage(err: unknown): string {
  if (!err) return 'Неизвестная ошибка';
  if (typeof err === 'string') {
    return BALANCE_MESSAGES[err] ?? err;
  }

  const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
  const raw =
    anyErr?.response?.data?.message ||
    anyErr?.message ||
    (typeof anyErr?.toString === 'function' ? anyErr.toString() : '');
  if (typeof raw === 'string' && BALANCE_MESSAGES[raw]) return BALANCE_MESSAGES[raw];
  if (typeof raw === 'string' && /insufficient balance/i.test(raw)) {
    return BALANCE_MESSAGES['Insufficient balance'];
  }
  return raw || 'Неизвестная ошибка';
}

