import { describe, expect, it } from 'vitest';
import { activityChannelLabel, classifyActivityChannel } from '@/lib/activity-channel';

describe('classifyActivityChannel', () => {
  it('splits telephone with only a landline from other phone logs', () => {
    expect(
      classifyActivityChannel({
        methodOfContact: 'Telephone',
        contactLandline: '011 555 0100',
        contactCellPhone: '',
      })
    ).toBe('landline');
    expect(
      classifyActivityChannel({
        methodOfContact: 'Telephone',
        contactLandline: '011 555 0100',
        contactCellPhone: '082 000 0000',
      })
    ).toBe('telephone');
    expect(classifyActivityChannel({ methodOfContact: 'Telephone' })).toBe('telephone');
  });

  it('counts only an explicit physical method as a visit', () => {
    expect(classifyActivityChannel({ methodOfContact: 'Physical' })).toBe('physical');
    expect(classifyActivityChannel({ methodOfContact: null })).toBe('other');
    expect(classifyActivityChannel({ methodOfContact: 'Email' })).toBe('email');
    expect(classifyActivityChannel({ methodOfContact: 'Whatsapp' })).toBe('whatsapp');
  });

  it('names every channel so All activity can equal the column sum', () => {
    const channels = ['physical', 'telephone', 'landline', 'email', 'whatsapp', 'other'] as const;
    expect(channels.map((channel) => activityChannelLabel(channel))).toEqual([
      'Physical',
      'Telephone',
      'Landline',
      'Email',
      'WhatsApp',
      'Other',
    ]);
  });
});
