'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DetailDialogCloseButton,
  DETAIL_DIALOG_CONTENT_CLASS,
} from '@/components/detail-dialog/detail-dialog-primitives';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  useGoogleFormIntakeConfig,
  useImportGoogleFormIntakeMutation,
  useSendGoogleFormLinkMutation,
} from '@/api/hooks/use-google-form-intake';
import { FileSpreadsheet, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const sendSchema = z.object({
  email: z.string().email('Valid email is required'),
});

type SendFormValues = z.infer<typeof sendSchema>;

export interface GoogleFormIntakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleFormIntakeModal({ open, onOpenChange }: GoogleFormIntakeModalProps) {
  const configQuery = useGoogleFormIntakeConfig({ enabled: open });
  const sendMutation = useSendGoogleFormLinkMutation();
  const importMutation = useImportGoogleFormIntakeMutation();

  const form = useForm<SendFormValues>({
    resolver: zodResolver(sendSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!open) {
      form.reset({ email: '' });
    }
  }, [open, form]);

  const formUrl = configQuery.data?.formUrl ?? null;
  const sheetConfigured = configQuery.data?.sheetConfigured ?? false;
  const webhookConfigured = configQuery.data?.webhookConfigured ?? false;

  async function onSend(values: SendFormValues) {
    try {
      const result = await sendMutation.mutateAsync(values.email.trim());
      toast.success(`Form link sent to ${result.formUrl ? values.email : 'the employee'}`);
      form.reset({ email: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send Google Form');
    }
  }

  async function copyFormUrl() {
    if (!formUrl) return;
    try {
      await navigator.clipboard.writeText(formUrl);
      toast.success('Form URL copied');
    } catch {
      toast.error('Could not copy Form URL');
    }
  }

  async function onImport() {
    try {
      const result = await importMutation.mutateAsync({});
      if (result.processed === 0) {
        toast.success('No pending form responses to import');
        return;
      }
      toast.success(
        `Imported ${result.imported}, skipped ${result.skipped}, errors ${result.errors}`,
      );
      result.rows
        .filter((row) => row.status === 'error')
        .forEach((row) => {
          toast.error(`Row ${row.rowNumber} (${row.email}): ${row.error ?? 'failed'}`, {
            duration: 6000,
          });
        });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import form responses');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            Google Form intake
          </DialogTitle>
          <DialogDescription>
            Email the Google Form to a new hire. Submit starts import immediately when the webhook
            is configured. Import below is a manual backup; cron is a fallback.
          </DialogDescription>
        </DialogHeader>
        <DetailDialogCloseButton />

        <div className="space-y-6">
          {formUrl ? (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Form URL</p>
              <p className="break-all text-sm">{formUrl}</p>
              <Button type="button" variant="outline" size="sm" onClick={copyFormUrl}>
                <Copy className="mr-2 size-4" />
                Copy Form URL
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Set GOOGLE_FORM_URL on the API to email the Form from here.
            </p>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSend)} className="space-y-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="jane.smith@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={sendMutation.isPending || !formUrl}>
                {sendMutation.isPending ? 'Sending…' : 'Send Google Form'}
              </Button>
            </form>
          </Form>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Import responses</p>
            <p className="text-xs text-muted-foreground">
              {webhookConfigured
                ? 'Form Submit already starts import. Use this only if a row was missed.'
                : 'Set GOOGLE_FORM_INTAKE_WEBHOOK_SECRET and the Sheet Apps Script so Submit imports immediately.'}{' '}
              Creates a Clerk account with a unique lowercase username, emails Account ready to
              the user, and emails HR/management to review and add HR ID. Profile photos stay on
              Clerk.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={importMutation.isPending || !sheetConfigured}
              onClick={onImport}
            >
              {importMutation.isPending ? 'Importing…' : 'Import form responses'}
            </Button>
            {!sheetConfigured ? (
              <p className="text-xs text-muted-foreground">
                Set GOOGLE_FORM_SHEET_ID on the API and share the Sheet with the storage service
                account.
              </p>
            ) : null}
            {importMutation.data ? (
              <p className="text-xs text-muted-foreground">
                Last run: {importMutation.data.imported} imported, {importMutation.data.skipped}{' '}
                skipped, {importMutation.data.errors} errors
                {importMutation.data.rows
                  .filter((row) => row.username)
                  .slice(0, 5)
                  .map((row) => ` · ${row.email} → ${row.username}`)
                  .join('')}
              </p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
