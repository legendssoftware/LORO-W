'use client';

import { useState } from 'react';
import type { ClientProfileData, ClientQuotation } from '@/api/types/client-portal';
import { ClientOrdersKanban } from './client-orders-kanban';
import { QuotationDetailDialog } from './quotation-detail-dialog';

export function ClientOrdersContent({ client }: { client: ClientProfileData }) {
  const [selected, setSelected] = useState<ClientQuotation | null>(null);
  const quotations = (client.quotations ?? []) as ClientQuotation[];

  return (
    <div className="space-y-6">
      <ClientOrdersKanban quotations={quotations} onSelect={setSelected} />

      <QuotationDetailDialog
        quotation={selected}
        client={client}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
