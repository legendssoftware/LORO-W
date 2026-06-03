import type { CreateTaskPayload, SubtaskPayload, TaskTypeValue } from '@/api/types/tasks';

export interface TaskTemplate {
  id: string;
  label: string;
  taskType: TaskTypeValue;
  title: string;
  description: string;
  targetCategory?: string;
  subtasks: SubtaskPayload[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'standard-visit',
    label: 'Standard visit',
    taskType: 'VISIT',
    title: 'Client visit',
    description: 'On-site client visit with notes and follow-up.',
    subtasks: [
      { title: 'Arrive on site', description: 'Check in at client location' },
      { title: 'Meeting notes', description: 'Capture outcomes and next steps' },
      { title: 'Schedule follow-up', description: 'Set follow-up date if needed' },
    ],
  },
  {
    id: 'quote-follow-up',
    label: 'Quote follow-up',
    taskType: 'QUOTATION',
    title: 'Follow up on quotation',
    description: 'Review quote status and contact the client.',
    subtasks: [
      { title: 'Review quotation', description: 'Check pricing and line items' },
      { title: 'Call client', description: 'Confirm decision or objections' },
    ],
  },
  {
    id: 'lead-nurture',
    label: 'Lead nurture',
    taskType: 'FOLLOW_UP',
    title: 'Lead follow-up',
    description: 'Research and contact the lead.',
    targetCategory: 'lead_follow_up',
    subtasks: [
      { title: 'Research lead', description: 'Review lead profile and history' },
      { title: 'Make contact', description: 'Call, email, or visit' },
    ],
  },
];

export function applyTaskTemplate(
  template: TaskTemplate,
  base?: Partial<CreateTaskPayload>
): Partial<CreateTaskPayload> {
  return {
    ...base,
    title: template.title,
    description: template.description,
    taskType: template.taskType,
    targetCategory: template.targetCategory ?? base?.targetCategory,
    subtasks: template.subtasks.map((s) => ({ ...s })),
  };
}
