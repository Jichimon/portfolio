import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildArticleMasthead } from './article-masthead.mjs';

// Mirrors the English interface strings' `article` group — the five masthead labels.
const ARTICLE_LABELS = {
  role: 'Role',
  context: 'Context',
  period: 'Period',
  outcome: 'Outcome',
  stack: 'Stack',
};

test('omits the row for an absent key', () => {
  // Shaped like mobile-banking-platform.en.md's frontmatter: no `outcome` key at all.
  const data = {
    role: 'Backend Engineer → Solution Architect',
    context: 'Regulated bank · Latin America',
    period: '2023–2025',
    stack: ['.NET', 'AWS', 'SNS/SQS', 'MassTransit', 'Polly', 'SQL Server', 'BIAN'],
  };

  const rows = buildArticleMasthead(data, ARTICLE_LABELS);

  assert.equal(rows.length, 4);
  assert.equal(rows.some((row) => row.key === 'outcome'), false);
});

test('joins the stack array', () => {
  const data = {
    stack: ['.NET', 'AWS Fargate', 'AWS Lambda', 'DynamoDB', 'Aurora', 'SNS/SQS'],
  };

  const rows = buildArticleMasthead(data, ARTICLE_LABELS);

  const stackRow = rows.find((row) => row.key === 'stack');
  assert.equal(stackRow.value, '.NET · AWS Fargate · AWS Lambda · DynamoDB · Aurora · SNS/SQS');
});

test('preserves artboard row order', () => {
  // Declared out of artboard order on purpose — the entry's own key order must not
  // leak into the row order the masthead renders.
  const data = {
    stack: ['.NET', 'AWS Fargate'],
    outcome: 'Approved decomposition plan, execution begun.',
    role: 'Solution Architect',
    period: '2025',
    context: 'Regulated bank · Latin America',
  };

  const rows = buildArticleMasthead(data, ARTICLE_LABELS);

  assert.deepEqual(
    rows.map((row) => row.key),
    ['role', 'context', 'period', 'outcome', 'stack'],
  );
});

test('treats a present but empty value as absent', () => {
  // Three separate ways to be empty: an empty string, a whitespace-only string,
  // and an empty array. All three are present (own keys) but must yield no row.
  const data = {
    role: '',
    context: '   ',
    period: '2025',
    stack: [],
  };

  const rows = buildArticleMasthead(data, ARTICLE_LABELS);

  assert.deepEqual(rows.map((row) => row.key), ['period']);
});

test('throws naming a key with no matching label', () => {
  // `ui.article` here is missing `period` — a content/copy drift the build must
  // surface rather than render as a silently unlabelled row.
  const incompleteLabels = { role: 'Role', context: 'Context', outcome: 'Outcome', stack: 'Stack' };
  const data = { role: 'Solution Architect', period: '2025' };

  assert.throws(() => buildArticleMasthead(data, incompleteLabels), /period/);
});

test('a value that is neither a string nor an array yields no row', () => {
  // Nothing in the content carries one today; a schema change that let one through
  // should drop the row rather than render "[object Object]" under a real label.
  const rows = buildArticleMasthead({ role: 42, context: { a: 1 }, period: null, outcome: true, stack: '.NET' }, ARTICLE_LABELS);

  assert.deepEqual(rows.map((row) => row.key), ['stack']);
});

test('a single-element stack renders without a trailing separator', () => {
  const [row] = buildArticleMasthead({ stack: ['.NET'] }, ARTICLE_LABELS);
  assert.equal(row.value, '.NET');
});

test('a row carries its key, its label and its value', () => {
  assert.deepEqual(buildArticleMasthead({ role: 'Solution Architect' }, ARTICLE_LABELS), [
    { key: 'role', label: 'Role', value: 'Solution Architect' },
  ]);
});

test('a key the entry does not carry at all produces no row and no throw', () => {
  assert.deepEqual(buildArticleMasthead({}, ARTICLE_LABELS), []);
});
