import type { Lookup, CardCreateInput } from '@thinklish/shared';

export function generateCardFromLookup(lookup: Lookup): CardCreateInput {
  if (lookup.lookupType === 'word' || lookup.lookupType === 'phrase') {
    return generateWordCard(lookup);
  }
  return generateSentenceCard(lookup);
}

function generateWordCard(lookup: Lookup): CardCreateInput {
  const front = buildWordFront(lookup);
  const back = buildWordBack(lookup);
  const tags = buildTags(lookup);

  return {
    lookupId: lookup.id,
    front,
    back,
    tags
  };
}

function generateSentenceCard(lookup: Lookup): CardCreateInput {
  const front = buildSentenceFront(lookup);
  const back = buildSentenceBack(lookup);
  const tags = buildTags(lookup);

  return {
    lookupId: lookup.id,
    front,
    back,
    tags
  };
}

function buildWordFront(lookup: Lookup): string {
  const context = lookup.contextBefore
    ? `${lookup.contextBefore}<b>${lookup.selectedText}</b>${lookup.contextAfter}`
    : lookup.selectedText;

  return `<div style="text-align:center">
<div style="font-size:1.4em;font-weight:bold;margin-bottom:8px">${lookup.selectedText}</div>
<div style="font-size:0.9em;color:#666;font-style:italic">...${context}...</div>
</div>`;
}

function buildWordBack(lookup: Lookup): string {
  const sections = extractSections(lookup.aiResponse);
  const parts: string[] = [];

  for (const [heading, content] of sections) {
    parts.push(`<div style="margin-bottom:8px"><b>${heading}</b><br>${content}</div>`);
  }

  if (parts.length === 0) {
    parts.push(lookup.aiResponse.replace(/\n/g, '<br>'));
  }

  return parts.join('');
}

function buildSentenceFront(lookup: Lookup): string {
  return `<div style="font-size:1.1em;line-height:1.6">${lookup.selectedText}</div>`;
}

function buildSentenceBack(lookup: Lookup): string {
  return buildWordBack(lookup);
}

function extractSections(text: string): [string, string][] {
  const sections: [string, string][] = [];
  const lines = text.split('\n');
  let currentHeading = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading && currentContent.length > 0) {
        sections.push([currentHeading, currentContent.join('<br>')]);
      }
      currentHeading = line.replace('## ', '').trim();
      currentContent = [];
    } else if (line.trim()) {
      currentContent.push(line.trim());
    }
  }

  if (currentHeading && currentContent.length > 0) {
    sections.push([currentHeading, currentContent.join('<br>')]);
  }

  return sections;
}

function buildTags(lookup: Lookup): string {
  const tags: string[] = [lookup.lookupType];
  const date = new Date(lookup.createdAt);
  tags.push(date.toISOString().split('T')[0]);
  return tags.join(' ');
}
