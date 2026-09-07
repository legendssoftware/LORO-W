import { describe, expect, it } from 'vitest';
import type { UserListItem } from '@/api/endpoints/user';
import {
  buildSalespersonPhotoMap,
  photoForSalesperson,
  salespersonInitials,
} from './salesperson-avatars';

function user(partial: Partial<UserListItem> & Pick<UserListItem, 'uid' | 'name' | 'surname'>): UserListItem {
  return {
    email: `${partial.name}@example.com`,
    ...partial,
  };
}

describe('salespersonInitials', () => {
  it('uses the first two letters of a single token', () => {
    expect(salespersonInitials('BRANDON')).toBe('BR');
  });

  it('uses first and last token initials', () => {
    expect(salespersonInitials('Jean Dre')).toBe('JD');
  });
});

describe('buildSalespersonPhotoMap', () => {
  it('matches unique first names and full names', () => {
    const map = buildSalespersonPhotoMap([
      user({ uid: 1, name: 'Brandon', surname: 'Kawu', photoURL: 'https://cdn/brandon.jpg' }),
    ]);
    expect(photoForSalesperson('BRANDON', map)).toBe('https://cdn/brandon.jpg');
    expect(photoForSalesperson('Brandon Kawu', map)).toBe('https://cdn/brandon.jpg');
  });

  it('omits photos when first names collide', () => {
    const map = buildSalespersonPhotoMap([
      user({ uid: 1, name: 'Brandon', surname: 'A', photoURL: 'https://cdn/a.jpg' }),
      user({ uid: 2, name: 'Brandon', surname: 'B', photoURL: 'https://cdn/b.jpg' }),
    ]);
    expect(photoForSalesperson('BRANDON', map)).toBeUndefined();
  });
});
