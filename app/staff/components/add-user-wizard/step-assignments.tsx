'use client';

import { useMemo, useState } from 'react';
import type { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerField } from '@/components/ui/date-picker-field';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command';
import { ChevronDownIcon } from '@/lib/icons';
import type { UserListItem } from '@/api/endpoints/user';
import type { BranchListItem } from '@/api/types/branch';
import type { ClientListItem } from '@/api/types/clients';
import { getBranchDisplayLabel } from '@/api/hooks/use-branches';
import { cn } from '@/lib/utils';
import type { AddUserWizardValues } from '@/lib/user-form';
import { JOB_INFORMATION_FIELDS } from '@/lib/user-form/personnel-fields';
import { PersonnelFieldGrid } from '@/components/personnel-field-grid';

function matchesSearch(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

function branchHaystack(b: BranchListItem): string {
  return [
    getBranchDisplayLabel(b),
    String(b.uid),
    b.name,
    b.alias ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

function clientHaystack(c: ClientListItem): string {
  return [c.name, c.email, String(c.uid)].filter(Boolean).join(' ');
}

function staffHaystack(u: UserListItem): string {
  return [`${u.name} ${u.surname}`, u.email, String(u.uid)].filter(Boolean).join(' ');
}

export function StepAssignments({
  control,
  branches,
  users,
  clients,
}: {
  control: Control<AddUserWizardValues>;
  branches: BranchListItem[];
  users: UserListItem[];
  clients: ClientListItem[];
}) {
  const [managedBranchesOpen, setManagedBranchesOpen] = useState(false);
  const [managedBranchesSearch, setManagedBranchesSearch] = useState('');
  const [managedStaffOpen, setManagedStaffOpen] = useState(false);
  const [managedStaffSearch, setManagedStaffSearch] = useState('');
  const [clientsOpen, setClientsOpen] = useState(false);
  const [clientsSearch, setClientsSearch] = useState('');

  const filteredBranches = useMemo(
    () =>
      branches.filter((b) =>
        matchesSearch(branchHaystack(b), managedBranchesSearch)
      ),
    [branches, managedBranchesSearch]
  );

  const filteredStaff = useMemo(
    () =>
      users.filter((u) => matchesSearch(staffHaystack(u), managedStaffSearch)),
    [users, managedStaffSearch]
  );

  const filteredClients = useMemo(
    () =>
      clients.filter((c) =>
        matchesSearch(clientHaystack(c), clientsSearch)
      ),
    [clients, clientsSearch]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-sm font-medium">User profile (optional)</p>
        <p className="text-sm text-muted-foreground">
          Physical details and personal information.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={control}
            name="profile.height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="profile.weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="profile.hairColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hair color</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="profile.eyeColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Eye color</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="profile.gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="e.g. Male, Female"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="profile.dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of birth</FormLabel>
                <FormControl>
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={control}
          name="profile.address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={control}
            name="profile.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="profile.country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <FormField
        control={control}
        name="businesscardURL"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business card URL (optional)</FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder="https://..."
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <p className="text-sm font-medium">Employment profile (optional)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={control}
            name="employmentProfile.branchref"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch ref</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start date</FormLabel>
                <FormControl>
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End date</FormLabel>
                <FormControl>
                  <DatePickerField
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.isCurrentlyEmployed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-6">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">Currently employed</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="employmentProfile.contactNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work contact number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className="text-sm font-medium">Job information (optional)</p>
        <PersonnelFieldGrid control={control} prefix="employmentProfile" fields={JOB_INFORMATION_FIELDS} />
      </div>

      <FormField
        control={control}
        name="managedBranches"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Managed branches (optional)</FormLabel>
            <Popover
              open={managedBranchesOpen}
              onOpenChange={(open) => {
                setManagedBranchesOpen(open);
                if (!open) setManagedBranchesSearch('');
              }}
            >
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'w-full justify-between font-normal',
                      !field.value?.length && 'text-muted-foreground'
                    )}
                  >
                    {field.value?.length
                      ? `${field.value.length} selected`
                      : 'Select branches'}
                    <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] p-0"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search branches…"
                    value={managedBranchesSearch}
                    onValueChange={setManagedBranchesSearch}
                  />
                  <CommandList className="max-h-[200px]">
                    <CommandGroup className="p-2">
                      {filteredBranches.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3 text-center">
                          No branches found
                        </p>
                      ) : (
                        filteredBranches.map((b) => {
                          const selected = field.value?.includes(b.uid) ?? false;
                          return (
                            <label
                              key={b.uid}
                              className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                            >
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? [];
                                  if (checked) {
                                    field.onChange([...current, b.uid]);
                                  } else {
                                    field.onChange(
                                      current.filter((id) => id !== b.uid)
                                    );
                                  }
                                }}
                              />
                              <span>
                                {getBranchDisplayLabel(b) || `Branch ${b.uid}`}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {field.value && field.value.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {field.value.map((uid) => {
                  const b = branches.find((x) => x.uid === uid);
                  return (
                    <Badge
                      key={uid}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() =>
                        field.onChange(
                          field.value?.filter((id) => id !== uid) ?? []
                        )
                      }
                    >
                      {b ? getBranchDisplayLabel(b) || `Branch ${uid}` : uid} ×
                    </Badge>
                  );
                })}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="managedStaff"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Managed staff (optional)</FormLabel>
            <Popover
              open={managedStaffOpen}
              onOpenChange={(open) => {
                setManagedStaffOpen(open);
                if (!open) setManagedStaffSearch('');
              }}
            >
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'w-full justify-between font-normal',
                      !field.value?.length && 'text-muted-foreground'
                    )}
                  >
                    {field.value?.length
                      ? `${field.value.length} selected`
                      : 'Select staff'}
                    <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] p-0"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search staff…"
                    value={managedStaffSearch}
                    onValueChange={setManagedStaffSearch}
                  />
                  <CommandList className="max-h-[200px]">
                    <CommandGroup className="p-2">
                      {filteredStaff.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3 text-center">
                          No staff found
                        </p>
                      ) : (
                        filteredStaff.map((u) => {
                          const selected = field.value?.includes(u.uid) ?? false;
                          return (
                            <label
                              key={u.uid}
                              className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                            >
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? [];
                                  if (checked) {
                                    field.onChange([...current, u.uid]);
                                  } else {
                                    field.onChange(
                                      current.filter((id) => id !== u.uid)
                                    );
                                  }
                                }}
                              />
                              <span>
                                {u.name} {u.surname}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {field.value && field.value.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {field.value.map((uid) => {
                  const u = users.find((x) => x.uid === uid);
                  return (
                    <Badge
                      key={uid}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() =>
                        field.onChange(
                          field.value?.filter((id) => id !== uid) ?? []
                        )
                      }
                    >
                      {u ? `${u.name} ${u.surname}` : uid} ×
                    </Badge>
                  );
                })}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="assignedClientIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assigned clients (optional)</FormLabel>
            <Popover
              open={clientsOpen}
              onOpenChange={(open) => {
                setClientsOpen(open);
                if (!open) setClientsSearch('');
              }}
            >
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className={cn(
                      'w-full justify-between font-normal',
                      !field.value?.length && 'text-muted-foreground'
                    )}
                  >
                    {field.value?.length
                      ? `${field.value.length} selected`
                      : 'Select clients'}
                    <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] p-0"
              >
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search clients…"
                    value={clientsSearch}
                    onValueChange={setClientsSearch}
                  />
                  <CommandList className="max-h-[200px]">
                    <CommandGroup className="p-2">
                      {filteredClients.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3 text-center">
                          No clients found
                        </p>
                      ) : (
                        filteredClients.map((c) => {
                          const selected = field.value?.includes(c.uid) ?? false;
                          return (
                            <label
                              key={c.uid}
                              className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted"
                            >
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) => {
                                  const current = field.value ?? [];
                                  if (checked) {
                                    field.onChange([...current, c.uid]);
                                  } else {
                                    field.onChange(
                                      current.filter((id) => id !== c.uid)
                                    );
                                  }
                                }}
                              />
                              <span>{c.name ?? `Client ${c.uid}`}</span>
                            </label>
                          );
                        })
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {field.value && field.value.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {field.value.map((uid) => {
                  const c = clients.find((x) => x.uid === uid);
                  return (
                    <Badge
                      key={uid}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() =>
                        field.onChange(
                          field.value?.filter((id) => id !== uid) ?? []
                        )
                      }
                    >
                      {c?.name ?? uid} ×
                    </Badge>
                  );
                })}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
