import { TaskType, type CreateTaskPayload, type SubtaskPayload, type TaskTypeValue } from '@/api/types/tasks';

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
    id: 'in-person-meeting',
    label: 'In-person meeting',
    taskType: 'IN_PERSON_MEETING',
    title: 'In-person client meeting',
    description: 'Face-to-face meeting with agenda and follow-up actions.',
    subtasks: [
      { title: 'Prepare agenda', description: 'Confirm attendees and objectives' },
      { title: 'Run meeting', description: 'Capture decisions and commitments' },
      { title: 'Next steps', description: 'Log outcomes and schedule follow-up' },
    ],
  },
  {
    id: 'virtual-meeting',
    label: 'Virtual meeting',
    taskType: 'VIRTUAL_MEETING',
    title: 'Virtual client meeting',
    description: 'Remote meeting or product demo via video call.',
    subtasks: [
      { title: 'Send invite and link', description: 'Confirm time zone and attendees' },
      { title: 'Run session', description: 'Present demo or review and take notes' },
      { title: 'Follow up', description: 'Share recap and action items' },
    ],
  },
  {
    id: 'call',
    label: 'Phone call',
    taskType: 'CALL',
    title: 'Client phone call',
    description: 'Scheduled call to discuss account or opportunity.',
    subtasks: [
      { title: 'Prepare talking points', description: 'Review client history and goals' },
      { title: 'Make call', description: 'Complete the conversation' },
      { title: 'Log outcome', description: 'Record result and next steps' },
    ],
  },
  {
    id: 'email',
    label: 'Email outreach',
    taskType: 'EMAIL',
    title: 'Client email',
    description: 'Draft and send email with clear ask or update.',
    subtasks: [
      { title: 'Draft email', description: 'Write message with context and CTA' },
      { title: 'Send email', description: 'Send to correct contacts' },
      { title: 'Track reply', description: 'Note response or schedule follow-up' },
    ],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp message',
    taskType: 'WHATSAPP',
    title: 'WhatsApp client message',
    description: 'Quick check-in or update via WhatsApp.',
    subtasks: [
      { title: 'Compose message', description: 'Keep tone professional and concise' },
      { title: 'Send message', description: 'Send to verified contact' },
      { title: 'Confirm response', description: 'Log reply or escalate if needed' },
    ],
  },
  {
    id: 'sms',
    label: 'SMS',
    taskType: 'SMS',
    title: 'Client SMS',
    description: 'Short SMS reminder or update.',
    subtasks: [
      { title: 'Write SMS', description: 'Stay within length and include key detail' },
      { title: 'Send and log', description: 'Send SMS and record delivery or reply' },
    ],
  },
  {
    id: 'lead-nurture',
    label: 'Lead follow-up',
    taskType: 'FOLLOW_UP',
    title: 'Lead follow-up',
    description: 'Research and contact the lead.',
    targetCategory: 'lead_follow_up',
    subtasks: [
      { title: 'Research lead', description: 'Review lead profile and history' },
      { title: 'Make contact', description: 'Call, email, or visit' },
    ],
  },
  {
    id: 'proposal',
    label: 'Proposal',
    taskType: 'PROPOSAL',
    title: 'Prepare client proposal',
    description: 'Build, review, and send a formal proposal.',
    subtasks: [
      { title: 'Gather requirements', description: 'Confirm scope, pricing, and terms' },
      { title: 'Draft proposal', description: 'Prepare document for review' },
      { title: 'Send proposal', description: 'Deliver to client and set follow-up' },
    ],
  },
  {
    id: 'report',
    label: 'Report',
    taskType: 'REPORT',
    title: 'Activity report',
    description: 'Compile and submit a report for the period or visit.',
    subtasks: [
      { title: 'Gather data', description: 'Collect metrics, notes, and attachments' },
      { title: 'Draft report', description: 'Write summary and highlights' },
      { title: 'Submit report', description: 'Share with manager or client' },
    ],
  },
  {
    id: 'quote-follow-up',
    label: 'Quotation follow-up',
    taskType: 'QUOTATION',
    title: 'Follow up on quotation',
    description: 'Review quote status and contact the client.',
    subtasks: [
      { title: 'Review quotation', description: 'Check pricing and line items' },
      { title: 'Call client', description: 'Confirm decision or objections' },
    ],
  },
  {
    id: 'standard-visit',
    label: 'Client visit',
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
    id: 'general-task',
    label: 'General task',
    taskType: 'OTHER',
    title: 'General task',
    description: 'Ad-hoc task with notes and completion checklist.',
    subtasks: [
      { title: 'Define outcome', description: 'Clarify what done looks like' },
      { title: 'Complete task', description: 'Execute and record result' },
    ],
  },
];

const TASK_TYPE_VALUES = Object.values(TaskType) as TaskTypeValue[];

function assertOneTemplatePerTaskType(): void {
  for (const type of TASK_TYPE_VALUES) {
    const matches = TASK_TEMPLATES.filter((t) => t.taskType === type);
    if (matches.length !== 1) {
      throw new Error(
        `TASK_TEMPLATES: expected exactly one template for ${type}, found ${matches.length}`
      );
    }
  }
}

assertOneTemplatePerTaskType();

export function getTemplatesForTaskType(taskType: TaskTypeValue): TaskTemplate[] {
  return TASK_TEMPLATES.filter((t) => t.taskType === taskType);
}

export function getTemplateForTaskType(taskType: TaskTypeValue): TaskTemplate | undefined {
  return TASK_TEMPLATES.find((t) => t.taskType === taskType);
}

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
