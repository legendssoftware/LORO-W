'use client';

import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { ClientQuotation } from '@/api/types/client-portal';
import { useCancelClientOrder } from '@/api/hooks/use-client-orders';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { orderTitle } from '@/lib/client-order-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function CancelOrderDialog({
  order,
  open,
  onOpenChange,
  onCancelled,
}: {
  order: ClientQuotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled?: () => void;
}) {
  const { t } = useTranslation('portal');
  const cancelOrder = useCancelClientOrder();

  function handleConfirm() {
    if (!order) return;
    cancelOrder.mutate(order.uid, {
      onSuccess: () => {
        toast.success(t('orderCancelled'));
        onOpenChange(false);
        onCancelled?.();
      },
      onError: (error) => {
        toast.error(getQueryErrorMessage(error, t('cancelOrderFailed')));
      },
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('cancelOrderTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {order
              ? t('cancelOrderDescription', { order: orderTitle(order) })
              : t('cancelOrderDescription', { order: '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelOrder.isPending}>
            {t('keepOrder')}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={cancelOrder.isPending || !order}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {cancelOrder.isPending ? t('cancellingOrder') : t('cancelOrderConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
