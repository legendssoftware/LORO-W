'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Map as MapView, MapControls, MapMarker, MarkerContent } from '@/components/ui/map';
import {
  useAcknowledgePolicy,
  useAdvancePerformanceCase,
  useCreateWeeklyReview,
  useCustomerMap,
  useDecidePolicyException,
  useMarketIntelStock,
  useMyAcknowledgement,
  useMyAgreement,
  useOpenPerformanceCase,
  usePerformanceCases,
  usePolicyExceptions,
  useSignMyAgreement,
  useSignWeeklyReview,
  useUpdateWeeklyReview,
  useWeeklyReviews,
} from '@/api/hooks/use-performance-policy';
import { ReportsPolicySegmentRadial } from './reports-policy-segment-radial';
import { REPORTS_CHART_AMBER, REPORTS_CHART_GREEN, REPORTS_CHART_RED } from '../lib/reports-dashboard-chart-helpers';
import { PolicyAgreementForm } from './policy-agreement-form';

const FALLBACK_CENTER: [number, number] = [28.0473, -26.2041];

/** Employee acknowledgement and optional participation signature. */
export function PolicyAcknowledgementCard() {
  const acknowledgement = useMyAcknowledgement();
  const agreement = useMyAgreement();
  const acknowledge = useAcknowledgePolicy();
  const sign = useSignMyAgreement();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [typedName, setTypedName] = useState('');
  const data = acknowledgement.data;

  if (acknowledgement.isError || !data?.required) return null;

  const minimums = data.minimums;
  const minimumText = minimums
    ? `${minimums.callsPerDay} qualifying calls a day${minimums.visitsPerDay != null ? ` and ${minimums.visitsPerDay} verified visits a day` : ''}.`
    : 'The minimums for your position are on the policy report.';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Policy acknowledgement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Your position minimum is {minimumText} Not taking part in performance pay does not reduce your current salary.
        </p>
        {data.acknowledged ? (
          <p>You acknowledged this policy{data.acknowledgedAt ? ` on ${data.acknowledgedAt.slice(0, 10)}` : ''}.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {data.statements.map((statement) => (
                <li key={statement.key} className="flex items-start gap-2">
                  <Checkbox
                    id={statement.key}
                    checked={accepted[statement.key] === true}
                    onCheckedChange={(checked) => setAccepted((prev) => ({ ...prev, [statement.key]: checked === true }))}
                  />
                  <Label htmlFor={statement.key} className="font-normal leading-snug">
                    {statement.text}
                  </Label>
                </li>
              ))}
            </ul>
            <Input placeholder="Type your full name" value={typedName} onChange={(event) => setTypedName(event.target.value)} />
            <Button
              type="button"
              disabled={acknowledge.isPending}
              onClick={() =>
                acknowledge.mutate({
                  typedName,
                  itemsAccepted: data.statements.filter((statement) => accepted[statement.key]).map((statement) => statement.key),
                })
              }
            >
              Acknowledge the policy
            </Button>
          </>
        )}
        {agreement.data?.participates && !agreement.data.signedAt && data.acknowledged ? (
          <div className="space-y-2 rounded-md border p-3">
            <p>
              You can take part at {agreement.data.currency} {agreement.data.prr} a month when you meet the standard
              (75% to 125%). This is separate from your current salary.
            </p>
            <Button type="button" disabled={sign.isPending} onClick={() => sign.mutate()}>
              I agree to take part
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Pending interruption reports a manager can approve or reject. */
export function PolicyExceptionsCard({ enabled }: { enabled: boolean }) {
  const exceptions = usePolicyExceptions(enabled);
  const decide = useDecidePolicyException();
  const items = exceptions.data ?? [];
  if (!enabled || items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending interruptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {items.map((item) => (
          <div key={item.uid} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <div>
              <p className="font-medium">{item.type.replaceAll('_', ' ')}</p>
              <p className="text-muted-foreground">
                {item.incidentDate}: {item.description}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ uid: item.uid, outcome: 'approve', decision: 'consider_in_review' })}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ uid: item.uid, outcome: 'reject' })}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Customer locations from verified visits. */
export function PolicyCustomerMap({ enabled }: { enabled: boolean }) {
  const map = useCustomerMap(enabled);
  const points = (map.data?.points ?? []).filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  if (!enabled) return null;
  const center = points[0] ? ([points[0].longitude, points[0].latitude] as [number, number]) : FALLBACK_CENTER;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer map</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customer locations yet.</p>
        ) : (
          <div className="h-80 overflow-hidden rounded-md border">
            <MapView center={center} zoom={6}>
              <MapControls />
              {points.slice(0, 200).map((point) => (
                <MapMarker key={point.clientUid} longitude={point.longitude} latitude={point.latitude}>
                  <MarkerContent>
                    <span className="block size-3 rounded-full bg-violet-600" title={point.name ?? 'Customer'} />
                  </MarkerContent>
                </MapMarker>
              ))}
            </MapView>
          </div>
        )}
        {map.data?.truncated ? <p className="mt-2 text-xs text-muted-foreground">Showing the first locations returned.</p> : null}
      </CardContent>
    </Card>
  );
}

