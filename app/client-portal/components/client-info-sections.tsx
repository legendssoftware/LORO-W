'use client';

import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('portal');
  const social = client.socialMedia;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-5 text-violet-600" />
            {t('company')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label={t('companyName')} value={client.name} />
          <Info label={t('contactPerson')} value={client.contactPerson} icon={User} />
          <Info label={t('industry')} value={client.industry} />
          <Info label={t('category')} value={client.category} />
          <Info label={t('description')} value={client.description} className="sm:col-span-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="size-5 text-violet-600" />
            {t('contact')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label={t('email')} value={client.email} icon={Mail} href={client.email ? `mailto:${client.email}` : undefined} />
          <Info label={t('phone')} value={client.phone} icon={Phone} href={client.phone ? `tel:${client.phone}` : undefined} />
          <Info label={t('altPhone')} value={client.alternativePhone} />
          <Info label={t('website')} value={client.website} icon={Globe} href={client.website} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-5 text-violet-600" />
            {t('location')}
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
            {t('financial')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Info label={t('priceTier')} value={client.priceTier} icon={Tag} />
          <Info label={t('discount')} value={client.discountPercentage != null ? `${client.discountPercentage}%` : undefined} icon={Percent} />
          <Info label={t('lifetimeValue')} value={client.lifetimeValue != null ? formatZar(client.lifetimeValue) : undefined} icon={TrendingUp} />
          <Info label={t('paymentTerms')} value={client.paymentTerms} />
        </CardContent>
      </Card>

      {(social?.linkedin || social?.twitter || social?.facebook || social?.instagram) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('social')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {social.linkedin && <SocialLink icon={Linkedin} label={t('linkedIn')} href={social.linkedin} />}
            {social.twitter && <SocialLink label={t('twitter')} href={social.twitter} />}
            {social.facebook && <SocialLink label={t('facebook')} href={social.facebook} />}
            {social.instagram && <SocialLink label={t('instagram')} href={social.instagram} />}
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
