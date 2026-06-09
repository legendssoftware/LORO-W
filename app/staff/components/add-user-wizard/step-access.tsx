'use client';

import type { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccessLevel, WorkforceType } from '@/api/types/user';
import type { BranchListItem } from '@/api/types/branch';
import { getBranchDisplayLabel } from '@/api/hooks/use-branches';
import { formatEnumLabel } from '@/lib/format-enum-label';
import type { AddUserWizardValues } from '@/lib/user-form';

const MODAL_SELECT_TRIGGER =
  'h-9 w-full border-border bg-background text-foreground';

const accessLevels = Object.values(AccessLevel);
const workforceTypes = Object.values(WorkforceType);

export function StepAccess({
  control,
  branches,
}: {
  control: Control<AddUserWizardValues>;
  branches: BranchListItem[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Role, access level, workforce type, and primary branch.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={control}
          name="accessLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Access level</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Access level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accessLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {formatEnumLabel(level)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="workforceType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workforce type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Workforce type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {workforceTypes.map((wt) => (
                    <SelectItem key={wt} value={wt}>
                      {formatEnumLabel(wt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accessLevels.map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatEnumLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? 'active'}>
                <FormControl>
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={control}
          name="userref"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User ref (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  placeholder="e.g. USR123456"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="hrID"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HR ID (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === '' ? null : Number(v));
                  }}
                  placeholder="HR system ID"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department ID (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === '' ? null : Number(v));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="branchUid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary branch (optional)</FormLabel>
              <Select
                onValueChange={(v) =>
                  field.onChange(v === '__none__' ? null : Number(v))
                }
                value={
                  field.value != null ? String(field.value) : '__none__'
                }
              >
                <FormControl>
                  <SelectTrigger className={MODAL_SELECT_TRIGGER}>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">No branch</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.uid} value={String(b.uid)}>
                      {getBranchDisplayLabel(b) || `Branch ${b.uid}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
