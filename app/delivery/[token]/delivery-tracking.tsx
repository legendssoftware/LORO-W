'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Star } from 'lucide-react';
import { getPublicDelivery, submitPublicDeliveryRating } from '@/api/endpoints/epod';
import type { PublicDelivery } from '@/api/types/epod';
import { deliveryStatusClassName } from '@/app/deliveries/format';
import { BrandMark } from '@/components/brand-mark';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DeliveryTrackingMap } from './delivery-tracking-map';

const STAR_SCORES = [1, 2, 3, 4, 5] as const;
const COMMENT_MAX = 500;

const VIOLET_BUTTON =
  'h-9 w-full border-0 bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500';

interface DeliveryTrackingProps {
  token: string;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function DeliveryTracking({ token }: DeliveryTrackingProps) {
  const [delivery, setDelivery] = useState<PublicDelivery | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const next = await getPublicDelivery(token);
      setDelivery(next);
    } catch (error) {
      setDelivery(null);
      setLoadError(error instanceof Error ? error.message : 'This delivery link could not be opened');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = useCallback(async () => {
    if (score == null || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitPublicDeliveryRating(token, {
        score,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setHasSubmitted(true);
      setDelivery((current) => (current ? { ...current, ratingOpen: false } : current));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The rating could not be saved');
    } finally {
      setIsSubmitting(false);
    }
  }, [comment, isSubmitting, score, token]);

  const showThanks = delivery != null && delivery.status === 'recorded' && (!delivery.ratingOpen || hasSubmitted);

  return (
    <main className="bg-background text-foreground min-h-screen">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4 md:max-w-xl md:px-6">
          <BrandMark priority wordmarkClassName="text-lg font-semibold tracking-tight" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6 md:max-w-xl md:px-6 md:py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Your delivery</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {delivery?.clientName || 'Track this stop and rate it once it has been delivered.'}
            </p>
          </div>
          {delivery ? (
            <Badge variant="outline" className={deliveryStatusClassName(delivery.status)}>
              {delivery.statusLabel}
            </Badge>
          ) : null}
        </div>

        {isLoading ? <LoadingSpinner /> : null}

        {!isLoading && loadError ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link unavailable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive text-sm">{loadError}</p>
            </CardContent>
          </Card>
        ) : null}

        {!isLoading && delivery ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stop</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <DetailRow label="Status" value={delivery.statusLabel} />
                <DetailRow label="Driver" value={delivery.driverFirstName} />
                <DetailRow label="Invoice No." value={delivery.invoiceNumber} />
                <DetailRow label="Customer" value={delivery.clientName || '—'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <DeliveryTrackingMap
                  clientName={delivery.clientName}
                  driverFirstName={delivery.driverFirstName}
                  latitude={delivery.latitude}
                  longitude={delivery.longitude}
                  arrivalLat={delivery.arrivalLat}
                  arrivalLng={delivery.arrivalLng}
                />
                {delivery.status === 'assigned' || delivery.status === 'in_progress' ? (
                  <>
                    <p className="text-muted-foreground text-xs">
                      The driver pin appears after arrival. Refresh to update this map.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full"
                      aria-label="Refresh delivery location"
                      onClick={() => void load()}
                    >
                      Refresh location
                    </Button>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {delivery.ratingOpen && !hasSubmitted ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How was the delivery?</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex gap-2" role="group" aria-label="Delivery rating">
                    {STAR_SCORES.map((value) => {
                      const selected = score != null && value <= score;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-label={`Rate ${value} out of 5`}
                          aria-pressed={score === value}
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-md border',
                            selected
                              ? 'border-violet-600 bg-violet-600 text-white'
                              : 'border-border bg-card text-muted-foreground',
                          )}
                          onClick={() => setScore(value)}
                        >
                          <Star className="size-5" fill={selected ? 'currentColor' : 'none'} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="delivery-rating-comment">Comment</Label>
                    <Textarea
                      id="delivery-rating-comment"
                      value={comment}
                      maxLength={COMMENT_MAX}
                      placeholder="Optional"
                      aria-label="Optional comment"
                      onChange={(event) => setComment(event.target.value)}
                    />
                    <p className="text-muted-foreground text-xs">{comment.length}/{COMMENT_MAX}</p>
                  </div>
                  {submitError ? <p className="text-destructive text-sm">{submitError}</p> : null}
                  <Button
                    type="button"
                    className={VIOLET_BUTTON}
                    disabled={score == null || isSubmitting}
                    aria-label="Submit rating"
                    onClick={() => void handleSubmit()}
                  >
                    {isSubmitting ? 'Sending…' : 'Submit rating'}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {showThanks ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thank you</CardTitle>
                </CardHeader>
                <CardContent className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                  <p className="text-muted-foreground text-sm">Your rating has been recorded.</p>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
