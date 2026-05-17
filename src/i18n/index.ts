import en from './en.json';
import ru from './ru.json';

type Dict = Record<string, any>;

// Используем русский язык по умолчанию
const dict: Dict = ru as Dict;

export function t(key: string): string {
  const parts = key.split('.');
  let cur: any = dict;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return key;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : key;
}

