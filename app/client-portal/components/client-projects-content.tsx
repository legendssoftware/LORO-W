'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ClientProfileData, ClientProject } from '@/api/types/client-portal';
import { ProjectsFiltersBar } from '@/app/projects/components/projects-filters-bar';
import { ProjectCard } from '@/app/projects/components/project-card';
import { CreateProjectDialog } from '@/app/projects/components/create-project-dialog';
import { ProjectDetailDialog } from './project-detail-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function filterProjects(
  projects: ClientProject[],
  searchInput: string,
  statusFilter: string
): ClientProject[] {
  const q = searchInput.trim().toLowerCase();
  return projects.filter((p) => {
    if (statusFilter !== 'all' && (p.status ?? '') !== statusFilter) {
      return false;
    }
    if (!q) return true;
    const name = (p.name ?? '').toLowerCase();
    const desc = (p.description ?? '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
}

export function ClientProjectsContent({ client }: { client: ClientProfileData }) {
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<ClientProject | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const allProjects = useMemo(
    () =>
      ([...(client.projects ?? [])] as ClientProject[]).sort(
        (a, b) => (b.budget ?? 0) - (a.budget ?? 0)
      ),
    [client.projects]
  );

  const filteredProjects = useMemo(
    () => filterProjects(allProjects, searchInput, statusFilter),
    [allProjects, searchInput, statusFilter]
  );

  return (
    <div className="space-y-6">
      <div
        className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        data-tour="projects-page-header"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Projects</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Manage your projects, create new ones, and track their progress.
          </p>
        </div>
        <Button
          type="button"
          className={cn(
            'h-9 shrink-0 gap-2 self-start border-0 !rounded px-4',
            'bg-violet-600 text-white hover:bg-violet-700',
            'dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500',
            '[&_svg]:text-white focus-visible:ring-violet-500/40'
          )}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" />
          Create project
        </Button>
      </div>

      <ProjectsFiltersBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {filteredProjects.length === 0 ? (
        <p className="text-center text-muted-foreground py-16 text-sm">
          {allProjects.length === 0
            ? 'No projects yet. Create one to get started.'
            : 'No projects match your filters.'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.uid}
              project={p}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>
      )}

      <ProjectDetailDialog
        project={selected}
        client={client}
        open={selected != null}
        onOpenChange={(open) => !open && setSelected(null)}
      />

      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
