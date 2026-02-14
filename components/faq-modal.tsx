'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface FaqModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FAQ_ITEMS = [
  {
    q: 'What should I do when I fail to end a shift or start a shift?',
    a: 'Use the "Start Shift" or "End Shift" button on the dashboard when you have a connection. If it keeps failing, check your internet, try again in a few minutes, or contact your manager to correct your times. You can also note the exact time and report it to your admin.',
  },
  {
    q: 'What happens if I forgot to end my shift?',
    a: 'Your time may be recorded as ongoing until corrected. Contact your manager or admin as soon as you can and give them the actual end time. They can adjust your attendance record so your pay and hours are correct.',
  },
  {
    q: 'The app is unresponsive. What can I do?',
    a: 'Try these steps: (1) Force-close the app and open it again. (2) Check your internet (Wi‑Fi or mobile data). (3) Restart your device. (4) Clear the app cache in your device settings if the problem continues. If it still fails, report it with the steps below.',
  },
  {
    q: 'Simple debugging steps',
    a: 'Restart the app, then your device. Check that you are logged in and that date/time on your device are correct. Turn off battery saver or low-power mode while using the app. Ensure the app has the latest update from the store.',
  },
  {
    q: 'How do I send an error with a clear message (and image if possible) to the chat groups?',
    a: 'Describe what you were doing when the error happened, what you see on screen (e.g. error text or a blank screen), and when it occurred. If you can, add a screenshot: take the screenshot, then paste or attach it in the support chat. Mention your device (e.g. iPhone 14, Android) and app version if you know it. This helps the team fix the issue quickly.',
  },
];

const CONTACT_INTRO =
  'For account, shift, or technical issues, reach out to your manager or use your company’s support channel. You can also use the headset icon in the top bar for in-app support when available.';

export function FaqModal({ open, onOpenChange }: FaqModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>FAQ</DialogTitle>
          <DialogDescription>
            Common questions about shifts, troubleshooting, and reporting issues.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
          {FAQ_ITEMS.map((item, i) => (
            <section key={i} className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                {item.q}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </p>
            </section>
          ))}
          <section className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Contact & support
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {CONTACT_INTRO}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