/** Shelf observations rolled up by brand. */
export function PolicyStockIntel({ enabled }: { enabled: boolean }) {
  const stock = useMarketIntelStock(enabled);
  if (!enabled) return null;
  const totals = stock.data?.totals;
  const rows = stock.data?.rows ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer stock</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!totals || totals.observations === 0 ? (
          <p className="text-sm text-muted-foreground">No stock observations yet. They appear when visits record what is on the shelf.</p>
        ) : (
          <>
            <ReportsPolicySegmentRadial
              centerLabel={String(totals.customers)}
              centerSub="Customers"
              segments={[
                { key: 'bitdrywall', label: 'BitDrywall', value: totals.bitdrywallCustomers, color: REPORTS_CHART_GREEN },
                { key: 'fuse', label: 'Fuse', value: totals.fuseCustomers, color: REPORTS_CHART_AMBER },
                { key: 'competitor', label: 'Competitor', value: totals.competitorCustomers, color: REPORTS_CHART_RED },
              ]}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="py-1 pr-3 font-medium">Category</th>
                    <th className="py-1 pr-3 font-medium">Brand</th>
                    <th className="py-1 font-medium">Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((row) => (
                    <tr key={`${row.productCategory}-${row.brand ?? ''}`}>
                      <td className="py-1 pr-3">{row.productCategory}</td>
                      <td className="py-1 pr-3">{row.brand ?? '—'}</td>
                      <td className="py-1 tabular-nums">{row.observations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Weekly reviews and the case that can follow them. */
export function PolicyReviewsPanel({ enabled, canManage }: { enabled: boolean; canManage: boolean }) {
  const reviews = useWeeklyReviews(enabled);
  const cases = usePerformanceCases(enabled && canManage);
  const createReview = useCreateWeeklyReview();
  const updateReview = useUpdateWeeklyReview();
  const signReview = useSignWeeklyReview();
  const openCase = useOpenPerformanceCase();
  const advance = useAdvancePerformanceCase();
  const [clerkId, setClerkId] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [typedName, setTypedName] = useState('');

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly performance reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          A review uses the measured week. It is not opened because someone declined to sign. Further action is a note only.
        </p>
        {canManage ? (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <Input placeholder="Employee Clerk id" value={clerkId} onChange={(event) => setClerkId(event.target.value)} />
            <Input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} />
            <Button
              type="button"
              disabled={!clerkId || !weekStart || createReview.isPending}
              onClick={() => createReview.mutate({ userClerkUserId: clerkId.trim(), weekStart })}
            >
              Start review
            </Button>
          </div>
        ) : null}
        {(reviews.data ?? []).map((review) => (
          <div key={review.uid} className="space-y-2 rounded-md border p-3">
            <p className="font-medium">
              Week {review.weekStart} · {review.metrics.status.replaceAll('_', ' ')} · calls {review.metrics.callsActual}/
              {review.metrics.callsExpected ?? '—'}
            </p>
            {canManage ? (
              <>
                <Input
                  placeholder="Reason"
                  defaultValue={review.reason ?? ''}
                  onBlur={(event) => updateReview.mutate({ uid: review.uid, body: { reason: event.target.value } })}
                />
                <Input
                  placeholder="Support required"
                  defaultValue={review.supportRequired ?? ''}
                  onBlur={(event) => updateReview.mutate({ uid: review.uid, body: { supportRequired: event.target.value } })}
                />
                <PolicyAgreementForm clerkUserId={review.userClerkUserId} />
                <Button type="button" size="sm" variant="outline" onClick={() => openCase.mutate({ userClerkUserId: review.userClerkUserId, reviewUid: review.uid })}>
                  Open performance case
                </Button>
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Input className="max-w-xs" placeholder="Type your name" value={typedName} onChange={(event) => setTypedName(event.target.value)} />
              <Button type="button" size="sm" variant="outline" onClick={() => signReview.mutate({ uid: review.uid, role: 'employee', typedName })}>
                Employee sign
              </Button>
              {canManage ? (
                <Button type="button" size="sm" variant="outline" onClick={() => signReview.mutate({ uid: review.uid, role: 'manager', typedName })}>
                  Manager sign
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {canManage
          ? (cases.data ?? []).map((item) => (
              <div key={item.uid} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <p>
                  Case {item.uid}: {item.stage.replaceAll('_', ' ')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['coaching', 'pip', 'formal_review', 'further_action', 'closed'] as const).map((stage) => (
                    <Button key={stage} type="button" size="sm" variant="outline" onClick={() => advance.mutate({ uid: item.uid, stage })}>
                      {stage.replaceAll('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          : null}
      </CardContent>
    </Card>
  );
}
