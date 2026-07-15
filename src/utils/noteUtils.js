export function splitNote(value) {
  return value === '' ? [''] : value.split('\n');
}

export function getNextDailyKey(dayIndex, noteKeys, mondayDate) {
  if (dayIndex < 4) return noteKeys[dayIndex + 1];
  if (dayIndex === 4) return noteKeys[5];

  const nextMonday = new Date(mondayDate);
  nextMonday.setDate(nextMonday.getDate() + 7);
  return `${nextMonday.getMonth() + 1}.${nextMonday.getDate()}.${nextMonday.getFullYear()}`;
}

export function appendLines(destination, lines) {
  if (lines.length === 0) return destination;

  const movedText = lines.join('\n');
  if (destination === '') return movedText;
  return `${destination}${destination.endsWith('\n') ? '' : '\n'}${movedText}`;
}

export function moveLine(source, destination, lineIndex) {
  const lines = splitNote(source);
  if (lineIndex < 0 || lineIndex >= lines.length || lines[lineIndex] === '') {
    return { source, destination, moved: false };
  }

  const [line] = lines.splice(lineIndex, 1);
  return {
    source: lines.join('\n'),
    destination: appendLines(destination, [line]),
    moved: true,
  };
}

export function moveIncompleteLines(source, destination) {
  if (source === '') return { source, destination, moved: false };

  const remaining = [];
  const incomplete = [];

  for (const line of source.split('\n')) {
    if (line.startsWith('x')) {
      remaining.push(line);
    } else {
      incomplete.push(line);
    }
  }

  if (incomplete.length === 0) {
    return { source, destination, moved: false };
  }

  return {
    source: remaining.join('\n'),
    destination: appendLines(destination, incomplete),
    moved: true,
  };
}
