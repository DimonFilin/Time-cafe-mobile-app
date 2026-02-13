import en from './en.json';

type Dict = Record<string, any>;
const dict: Dict = en as Dict;

export function t(key: string): string {
  const parts = key.split('.');
  let cur: any = dict;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object' || !(part in cur)) return key;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : key;
}

