export const handleApiError = (
  err: any,
  t: (key: string) => string,
  showToast: (type: 'danger' | 'success' | 'info' | 'warning', message: string) => void,
) => {
  const code = (err?.error_code as string | undefined)?.toLowerCase?.() ?? 'generic';
  showToast('danger', t(`common:errors.${code}`));
};
