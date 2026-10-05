'use client';

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
  TALK_TO_LABELS,
  buildPersonSummary,
  contributorLabel,
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
  if (!mood) {
    return (
      <li>
        <span className="text-foreground font-medium">{period}: —</span> The check-in has not been
        submitted yet.
      </li>
    );
  }
  const info = MOOD_EXPLANATIONS[mood];
  return (
    <li>
      <span className={cn('font-medium', PULSE_TONE_STYLES[getScoreTone(info.score)].text)}>
        {period}: {info.label} ({info.score}/10)
      </span>{' '}
      {info.plainText}
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
  const reason = person?.riskReason ? RISK_REASON_EXPLANATIONS[person.riskReason] : null;
  const status = person ? describePersonStatus(person) : null;
  const statusStyle = status ? PULSE_TONE_STYLES[status.tone] : null;
  const askedToTalk = person != null && person.talkTo !== 'none';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[90vw] max-w-xl flex-col overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{person ? `About ${person.name}'s summary` : 'Summary'}</DialogTitle>
          <DialogDescription>
            {history?.length
              ? 'Morning and evening mood for each day in the selected period.'
              : 'What the short line on the card means, in plain words.'}
          </DialogDescription>
        </DialogHeader>

        {person ? (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 text-sm leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-semibold">In plain words</h3>
              {status && statusStyle ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    statusStyle.badge,
                  )}
                >
                  <span className={cn('size-2 rounded-full', statusStyle.dot)} aria-hidden />
                  {status.label}
                </span>
              ) : null}
              <p className="text-muted-foreground">{buildPersonSummary(person)}</p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">What the summary line means</h3>
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
                <MoodRow period="Morning" mood={person.morningMood} />
                <MoodRow period="Evening" mood={person.eveningMood} />
                {reason ? (
                  <li>
                    <span
                      className={cn(
                        'font-medium',
                        PULSE_TONE_STYLES[person.riskReason === 'support' ? 'warn' : 'bad'].text,
                      )}
                    >
                      {reason.label}:
                    </span>{' '}
                    {reason.plainText}
                  </li>
                ) : null}
              </ul>
              <p className="text-muted-foreground text-xs">
                A dash (—) means that check-in has not been submitted today. Mood is scored from 2
                (not feeling well) to 10 (excellent).
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold">What they shared</h3>
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
                <li>
                  {askedToTalk
                    ? `Asked to speak to ${TALK_TO_LABELS[person.talkTo]}.`
                    : 'Did not ask to speak to anyone.'}
                </li>
                <li>{person.followUpRequested ? 'Asked for a follow-up.' : 'No follow-up requested.'}</li>
                {person.contributors.length ? (
                  <li>
                    What affected their mood: {person.contributors.map(contributorLabel).join(', ')}.
                  </li>
                ) : null}
                {person.comments ? <li>Their comment: &ldquo;{person.comments}&rdquo;</li> : null}
              </ul>
            </section>

            {history?.length ? (
              <section className="space-y-2">
                <h3 className="font-semibold">Wellness over time</h3>
                <ul className="text-muted-foreground space-y-1.5">
                  {history.map((day) => (
                    <li key={day.date} className="flex flex-wrap gap-x-3 gap-y-0.5">
                      <span className="w-24 shrink-0 font-medium text-foreground">{day.date}</span>
                      <span>
                        Morning {moodLabel(day.morningMood)}
                        {day.morningScore != null ? ` (${day.morningScore}/10)` : ''}
                      </span>
                      <span>
                        Evening {moodLabel(day.eveningMood)}
                        {day.eveningScore != null ? ` (${day.eveningScore}/10)` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {reason ? (
              <section className="space-y-2">
                <h3 className="font-semibold">Suggested next step</h3>
                <p className="text-muted-foreground">{reason.suggestedAction}</p>
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className="font-semibold">Keep in mind</h3>
              <ul className="text-muted-foreground list-disc space-y-1.5 pl-5">
                <li>
                  A check-in is how someone felt at that moment. It is not a diagnosis or a
                  performance rating.
                </li>
                <li>Treat this information confidentially and share it only with people who need it.</li>
              </ul>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
