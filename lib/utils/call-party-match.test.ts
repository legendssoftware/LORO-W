import { describe, expect, it } from 'vitest';
import type { BranchListItem } from '@/api/types/branch';
import type { UserListItem } from '@/api/endpoints/user';
import {
  buildCallPartyMatchIndex,
  matchAgentParty,
  matchClientParty,
  matchNamedParty,
} from '@/lib/utils/call-party-match';

const branches: BranchListItem[] = [
  { uid: 1, name: 'Boksburg Branch', alias: 'BitBoksburg' },
  { uid: 2, name: 'Kats Store', alias: 'BitKats' },
  { uid: 3, name: 'Head Office', alias: 'Main office' },
];

const users: UserListItem[] = [
  {
    uid: 10,
    name: 'Ada',
    surname: 'Khumalo',
    email: 'ada@example.com',
    pbxExtension: '1000',
    branchUid: 3,
  },
];

describe('call-party-match', () => {
  const index = buildCallPartyMatchIndex(branches, users);

  it('matches Bit-prefixed PBX names to branch alias', () => {
    const party = matchNamedParty('BitBoksburg', '1006', index);
    expect(party.kind).toBe('branch');
    expect(party.branch?.uid).toBe(1);
    expect(party.label).toBe('BitBoksburg');
  });

  it('treats ring groups as other, not branches', () => {
    const party = matchNamedParty('RingGroup Denver', '6300', index);
    expect(party.kind).toBe('other');
    expect(party.branch).toBeNull();
    expect(party.label).toBe('RingGroup Denver');
  });

  it('maps Main office to the HQ branch', () => {
    const party = matchNamedParty('Main office', '1000', index);
    expect(party.kind).toBe('branch');
    expect(party.branch?.uid).toBe(3);
  });

  it('resolves an extension to the agent at that branch', () => {
    const party = matchNamedParty(null, '1000', index);
    expect(party.kind).toBe('agent');
    expect(party.label).toBe('Ada Khumalo');
    expect(party.branch?.uid).toBe(3);
  });

  it('uses ownerName as the agent even when fromName is a branch', () => {
    const party = matchAgentParty(
      { ownerName: 'Ada Khumalo', fromName: 'BitKats', fromNumber: '1002' },
      index,
    );
    expect(party.kind).toBe('agent');
    expect(party.label).toBe('Ada Khumalo');
    expect(party.branch?.uid).toBe(2);
  });

  it('prefers linked lead/client names as other (green) parties', () => {
    const party = matchClientParty(
      {
        client: null,
        lead: { uid: 22870, name: 'Imra Traders Cc' },
        toName: '0758990406',
        toNumber: '0758990406',
      },
      index,
    );
    expect(party.kind).toBe('other');
    expect(party.label).toBe('Imra Traders Cc');
  });
});
