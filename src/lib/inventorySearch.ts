import { PROTEIN_ALIAS_GROUPS } from '@/lib/proteinAliases';
import {
  INVENTORY_CATEGORY_LABELS,
  INVENTORY_SUPPLIER_LABELS,
  type InventoryItem,
} from '@/lib/types';

const GREEK_TO_TEXT: Record<string, string> = {
  α: 'alpha',
  β: 'beta',
  γ: 'gamma',
  δ: 'delta',
};

function normalizeText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[αβγδ]/g, (match) => GREEK_TO_TEXT[match] ?? match)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function compact(value: string) {
  return normalizeText(value).replace(/\s+/g, '');
}

function digitParts(value: string) {
  return value.match(/\d+/g) ?? [];
}

function hasConflictingDigits(left: string, right: string) {
  const leftDigits = digitParts(left);
  const rightDigits = digitParts(right);

  return leftDigits.length > 0 && rightDigits.length > 0 && leftDigits.join(':') !== rightDigits.join(':');
}

function includesWithDigitBoundary(text: string, query: string) {
  const index = text.indexOf(query);

  if (index < 0) {
    return false;
  }

  if (!/\d$/.test(query)) {
    return true;
  }

  const nextChar = text[index + query.length] ?? '';
  return !/\d/.test(nextChar);
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (Math.abs(left.length - right.length) > 2) {
    return 3;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function fuzzyThreshold(value: string) {
  if (value.length < 5) {
    return 0;
  }

  return value.length >= 9 ? 2 : 1;
}

function isCloseEnough(left: string, right: string) {
  if (hasConflictingDigits(left, right)) {
    return false;
  }

  const threshold = Math.max(fuzzyThreshold(left), fuzzyThreshold(right));
  if (threshold <= 0) {
    return false;
  }

  return levenshteinDistance(left, right) <= threshold || isAdjacentTransposition(left, right);
}

function isAdjacentTransposition(left: string, right: string) {
  if (left.length !== right.length || left.length < 5) {
    return false;
  }

  const mismatches: number[] = [];

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      mismatches.push(index);
    }
  }

  return (
    mismatches.length === 2 &&
    mismatches[1] === mismatches[0] + 1 &&
    left[mismatches[0]] === right[mismatches[1]] &&
    left[mismatches[1]] === right[mismatches[0]]
  );
}

function termMatchesQuery(term: string, rawQuery: string) {
  const normalizedTerm = normalizeText(term);
  const normalizedQuery = normalizeText(rawQuery);
  const compactTerm = compact(term);
  const compactQuery = compact(rawQuery);

  if (!normalizedTerm || !normalizedQuery || !compactTerm || !compactQuery) {
    return false;
  }

  return (
    normalizedTerm === normalizedQuery ||
    includesWithDigitBoundary(normalizedTerm, normalizedQuery) ||
    compactTerm === compactQuery ||
    includesWithDigitBoundary(compactTerm, compactQuery) ||
    includesWithDigitBoundary(compactQuery, compactTerm) ||
    isCloseEnough(compactTerm, compactQuery)
  );
}

function textMatchesQuery(text: string, rawQuery: string) {
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(rawQuery);
  const compactText = compact(text);
  const compactQuery = compact(rawQuery);

  if (!normalizedQuery || !compactQuery) {
    return true;
  }

  if (
    includesWithDigitBoundary(normalizedText, normalizedQuery) ||
    includesWithDigitBoundary(compactText, compactQuery)
  ) {
    return true;
  }

  return normalizedText
    .split(' ')
    .filter((token) => token.length >= Math.max(5, compactQuery.length - 2))
    .some((token) => isCloseEnough(token, compactQuery));
}

function buildInventorySearchText(item: InventoryItem) {
  return [
    item.name,
    INVENTORY_CATEGORY_LABELS[item.category],
    INVENTORY_SUPPLIER_LABELS[item.supplier],
    item.location,
    item.locationPreset,
    item.locationDetail,
    item.locationFieldValues.map((field) => field.value).join(' '),
    item.notes,
  ].join(' ');
}

export function matchesInventorySearch(item: InventoryItem, rawQuery: string) {
  const query = rawQuery.trim();

  if (!query) {
    return true;
  }

  const searchText = buildInventorySearchText(item);

  if (textMatchesQuery(searchText, query)) {
    return true;
  }

  return PROTEIN_ALIAS_GROUPS.some((group) => {
    const queryMatchesAlias = group.some((alias) => termMatchesQuery(alias, query));
    const itemMatchesAlias = group.some((alias) => textMatchesQuery(searchText, alias));

    return queryMatchesAlias && itemMatchesAlias;
  });
}
