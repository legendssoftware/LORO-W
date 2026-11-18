'use client';

import { useSessionSync } from '@/api/hooks';
import {
  useConvertQuotationMutation,
  useQuotationConversionStatus,
  useRollbackQuotationMutation,
} from '@/api/hooks/use-quotation-conversion';
import { Button } from '@/components/ui/button';
import { canConvertQuotations, canRollbackQuotations } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

/**
 * Convert or undo a LORO quotation. Client portal users only see status.
 */
export function QuotationConversionActions({
  quotationRef,
  alreadyConverted,
}: {
  quotationRef: number;
  alreadyConverted?: boolean;
}) {
  const { backendUserData } = useSessionSync();
  const level = backendUserData?.accessLevel;
  const canConvert = canConvertQuotations(level);
  const canRollback = canRollbackQuotations(level);
  const statusQuery = useQuotationConversionStatus(quotationRef, {
    enabled: canConvert || canRollback,
  });
  const convertMutation = useConvertQuotationMutation();
  const rollbackMutation = useRollbackQuotationMutation();
  const converted = statusQuery.data?.converted ?? alreadyConverted ?? false;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {statusQuery.isError
          ? getQueryErrorMessage(statusQuery.error, 'Status unavailable')
          : converted
            ? 'Converted'
            : 'Not converted'}
      </span>
      {canConvert && !converted ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={convertMutation.isPending}
          onClick={() => {
            void convertMutation.mutateAsync(quotationRef).then(
              () => toast.success('Quotation converted'),
              (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not convert'))
            );
          }}
        >
          Convert
        </Button>
      ) : null}
      {canRollback && converted ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={rollbackMutation.isPending}
          onClick={() => {
            void rollbackMutation.mutateAsync(quotationRef).then(
              () => toast.success('Conversion undone'),
              (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not undo'))
            );
          }}
        >
          Undo
        </Button>
      ) : null}
    </div>
  );
}
