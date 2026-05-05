import Swal from 'sweetalert2';

/**
 * Helper de confirmação baseado no padrão Confirm Alert do template Zynix
 * (`A:/Arquivos/zynix_template/dist/html/sweet_alerts.html`).
 *
 * Diferença chave: **sem ícone** (decisão do utilizador). Texto + botões
 * Bootstrap em vez do styling default do SweetAlert.
 *
 * Uso:
 *   const ok = await confirmAction({
 *     title:       t('confirm.submit.title'),
 *     text:        t('confirm.submit.text'),
 *     confirmText: t('confirm.submit.confirm'),
 *     cancelText:  tc('actions.cancel'),
 *     variant:     'primary',
 *   });
 *   if (!ok) return;
 *   // ... acção
 */
export interface ConfirmOptions {
  title:       string;
  text?:       string;
  confirmText: string;
  cancelText:  string;
  /** Cor do botão de confirmação. Default: 'primary'. */
  variant?:    'primary' | 'danger' | 'warning' | 'success';
}

export async function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  const variantClass = `btn btn-${opts.variant ?? 'primary'} m-1`;
  const result = await Swal.fire({
    title:             opts.title,
    text:              opts.text,
    showCancelButton:  true,
    confirmButtonText: opts.confirmText,
    cancelButtonText:  opts.cancelText,
    customClass: {
      confirmButton: variantClass,
      cancelButton:  'btn btn-secondary m-1',
    },
    buttonsStyling: false,
    // Sem ícone — decisão do utilizador.
  });
  return result.isConfirmed;
}
