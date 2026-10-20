'use client';

import { useEffect, useMemo, useState } from 'react';
import { useClients } from '@/api/hooks/use-clients';
import { useSaveTakeoffMutation, useTakeoffBatchMutation, useTakeoffSystems } from '@/api/hooks/use-takeoff';
import type { ClientListItem } from '@/api/types/clients';
import type { TakeoffBatchResult, TakeoffSystemSummary } from '@/api/types/takeoff';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandGroup, CommandInput, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/loading-spinner';
import { ChevronDownIcon, MapPinIcon, StoreIcon, XIcon } from '@/lib/icons';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';
import { formatQty, formatTakeoffMoney, formatTakeoffUnit } from '@/app/takeoff/format';

interface DraftSection {
  key: string;
  systemCode: string;
  inputs: Record<string, string>;
}

const TAKEOFF_STEPS = ['Systems', 'Measurements', 'Review', 'Save'] as const;

type TakeoffStep = (typeof TAKEOFF_STEPS)[number];

export interface TakeoffBuilderContentProps {
  open: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

function clientHasAddress(client: ClientListItem): boolean {
  const address = client.address;
  const hasText = [address?.street, address?.suburb, address?.city].some(
    (part) => typeof part === 'string' && part.trim().length > 0,
  );
  const latitude = Number(client.latitude);
  const longitude = Number(client.longitude);
  const hasCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0);
  return hasText || hasCoordinates;
}

function emptyInputs(system: TakeoffSystemSummary): Record<string, string> {
  return Object.fromEntries(system.inputs.map((field) => [field.key, '']));
}

function sectionInputs(section: DraftSection): Record<string, number> {
  return Object.fromEntries(
    Object.entries(section.inputs).map(([key, value]) => [key, value.trim() === '' ? 0 : Number(value)]),
  );
}

