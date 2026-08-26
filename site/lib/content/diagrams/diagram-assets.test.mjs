import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectReferencedDiagramIds, resolveDiagramAssets } from './diagram-assets.mjs';

test('collects the ids named by every :::diagram directive in a body', () => {
  const body = [
    'Some prose before the figure.',
    '',
    ':::diagram{id="platform-c4-context" type="c4-context"}',
    'The platform seen from outside its own boundary.',
    ':::',
    '',
    'More prose.',
    '',
    ':::diagram{id="platform-auth-boundary" type="c4-container"}',
    'Where the auth boundary sits.',
    ':::',
  ].join('\n');

  const ids = collectReferencedDiagramIds([body]);

  assert.deepEqual(ids, ['platform-c4-context', 'platform-auth-boundary']);
});

test('deduplicates an id referenced twice, including across separate bodies', () => {
  const englishBody = [
    ':::diagram{id="otp-breakeven" type="table"}',
    'Break-even point for the OTP provider swap.',
    ':::',
  ].join('\n');
  const spanishBody = [
    ':::diagram{id="otp-breakeven" type="table"}',
    'Punto de equilibrio del cambio de proveedor de OTP.',
    ':::',
  ].join('\n');

  const ids = collectReferencedDiagramIds([englishBody, spanishBody]);

  assert.deepEqual(ids, ['otp-breakeven']);
});

test('resolves every referenced id that has a matching .svg', () => {
  const referencedIds = ['platform-c4-context', 'platform-auth-boundary', 'otp-breakeven'];
  const availableSvgIds = new Set(['platform-c4-context', 'platform-auth-boundary', 'otp-breakeven', 'qr-c4-container']);

  const resolvedIds = resolveDiagramAssets(referencedIds, availableSvgIds);

  assert.deepEqual(resolvedIds, ['platform-c4-context', 'platform-auth-boundary', 'otp-breakeven']);
});

test('throws naming the id when no .svg exists for it', () => {
  const referencedIds = ['platform-c4-context', 'missing-diagram-id'];
  const availableSvgIds = new Set(['platform-c4-context']);

  assert.throws(
    () => resolveDiagramAssets(referencedIds, availableSvgIds),
    /missing-diagram-id/,
  );
});

test('names every missing id when several are missing, not only the first', () => {
  const referencedIds = ['first-missing-id', 'platform-c4-context', 'second-missing-id'];
  const availableSvgIds = new Set(['platform-c4-context']);

  assert.throws(
    () => resolveDiagramAssets(referencedIds, availableSvgIds),
    (error) => error.message.includes('first-missing-id') && error.message.includes('second-missing-id'),
  );
});

test('resolves all eleven distinct ids referenced across five entries in two locales', () => {
  const diagramIdsBySlug = {
    'mobile-banking-platform': ['platform-c4-context', 'platform-auth-boundary'],
    'qr-collections-for-merchants': ['qr-c4-container', 'qr-permission-model'],
    'otp-provider-decoupling': ['otp-c4-before', 'otp-c4-after', 'otp-breakeven'],
    'legacy-payment-data-migration': ['migration-phases'],
    'multi-tenant-biometric-attendance': ['attendance-c4-context', 'attendance-c4-container', 'attendance-c4-component'],
  };

  const directiveLine = (id) => `:::diagram{id="${id}" type="c4-context"}\ncaption\n:::`;
  const bodies = [];
  for (const ids of Object.values(diagramIdsBySlug)) {
    const body = ids.map(directiveLine).join('\n\n');
    // Both locales reference the same diagram ids from their own body.
    bodies.push(body, body);
  }

  const elevenIds = [
    'platform-c4-context', 'platform-auth-boundary', 'qr-c4-container', 'qr-permission-model',
    'otp-c4-before', 'otp-c4-after', 'otp-breakeven', 'migration-phases',
    'attendance-c4-context', 'attendance-c4-container', 'attendance-c4-component',
  ];
  const availableSvgIds = new Set(elevenIds);

  const referencedIds = collectReferencedDiagramIds(bodies);
  const resolvedIds = resolveDiagramAssets(referencedIds, availableSvgIds);

  assert.equal(resolvedIds.length, 11);
  assert.deepEqual([...resolvedIds].sort(), [...elevenIds].sort());
});

test('a directive line only counts when it starts the line and ends it', () => {
  const notDirectives = [
    '  :::diagram{id="indented-id"}',
    'prose before :::diagram{id="inline-id"}',
    ':::diagram{id="trailing-id"} and more text',
  ].join('\n');

  assert.deepEqual(collectReferencedDiagramIds([notDirectives]), []);
});

test('the missing-id error says what is missing, not merely that something is', () => {
  assert.throws(
    () => resolveDiagramAssets(['absent-one', 'absent-two'], new Set(['present'])),
    (error) => {
      assert.match(error.message, /absent-one/);
      assert.match(error.message, /absent-two/);
      return true;
    },
  );
});

test('an empty reference list resolves to nothing rather than throwing', () => {
  assert.deepEqual(resolveDiagramAssets([], new Set()), []);
});
