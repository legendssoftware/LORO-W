'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, Mail, Phone, User } from 'lucide-react';
import type { ClientProfileData } from '@/api/types/client-portal';
import {
  formatAddress,
  getCustomField,
  getSalesRepName,
} from '@/lib/client-portal-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ClientAccountInfoCard({
  client,
  showQuickLinks = false,
}: {
  client: ClientProfileData;
  showQuickLinks?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const address = formatAddress(client.address);
  const rep = client.assignedSalesRep;

  return (
    <Card className="border-t-4 border-t-amber-400">
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
            <User className="size-4 text-muted-foreground" />
            <span>Sales rep: {getSalesRepName(client)}</span>
          </div>
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="text-primary underline">
                {client.email}
              </a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" />
              <a
                href={`tel:${client.phone.replace(/\s/g, '')}`}
                className="text-primary underline"
              >
                {client.phone}
              </a>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Show less' : 'View more'}
          <ChevronDown
            className={cn('ml-2 size-4 transition-transform', expanded && 'rotate-180')}
          />
        </Button>

        {expanded && (
          <div className="pt-2 border-t space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Tax: </span>
              {getCustomField(client, 'taxNumber')}
            </p>
            <p>
              <span className="text-muted-foreground">Reg: </span>
              {getCustomField(client, 'registrationNumber')}
            </p>
            <p>
              <span className="text-muted-foreground">Address: </span>
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
            </p>
            {rep?.email && (
              <p>
                <span className="text-muted-foreground">Rep email: </span>
                <a href={`mailto:${rep.email}`} className="text-primary underline">
                  {rep.email}
                </a>
              </p>
            )}
            {rep?.phone && (
              <p>
                <span className="text-muted-foreground">Rep phone: </span>
                <a href={`tel:${rep.phone}`} className="text-primary underline">
                  {rep.phone}
                </a>
              </p>
            )}
          </div>
        )}

        {showQuickLinks && (
          <div className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/store">Store</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/reports?tab=credit">Reports</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/orders">Orders</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">Projects</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
