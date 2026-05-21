'use client';

import {
  Building2,
  CreditCard,
  DollarSign,
  FileText,
  Mail,
  MapPin,
  Phone,
  Receipt,
  TrendingUp,
  User,
} from 'lucide-react';
import type { ClientProfileData } from '@/api/types/client-portal';
import {
  formatAddress,
  formatZar,
  getCustomField,
  getSalesRepName,
} from '@/lib/client-portal-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ClientAccountInfoCard({ client }: { client: ClientProfileData }) {
  const address = formatAddress(client.address);
  const rep = client.assignedSalesRep;
  const creditLimit = client.creditLimit ?? 0;
  const outstanding = client.outstandingBalance ?? 0;
  const availableCredit = Math.max(0, creditLimit - outstanding);

  return (
    <Card className="border-t-4 border-t-amber-400 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-5 text-violet-600" />
          {client.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{client.contactPerson}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid gap-1 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground shrink-0" />
            <span>Sales rep: {getSalesRepName(client)}</span>
          </div>
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${client.email}`} className="text-primary underline">
                {client.email}
              </a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <a
                href={`tel:${client.phone.replace(/\s/g, '')}`}
                className="text-primary underline"
              >
                {client.phone}
              </a>
            </div>
          )}
        </div>

        <div className="grid gap-1 text-sm sm:grid-cols-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground shrink-0" />
            <span>Reg: {getCustomField(client, 'registrationNumber')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-muted-foreground shrink-0" />
            <span>Tax: {getCustomField(client, 'taxNumber')}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground shrink-0" />
            <span>Credit limit: {formatZar(creditLimit)}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-muted-foreground shrink-0" />
            <span>Outstanding: {formatZar(outstanding)}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground shrink-0" />
            <span>Available: {formatZar(availableCredit)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground shrink-0" />
            <span>Payment terms: {client.paymentTerms ?? '—'}</span>
          </div>
        </div>

        <div className="grid gap-1 text-sm sm:grid-cols-2 pt-2 border-t">
          <div className="flex items-start gap-2 sm:col-span-2">
            <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              Address:{' '}
              {address !== '—' ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  {address}
                </a>
              ) : (
                '—'
              )}
            </span>
          </div>
          {rep?.email && (
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground shrink-0" />
              <span>
                Rep email:{' '}
                <a href={`mailto:${rep.email}`} className="text-primary underline">
                  {rep.email}
                </a>
              </span>
            </div>
          )}
          {rep?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <span>
                Rep phone:{' '}
                <a href={`tel:${rep.phone}`} className="text-primary underline">
                  {rep.phone}
                </a>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
