'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import type { ClientQuotation } from '@/api/types/client-portal';
import {
  canClientCancelOrder,
  canClientEditOrder,
} from '@/lib/client-order-actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CancelOrderDialog } from './cancel-order-dialog';
import { useReorderOrder } from './use-reorder-order';

export function OrderActionsMenu({
  order,
  stayOnPage = false,
  onEdit,
}: {
  order: ClientQuotation;
  /** Reorder opens the cart without leaving the store. */
  stayOnPage?: boolean;
  /** When set, Edit stays on the current page instead of opening the detail route. */
  onEdit?: () => void;
}) {
  const { t } = useTranslation('portal');
  const router = useRouter();
  const reorder = useReorderOrder();
  const [cancelOpen, setCancelOpen] = useState(false);
  const canEdit = canClientEditOrder(order.status);
  const canCancel = canClientCancelOrder(order.status);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('orderActions')}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push(`/orders/${order.uid}`)}>
            {t('viewOrder')}
          </DropdownMenuItem>
          {canEdit ? (
            <DropdownMenuItem
              onSelect={() => {
                if (onEdit) {
                  onEdit();
                  return;
                }
                router.push(`/orders/${order.uid}?edit=1`);
              }}
            >
              {t('editOrder')}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => reorder(order, stayOnPage)}>
            {t('reorder')}
          </DropdownMenuItem>
          {canCancel ? (
            <DropdownMenuItem variant="destructive" onSelect={() => setCancelOpen(true)}>
              {t('cancelOrder')}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <CancelOrderDialog order={order} open={cancelOpen} onOpenChange={setCancelOpen} />
    </>
  );
}
