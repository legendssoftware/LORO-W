'use client';

import { useTranslation } from 'react-i18next';
import type { PulseMood, PulseNamedPerson, PulsePersonDay } from '@/api/types/pulse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MOOD_EXPLANATIONS,
  RISK_REASON_EXPLANATIONS,
  TALK_TO_KEYS,
  buildPersonSummaryKeys,
  contributorKey,
  describePersonStatus,
  moodLabel,
} from '../lib/pulse-explain';
import { PULSE_TONE_STYLES, getScoreTone } from '../lib/pulse-tone';
import { cn } from '@/lib/utils';

interface WellbeingPersonInfoModalProps {
  person: PulseNamedPerson | null;
  history?: PulsePersonDay[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function MoodRow({ period, mood }: { period: string; mood: PulseMood | null }) {
  const { t } = useTranslation('screens');
  if (!mood) {
    return (
      <li>
        <span className="text-foreground font-medium">{period}: —</span>{' '}
        {t('chrome.wellbeing.modal.checkInNotSubmitted')}
      </li>
    );
  }
  const info = MOOD_EXPLANATIONS[mood];
  return (
    <li>
      <span className={cn('font-medium', PULSE_TONE_STYLES[getScoreTone(info.score)].text)}>
        {period}: {t(info.labelKey)} ({info.score}/10)
      </span>{' '}
      {t(info.plainTextKey)}
    </li>
  );
}

/**
 * Explains a wellbeing person card's one-line summary in plain language.
 * Only renders what the API returned; the server already removes confidential details.
 */
export function WellbeingPersonInfoModal({
  person,
  history,
  open,
  onOpenChange,
}: WellbeingPersonInfoModalProps) {
  const { t } = useTranslation('screens');
  const reason = person?.riskReason ? RISK_REASON_EXPLANATIONS[person.riskReason] : null;
  const status = person ? describePersonStatus(person) : null;
  const statusStyle = status ? PULSE_TONE_STYLES[status.tone] : null;
  const askedToTalk = person != null && person.talkTo !== 'none';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[90vw] max-w-xl flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {person
              ? t('chrome.wellbeing.modal.aboutSummary', { name: person.name })
              : t('chrome.wellbeing.modal.summary')}
          </DialogTitle>
          <DialogDescription>
            {history?.length
              ? t('chrome.wellbeing.modal.historyDesc')
              : t('chrome.wellbeing.modal.explanationDesc')}
          </DialogDescription>
        </DialogHeader>

        {person ? (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 text-sm leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-semibold">{t('chrome.wellbeing.modal.inPlainWords')}</h3>
              {status && statusStyle ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    statusStyle.badge,
                  )}
                >
                  <span className={cn('size-2 rounded-full', statusStyle.dot)} aria-hidden />
                  {t(status.labelKey)}
                </span>
              ) : null}
              <p className="text-muted-foreground">
                {buildPersonSummaryKeys(person)
                  .map((part) => (part.params ? t(part.key, part.params) : t(part.key)))
                  .join(' ')}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">{t('chrome.wellbeing.modal.whatSummaryMeans')}</h3>
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
                <MoodRow period={t('chrome.wellbeing.columns.morning')} mood={person.morningMood} />
                <MoodRow period={t('chrome.wellbeing.columns.evening')} mood={person.eveningMood} />
                {reason ? (
                  <li>
                    <span
                      className={cn(
                        'font-medium',
                        PULSE_TONE_STYLES[person.riskReason === 'support' ? 'warn' : 'bad'].text,
                      )}
                    >
                      {t(reason.labelKey)}:
                    </span>{' '}
                    {t(reason.plainTextKey)}
                  </li>
                ) : null}
              </ul>
              <p className="text-muted-foreground text-xs">
                {t('chrome.wellbeing.modal.dashMeaning')}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">{t('chrome.wellbeing.modal.whatTheyShared')}</h3>
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
                <li>
                  {askedToTalk
                    ? t('chrome.wellbeing.askedToSpeak', { who: t(TALK_TO_KEYS[person.talkTo]) })
                    : t('chrome.wellbeing.didNotAsk')}
                </li>
                <li>
                  {person.followUpRequested
                    ? t('chrome.wellbeing.askedFollowUp')
                    : t('chrome.wellbeing.modal.noFollowUp')}
                </li>
                {person.contributors.length ? (
                  <li>
                    {t('chrome.wellbeing.modal.affectedMood')}:{' '}
                    {person.contributors.map((tag) => t(contributorKey(tag))).join(', ')}.
                  </li>
                ) : null}
                {person.comments ? (
                  <li>{t('chrome.wellbeing.modal.theirComment')}: &ldquo;{person.comments}&rdquo;</li>
                ) : null}
              </ul>
            </section>

            {history?.length ? (
              <section className="space-y-2">
                <h3 className="font-semibold">{t('chrome.wellbeing.modal.wellnessOverTime')}</h3>
                <ul className="text-muted-foreground space-y-1.5">
                  {history.map((day) => (
                    <li key={day.date} className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="w-24 shrink-0 font-medium text-foreground">{day.date}</span>
                      <span>
                        {t('chrome.wellbeing.columns.morning')} {moodLabel(day.morningMood)}
                        {day.morningScore != null ? ` (${day.morningScore}/10)` : ''}
                      </span>
                      <span>
                        {t('chrome.wellbeing.columns.evening')} {moodLabel(day.eveningMood)}
                        {day.eveningScore != null ? ` (${day.eveningScore}/10)` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {reason ? (
              <section className="space-y-2">
                <h3 className="font-semibold">{t('chrome.wellbeing.modal.suggestedNextStep')}</h3>
                <p className="text-muted-foreground">{t(reason.suggestedActionKey)}</p>
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className="font-semibold">{t('chrome.wellbeing.modal.keepInMind')}</h3>
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
                <li>{t('chrome.wellbeing.modal.checkInDisclaimer')}</li>
                <li>{t('chrome.wellbeing.modal.confidentialityNote')}</li>
              </ul>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
