'use client';

import {
  Building2,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Percent,
  Phone,
  Tag,
  TrendingUp,
  User,
} from 'lucide-react';
import type { ClientProfileData } from '@/api/types/client-portal';
import { formatAddress, formatZar } from '@/lib/client-portal-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ClientInfoSections({ client }: { client: ClientProfileData }) {
  const social = client.socialMedia;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-5 text-violet-600" />
            Company
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Company name" value={client.name} />
          <Info label="Contact person" value={client.contactPerson} icon={User} />
          <Info label="Industry" value={client.industry} />
          <Info label="Category" value={client.category} />
          <Info label="Description" value={client.description} className="sm:col-span-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="size-5 text-violet-600" />
            Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Email" value={client.email} icon={Mail} href={client.email ? `mailto:${client.email}` : undefined} />
          <Info label="Phone" value={client.phone} icon={Phone} href={client.phone ? `tel:${client.phone}` : undefined} />
          <Info label="Alt phone" value={client.alternativePhone} />
          <Info label="Website" value={client.website} icon={Globe} href={client.website} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-5 text-violet-600" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{formatAddress(client.address)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="size-5 text-violet-600" />
            Financial
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Price tier" value={client.priceTier} icon={Tag} />
          <Info label="Discount" value={client.discountPercentage != null ? `${client.discountPercentage}%` : undefined} icon={Percent} />
          <Info label="Lifetime value" value={client.lifetimeValue != null ? formatZar(client.lifetimeValue) : undefined} icon={TrendingUp} />
          <Info label="Payment terms" value={client.paymentTerms} />
        </CardContent>
      </Card>

      {(social?.linkedin || social?.twitter || social?.facebook || social?.instagram) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Social</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {social.linkedin && <SocialLink icon={Linkedin} label="LinkedIn" href={social.linkedin} />}
            {social.twitter && <SocialLink label="Twitter" href={social.twitter} />}
            {social.facebook && <SocialLink label="Facebook" href={social.facebook} />}
            {social.instagram && <SocialLink label="Instagram" href={social.instagram} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  icon: Icon,
  href,
  className,
}: {
  label: string;
  value?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  className?: string;
}) {
  const display = value?.trim() || '—';
  return (
    <div className={className}>
      <p className="text-xs uppercase text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="size-3" />}
        {label}
      </p>
      {href && display !== '—' ? (
        <a href={href} className="text-sm text-primary underline mt-0.5 block" target="_blank" rel="noreferrer">
          {display}
        </a>
      ) : (
        <p className="text-sm mt-0.5">{display}</p>
      )}
    </div>
  );
}

function SocialLink({
  icon: Icon,
  label,
  href,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary underline">
      {Icon && <Icon className="size-4" />}
      {label}
    </a>
  );
}
