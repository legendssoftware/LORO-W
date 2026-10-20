'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClients } from '@/api/hooks/use-clients';
import { useDeleteTakeoffMutation, useIssueTakeoffMutation, useTakeoff } from '@/api/hooks/use-takeoff';
import { PRICE_LISTS } from '@/api/types/takeoff';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { formatQty, formatTakeoffMoney } from '@/app/takeoff/format';

export function TakeoffDetailContent({ uid }: { uid: number }) {
  const router = useRouter();
  const query = useTakeoff(uid);
  const clientsQuery = useClients({ limit: 500 });
  const remove = useDeleteTakeoffMutation();
  const issue = useIssueTakeoffMutation(uid);
  const [priceListType, setPriceListType] = useState<string>(PRICE_LISTS[0].value);
  const [clientUid, setClientUid] = useState('');
  const takeoff = query.data;

  async function onDelete() {
    await remove.mutateAsync(uid);
    router.push('/takeoff');
  }

  async function onIssue() {
    await issue.mutateAsync({
      priceListType,
      clientUid: clientUid ? Number(clientUid) : takeoff?.clientUid ?? undefined,
    });
  }

  if (query.isLoading) return <div className="p-6"><LoadingSpinner /></div>;
  if (query.isError || !takeoff) {
    return <p className="text-destructive p-6 text-sm">{getQueryErrorMessage(query.error)}</p>;
  }

  const selectedClient = clientUid || (takeoff.clientUid ? String(takeoff.clientUid) : '');

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{takeoff.reference?.trim() || `Takeoff ${takeoff.uid}`}</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {takeoff.status}
            {takeoff.clientName ? ` · ${takeoff.clientName}` : ''}
            {takeoff.quotationNumber ? ` · ${takeoff.quotationNumber}` : ''}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/takeoff">Back</Link>
        </Button>
      </div>

      {takeoff.notes ? <p className="text-sm">{takeoff.notes}</p> : null}

      {(takeoff.sections ?? []).map((section) => (
        <Card key={section.uid}>
          <CardHeader>
            <CardTitle className="text-base">{section.systemName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs">
              {Object.entries(section.inputs).map(([key, value]) => `${key}: ${value}`).join(' · ')}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.result.lines.map((line) => (
                  <TableRow key={`${section.uid}-${line.productCode}`}>
                    <TableCell>{line.productCode}</TableCell>
                    <TableCell>
                      {line.description}
                      {!line.matched ? <span className="text-destructive ml-2 text-xs">No catalogue match</span> : null}
                    </TableCell>
                    <TableCell className="text-right">{formatQty(line.qty)}</TableCell>
                    <TableCell className="text-right">{formatTakeoffMoney(line.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-right text-sm">Section total {formatTakeoffMoney(section.result.total)}</p>
          </CardContent>
        </Card>
      ))}

      <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatTakeoffMoney(takeoff.subTotal)}</span></div>
        <div className="flex justify-between"><span>VAT</span><span>{formatTakeoffMoney(takeoff.vat)}</span></div>
        <div className="flex justify-between font-medium"><span>Total</span><span>{formatTakeoffMoney(takeoff.total)}</span></div>
      </div>

      {takeoff.status === 'draft' ? (
        <Card>
          <CardHeader>
            <CardTitle>Issue quotation</CardTitle>
          </CardHeader>
          <CardContent className="grid max-w-lg gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="issue-client">Client</Label>
              <select
                id="issue-client"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={selectedClient}
                onChange={(event) => setClientUid(event.target.value)}
              >
                <option value="">Select a client</option>
                {(clientsQuery.data ?? []).map((client) => (
                  <option key={client.uid} value={client.uid}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="price-list">Price list</Label>
              <select
                id="price-list"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={priceListType}
                onChange={(event) => setPriceListType(event.target.value)}
              >
                {PRICE_LISTS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            {issue.isError ? <p className="text-destructive text-sm">{getQueryErrorMessage(issue.error)}</p> : null}
            {issue.data ? (
              <p className="text-sm">Quotation {issue.data.quotationNumber} created.</p>
            ) : null}
            <div className="flex gap-2">
              <Button disabled={issue.isPending || !selectedClient} onClick={() => void onIssue()}>
                {issue.isPending ? 'Issuing…' : 'Issue quotation'}
              </Button>
              <Button variant="outline" disabled={remove.isPending} onClick={() => void onDelete()}>
                Delete draft
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm">Issued as quotation {takeoff.quotationNumber}.</p>
      )}
    </div>
  );
}
