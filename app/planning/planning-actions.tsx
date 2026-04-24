'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateTaskModal } from './components/create-task-modal';

export function PlanningActions() {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <>
      <div className="flex w-full flex-col items-center gap-4">
        <div
          className="w-full rounded-xl border-2 p-4 sm:p-6 border-green-600 bg-green-600/10"
          data-tour="planning-create-section"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-base font-medium text-foreground sm:text-lg">
              View and manage your tasks.
            </p>
            <Button
              className="gap-2 min-h-14 w-full border-0 bg-green-600 px-6 text-lg text-white hover:bg-green-700 sm:w-auto"
              size="lg"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="size-4" />
              Create task
            </Button>
          </div>
        </div>
      </div>
      <CreateTaskModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </>
  );
}
