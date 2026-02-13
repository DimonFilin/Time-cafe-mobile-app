export function getErrorMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;

  const anyErr = err as any;
  return (
    anyErr?.response?.data?.message ||
    anyErr?.message ||
    anyErr?.toString?.() ||
    'Unknown error'
  );
}

