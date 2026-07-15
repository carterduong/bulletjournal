import { describe, expect, it } from 'vitest';
import {
  appendLines,
  getNextDailyKey,
  moveIncompleteLines,
  moveLine,
  splitNote,
} from './noteUtils';

describe('splitNote', () => {
  it('uses explicit newlines as item boundaries', () => {
    expect(splitNote('a visually wrapped item\nnext item')).toEqual([
      'a visually wrapped item',
      'next item',
    ]);
  });
});

describe('appendLines', () => {
  it('appends to populated notes without adding duplicate separators', () => {
    expect(appendLines('existing', ['moved'])).toBe('existing\nmoved');
    expect(appendLines('existing\n', ['moved'])).toBe('existing\nmoved');
  });
});

describe('getNextDailyKey', () => {
  const noteKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'weekend'];

  it('moves Friday items into the current weekend', () => {
    expect(getNextDailyKey(4, noteKeys, new Date(2026, 6, 13))).toBe('weekend');
  });

  it('moves weekend items into the following Monday', () => {
    expect(getNextDailyKey(5, noteKeys, new Date(2026, 6, 13))).toBe('7.20.2026');
  });
});

describe('moveLine', () => {
  it('moves one selected line and preserves the others', () => {
    expect(moveLine('first\nsecond\nthird', 'destination', 1)).toEqual({
      source: 'first\nthird',
      destination: 'destination\nsecond',
      moved: true,
    });
  });

  it('does not move an empty separator line', () => {
    expect(moveLine('first\n\nthird', '', 1)).toEqual({
      source: 'first\n\nthird',
      destination: '',
      moved: false,
    });
  });
});

describe('moveIncompleteLines', () => {
  it('keeps lines whose first character is x and moves every other line', () => {
    const source = [
      'work',
      'x mp, reply joe',
      '- tar, qa',
      '',
      ' x intentionally not completed',
      'x vm, reply mazlyn',
    ].join('\n');

    expect(moveIncompleteLines(source, 'already there')).toEqual({
      source: 'x mp, reply joe\nx vm, reply mazlyn',
      destination: 'already there\nwork\n- tar, qa\n\n x intentionally not completed',
      moved: true,
    });
  });

  it('does nothing when every line is completed', () => {
    expect(moveIncompleteLines('x one\nx two', 'next')).toEqual({
      source: 'x one\nx two',
      destination: 'next',
      moved: false,
    });
  });

  it('does nothing for an empty note', () => {
    expect(moveIncompleteLines('', 'next')).toEqual({
      source: '',
      destination: 'next',
      moved: false,
    });
  });
});