export function TakeoffBuilderContent({ open, onSaved, onCancel }: TakeoffBuilderContentProps) {
  const systemsQuery = useTakeoffSystems(open);
  const clientsQuery = useClients({ limit: 500, enabled: open });
  const calculate = useTakeoffBatchMutation();
  const save = useSaveTakeoffMutation();
  const systems = systemsQuery.data ?? [];
  const [step, setStep] = useState<TakeoffStep>('Systems');
  const [sections, setSections] = useState<DraftSection[]>([]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [clientUid, setClientUid] = useState('');
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [result, setResult] = useState<TakeoffBatchResult | null>(null);

  const clients = clientsQuery.data ?? [];
  const clientSearchQuery = clientSearch.trim().toLowerCase();
  const filteredClients = useMemo(
    () =>
      clientSearchQuery
        ? clients.filter((client) => (client.name ?? '').toLowerCase().includes(clientSearchQuery))
        : clients,
    [clients, clientSearchQuery],
  );
  const selectedClient = clients.find((client) => String(client.uid) === clientUid);
  const systemsByCode = useMemo(() => new Map(systems.map((system) => [system.code, system])), [systems]);
  const selectedCodes = useMemo(() => new Set(sections.map((section) => section.systemCode)), [sections]);
  const measurementsIncomplete = useMemo(
    () =>
      sections.some((section) => {
        const system = systemsByCode.get(section.systemCode);
        return (system?.inputs ?? []).some((field) => field.required && !(section.inputs[field.key] ?? '').trim());
      }),
    [sections, systemsByCode],
  );

  useEffect(() => {
    if (!open) return;
    setStep('Systems');
    setSections([]);
    setReference('');
    setNotes('');
    setClientUid('');
    setClientPickerOpen(false);
    setClientSearch('');
    setResult(null);
  }, [open]);

  useEffect(() => {
    if (!open || !sections.length) {
      setResult(null);
      return;
    }
    const handle = window.setTimeout(() => {
      calculate.mutate(
        {
          clientUid: clientUid ? Number(clientUid) : undefined,
          items: sections.map((section) => ({
            systemCode: section.systemCode,
            inputs: sectionInputs(section),
          })),
        },
        { onSuccess: setResult },
      );
    }, 400);
    return () => window.clearTimeout(handle);
    // calculate.mutate identity changes; sections and client are the inputs that should refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sections, clientUid]);

  function addSystem(code: string) {
    const system = systemsByCode.get(code);
    if (!system) return;
    setSections((current) => [
      ...current,
      { key: `${code}-${Date.now()}`, systemCode: code, inputs: emptyInputs(system) },
    ]);
  }

  function removeSection(key: string) {
    setSections((current) => current.filter((item) => item.key !== key));
  }

  function updateInput(key: string, field: string, value: string) {
    setSections((current) =>
      current.map((section) =>
        section.key === key ? { ...section, inputs: { ...section.inputs, [field]: value } } : section,
      ),
    );
  }

  function goNext() {
    const index = TAKEOFF_STEPS.indexOf(step);
    const next = TAKEOFF_STEPS[index + 1];
    if (next) setStep(next);
  }

  function goBack() {
    const index = TAKEOFF_STEPS.indexOf(step);
    const previous = TAKEOFF_STEPS[index - 1];
    if (previous) setStep(previous);
  }

  async function onSave() {
    if (!sections.length) return;
    await save.mutateAsync({
      reference,
      notes,
      clientUid: clientUid ? Number(clientUid) : undefined,
      sections: sections.map((section) => ({
        systemCode: section.systemCode,
        inputs: sectionInputs(section),
      })),
    });
    onSaved();
  }

  const unmatched = result?.rollup.lines.filter((line) => !line.matched) ?? [];
  const nextDisabled = step === 'Systems' ? sections.length === 0 : step === 'Measurements' ? measurementsIncomplete : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {TAKEOFF_STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            {index > 0 ? <span className="text-muted-foreground">/</span> : null}
            <span className={cn(label === step ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
          </li>
        ))}
      </ol>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {systemsQuery.isLoading ? <LoadingSpinner /> : null}
        {systemsQuery.isError ? <p className="text-destructive text-sm">{getQueryErrorMessage(systemsQuery.error)}</p> : null}
        {renderStep()}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {step !== 'Systems' ? (
            <Button type="button" variant="outline" onClick={goBack} disabled={save.isPending}>
              Prev
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={save.isPending}>
            Cancel
          </Button>
          {step === 'Save' ? (
            <Button type="button" disabled={!sections.length || save.isPending} onClick={() => void onSave()}>
              {save.isPending ? 'Saving…' : 'Save takeoff'}
            </Button>
          ) : (
            <Button type="button" disabled={nextDisabled} onClick={goNext}>
              Proceed
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  function renderStep() {
    switch (step) {
      case 'Systems':
        return (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-xs">Choose one or more systems.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {systems.map((system) => (
                <Button
                  key={system.code}
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-auto w-full justify-start whitespace-normal text-left',
                    selectedCodes.has(system.code) && 'border-foreground/25',
                  )}
                  onClick={() => addSystem(system.code)}
                >
                  <span>
                    <span className="block">{system.name}</span>
                    <span className="text-muted-foreground text-xs">{formatTakeoffUnit(system.unit)}</span>
                  </span>
                </Button>
              ))}
            </div>
            {sections.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {sections.map((section, index) => {
                  const system = systemsByCode.get(section.systemCode);
                  return (
                    <li key={section.key} className="flex items-center justify-between gap-2 rounded-md border border-foreground/25 px-3 py-2 text-sm">
                      <span>
                        {system?.name ?? section.systemCode}
                        <span className="text-muted-foreground ml-2 text-xs">Section {index + 1}</span>
                      </span>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove system" onClick={() => removeSection(section.key)}>
                        <XIcon className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      case 'Measurements':
        return (
          <div className="flex flex-col gap-4">
            {sections.length === 0 ? <p className="text-muted-foreground text-sm">Choose a system to start.</p> : null}
            {sections.map((section, index) => {
              const system = systemsByCode.get(section.systemCode);
              return (
                <Card key={section.key}>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-base">{system?.name ?? section.systemCode}</CardTitle>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove system" onClick={() => removeSection(section.key)}>
                      <XIcon className="size-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    {(system?.inputs ?? []).map((field) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <Label htmlFor={`${section.key}-${field.key}`}>
                          {field.label} ({field.unit})
                        </Label>
                        <Input
                          id={`${section.key}-${field.key}`}
                          inputMode="decimal"
                          value={section.inputs[field.key] ?? ''}
                          onChange={(event) => updateInput(section.key, field.key, event.target.value)}
                          placeholder="e.g. 12"
                        />
                      </div>
                    ))}
                    <p className="text-muted-foreground text-xs sm:col-span-2">Section {index + 1}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      case 'Review':
        return (
          <div className="flex flex-col gap-3">
            {calculate.isPending ? <p className="text-muted-foreground text-sm">Calculating…</p> : null}
            {calculate.isError ? <p className="text-destructive text-sm">{getQueryErrorMessage(calculate.error)}</p> : null}
            {result ? (
              <Card>
                <CardHeader>
                  <CardTitle>Materials</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {unmatched.length > 0 ? (
                    <p className="text-destructive text-sm">
                      Unmatched codes, so this cannot be issued until they exist on a product: {unmatched.map((line) => line.productCode).join(', ')}
                    </p>
                  ) : null}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Each</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rollup.lines.map((line) => (
                        <TableRow key={line.productCode}>
                          <TableCell>{line.productCode}</TableCell>
                          <TableCell>
                            {line.description}
                            {!line.matched ? <span className="text-destructive ml-2 text-xs">No catalogue match</span> : null}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQty(line.qty)} {formatTakeoffUnit(line.unit)}
                          </TableCell>
                          <TableCell className="text-right">{formatTakeoffMoney(line.each)}</TableCell>
                          <TableCell className="text-right">{formatTakeoffMoney(line.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatTakeoffMoney(result.rollup.subTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT</span>
                      <span>{formatTakeoffMoney(result.rollup.vat)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{formatTakeoffMoney(result.rollup.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground text-sm">Materials appear here after the measurements are calculated.</p>
            )}
          </div>
        );
      case 'Save':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Save</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="takeoff-reference">Reference</Label>
                <Input
                  id="takeoff-reference"
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="e.g. Site A ceiling"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="takeoff-client">Client</Label>
                <Popover
                  modal
                  open={clientPickerOpen}
                  onOpenChange={(next) => {
                    setClientPickerOpen(next);
                    if (!next) setClientSearch('');
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="takeoff-client"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientPickerOpen}
                      className={cn(
                        'w-full justify-between font-normal',
                        !selectedClient && 'text-xs italic text-muted-foreground',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {selectedClient ? (
                          clientHasAddress(selectedClient) ? (
                            <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
                          )
                        ) : null}
                        <span className="truncate">{selectedClient?.name ?? 'Choose a client'}</span>
                      </span>
                      <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Search clients…" value={clientSearch} onValueChange={setClientSearch} />
                      <CommandList className="max-h-[200px]">
                        <CommandGroup className="p-2">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setClientUid('');
                              setClientPickerOpen(false);
                            }}
                          >
                            <XIcon className="size-4 shrink-0 text-muted-foreground" />
                            Choose later
                          </button>
                          {clients.length === 0 ? (
                            <p className="text-muted-foreground py-3 text-center text-xs sm:py-4 sm:text-sm">No clients available</p>
                          ) : filteredClients.length === 0 ? (
                            <p className="text-muted-foreground py-3 text-center text-xs sm:py-4 sm:text-sm">No clients found.</p>
                          ) : (
                            filteredClients.map((client) => (
                              <button
                                key={client.uid}
                                type="button"
                                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                                onClick={() => {
                                  setClientUid(String(client.uid));
                                  setClientPickerOpen(false);
                                }}
                              >
                                {clientHasAddress(client) ? (
                                  <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className="truncate">{client.name}</span>
                              </button>
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="takeoff-notes">Notes</Label>
                <Textarea
                  id="takeoff-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes"
                />
              </div>
              {save.isError ? <p className="text-destructive text-sm md:col-span-3">{getQueryErrorMessage(save.error)}</p> : null}
            </CardContent>
          </Card>
        );
      default: {
        const unreachable: never = step;
        return unreachable;
      }
    }
  }
}
