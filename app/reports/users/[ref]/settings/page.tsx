'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useUser, usePatchUser, useBranches, useUsers } from '@/api/hooks';
import type { PatchUserBody } from '@/api/endpoints/user';
import { Loader2Icon, ChevronLeftIcon, ChevronDownIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AccessLevel, UserRole } from '@/api/types';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  surname: z.string().min(1, 'Surname is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional().nullable(),
  userref: z.string().optional().nullable(),
  hrID: z.union([z.number(), z.null()]).optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  accessLevel: z.string().optional(),
  departmentId: z.union([z.number(), z.null()]).optional(),
  branchUid: z.union([z.number(), z.null()]).optional(),
  managedBranches: z.array(z.number()).optional(),
  managedStaff: z.array(z.number()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

/** Format enum value for display (e.g. "event planner" -> "Event planner"). */
function formatEnumLabel(value: string): string {
  return value
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function UserSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const ref = typeof params.ref === 'string' ? params.ref : null;
  const { data: user, isLoading: userLoading, error: userError } = useUser(ref);
  const patchUser = usePatchUser(ref);
  const { data: branches = [] } = useBranches({ enabled: !!ref });
  const { data: users = [] } = useUsers({ enabled: !!ref, limit: 200 });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      surname: '',
      email: '',
      phone: null,
      userref: null,
      hrID: null,
      role: '',
      status: 'active',
      accessLevel: '',
      departmentId: null,
      branchUid: null,
      managedBranches: [],
      managedStaff: [],
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? '',
        surname: user.surname ?? '',
        email: user.email ?? '',
        phone: user.phone ?? null,
        userref: (user as { userref?: string }).userref ?? null,
        hrID: (user as { hrID?: number }).hrID ?? null,
        role: (user.role as string) ?? '',
        status: (user.status as string) ?? 'active',
        accessLevel: (user.accessLevel as string) ?? '',
        departmentId: (user.departmentId as number) ?? null,
        branchUid: user.branch?.uid ?? null,
        managedBranches: (user as { managedBranches?: number[] }).managedBranches ?? [],
        managedStaff: (user as { managedStaff?: number[] }).managedStaff ?? [],
      });
    }
  }, [user, form]);

  const onSubmit = (values: FormValues) => {
    const body: PatchUserBody = {
      name: values.name,
      surname: values.surname,
      email: values.email,
      phone: values.phone ?? undefined,
      userref: values.userref ?? undefined,
      hrID: values.hrID ?? undefined,
      role: values.role || undefined,
      status: values.status || undefined,
      accessLevel: values.accessLevel as PatchUserBody['accessLevel'] | undefined,
      departmentId: values.departmentId ?? undefined,
      branch: values.branchUid ? { uid: values.branchUid } : undefined,
      managedBranches: values.managedBranches?.length ? values.managedBranches : undefined,
      managedStaff: values.managedStaff?.length ? values.managedStaff : undefined,
    };
    patchUser.mutate(body, {
      onSuccess: () => {
        toast.success('User updated');
        router.push('/reports');
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to update user');
      },
    });
  };

  if (!ref) {
    return (
      <div className="h-full overflow-auto flex flex-col items-center justify-center px-4">
        <p className="text-muted-foreground">Invalid user reference.</p>
        <Link href="/reports" className="text-primary hover:underline mt-2 inline-block">
          Back to Reports
        </Link>
      </div>
    );
  }

  if (userLoading || !user) {
    return (
      <div className="h-full overflow-auto flex flex-col items-center justify-center px-4">
        {userError ? (
          <div>
            <p className="text-destructive">{userError.message}</p>
            <Link href="/reports" className="text-primary hover:underline mt-2 inline-block">
              Back to Reports
            </Link>
          </div>
        ) : (
          <Loader2Icon className="size-8 animate-spin text-primary" />
        )}
      </div>
    );
  }

  const accessLevels = Object.values(AccessLevel).filter(
    (v) => typeof v === 'string'
  ) as string[];
  const roles = Object.values(UserRole).filter(
    (v) => typeof v === 'string'
  ) as string[];

  return (
    <div className="h-full overflow-auto flex flex-col items-center">
      <div className="max-w-4xl w-full mx-auto px-4 py-8">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeftIcon className="size-4" />
          Back to Reports
        </Link>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic details */}
            <Card>
              <CardHeader>
                <CardTitle>Basic details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Name, contact and email.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surname</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Identity & access */}
            <Card>
              <CardHeader>
                <CardTitle>Identity & access</CardTitle>
                <p className="text-sm text-muted-foreground">
                  User reference, HR ID, role, access level and status.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="userref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ref</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value || null)
                            }
                            placeholder="e.g. USR123456"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hrID"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HR ID</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
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
                    control={form.control}
                    name="accessLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access level</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? ''}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? 'active'}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem className="max-w-xs">
                      <FormLabel>Department ID</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
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
              </CardContent>
            </Card>

            {/* Primary branch */}
            <Card>
              <CardHeader>
                <CardTitle>Primary branch</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The branch this user is assigned to.
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="branchUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === '__none__' ? null : Number(v))
                        }
                        value={
                          field.value != null ? String(field.value) : '__none__'
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {branches.map((b) => (
                            <SelectItem
                              key={b.uid}
                              value={String(b.uid)}
                            >
                              {b.name ?? `Branch ${b.uid}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Managed branches */}
            <Card>
              <CardHeader>
                <CardTitle>Managed branches</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Branches this user manages (managers/supervisors).
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="managedBranches"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Managed branches</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
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
                        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                          <ScrollArea className="h-[200px]">
                            <div className="p-2 space-y-2">
                              {branches.map((b) => {
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
                                    <span>{b.name ?? `Branch ${b.uid}`}</span>
                                  </label>
                                );
                              })}
                              {branches.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  No branches available
                                </p>
                              )}
                            </div>
                          </ScrollArea>
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
                                {b?.name ?? uid} ×
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Linked staff */}
            <Card>
              <CardHeader>
                <CardTitle>Linked staff</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Staff members this user manages.
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="managedStaff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Managed staff</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
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
                        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
                          <ScrollArea className="h-[200px]">
                            <div className="p-2 space-y-2">
                              {users
                                .filter((u) => u.uid !== user?.uid)
                                .map((u) => {
                                  const selected =
                                    field.value?.includes(u.uid) ?? false;
                                  const label = `${u.name} ${u.surname}`.trim() || u.email;
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
                                      <span className="truncate">{label}</span>
                                    </label>
                                  );
                                })}
                              {users.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                  No users available
                                </p>
                              )}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {field.value.map((uid) => {
                            const u = users.find((x) => x.uid === uid);
                            const label = u
                              ? `${u.name} ${u.surname}`.trim() || u.email
                              : `User ${uid}`;
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
                                {label} ×
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={patchUser.isPending}>
                {patchUser.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/reports')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
