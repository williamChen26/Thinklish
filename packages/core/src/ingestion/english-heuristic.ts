/**
 * English filter for feed items: if more than half of non-whitespace characters look
 * non-Latin (not Latin script letters, not ASCII digits / common punctuation), treat as non-English.
 */
export function isLikelyEnglishText(text: string): boolean {
  const chars = [...text.replace(/\s/g, '')];
  if (chars.length === 0) {
    return true;
  }

  let nonLatin = 0;
  for (const c of chars) {
    if (/\d/.test(c)) {
      continue;
    }
    if (/[.,!?;:'"()[\]{}%\-–—/&+=@#$*]/.test(c)) {
      continue;
    }
    if (/\p{Script=Latin}/u.test(c)) {
      continue;
    }
    nonLatin++;
  }

  return nonLatin / chars.length <= 0.5;
}
