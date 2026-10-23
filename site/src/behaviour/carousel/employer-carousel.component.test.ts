import { describe, expect, it } from 'vitest';
import { slotFor, mount } from './employer-carousel.mjs';

// The ring's arithmetic is a pure function over indices — the one piece a unit test
// can own completely. The wiring above it is exercised through jsdom with the exact
// markup the section renders: slots carrying their server-rendered data-pos, cards
// that are real anchors, arrows, dots. jsdom lays nothing out, and none of this
// needs it to — the module's decisions are index math and attribute moves, never
// geometry; the flight between slots is CSS, and the e2e owns that half.

describe('slotFor', () => {
  it('seats the active card, its two neighbours, and hides every other', () => {
    // Five cards, the first active: one active, one right, one left (the ring's own
    // neighbour), two hidden underneath.
    expect(slotFor(0, 0, 5)).toBe('active');
    expect(slotFor(1, 0, 5)).toBe('right');
    expect(slotFor(4, 0, 5)).toBe('left');
    expect(slotFor(2, 0, 5)).toBe('hidden');
    expect(slotFor(3, 0, 5)).toBe('hidden');
  });

  it('wraps: the ring has no first and no last', () => {
    // Active at the last of five, the first card is the right-hand neighbour and the
    // fourth is the left-hand one.
    expect(slotFor(0, 4, 5)).toBe('right');
    expect(slotFor(3, 4, 5)).toBe('left');
    expect(slotFor(1, 4, 5)).toBe('hidden');
    // Active at the third of five: the neighbours are one step away either way —
    // the fourth card to the right, the second to the left — and the rest hidden.
    expect(slotFor(2, 2, 5)).toBe('active');
    expect(slotFor(3, 2, 5)).toBe('right');
    expect(slotFor(1, 2, 5)).toBe('left');
    expect(slotFor(4, 2, 5)).toBe('hidden');
    expect(slotFor(0, 2, 5)).toBe('hidden');
  });

  it('seats every card with three — nothing to hide when all three are visible', () => {
    expect(slotFor(0, 0, 3)).toBe('active');
    expect(slotFor(1, 0, 3)).toBe('right');
    expect(slotFor(2, 0, 3)).toBe('left');
  });

  it('forms no ring below three cards — the static fallback owns that count', () => {
    expect(slotFor(0, 0, 2)).toBeNull();
    expect(slotFor(0, 0, 1)).toBeNull();
    expect(slotFor(0, 0, 0)).toBeNull();
  });
});

type MountSpec = {
  companies: string[];
};

// Builds the section exactly as the component renders it: slots with server-rendered
// data-pos (first active, second right, last left, rest hidden), anchor cards, arrows,
// dots named by their company. The one difference from production: jsdom never runs
// the component's script tag, so mount is called directly — the same entry point the
// script calls.
function buildSection({ companies }: MountSpec): HTMLElement {
  const section = document.createElement('section');
  section.className = 'employers-section';
  section.id = 'employers';

  const heading = document.createElement('h2');
  heading.textContent = 'Where the strip heading goes';
  section.appendChild(heading);

  const stage = document.createElement('div');
  stage.className = 'employers-section__stage';
  companies.forEach((company, index) => {
    const slot = document.createElement('div');
    slot.className = 'employers-section__slot';
    slot.setAttribute('data-carousel-slot', '');
    const position =
      index === 0 ? 'active' : index === 1 ? 'right' : index === companies.length - 1 ? 'left' : 'hidden';
    slot.setAttribute('data-pos', position);

    const card = document.createElement('a');
    card.className = 'employer-card';
    // A placeholder fragment, deliberately not a real route: the route set belongs to
    // the collection, and this test never asserts where a card points — only whether
    // its click was prevented.
    card.setAttribute('href', '#card');
    const name = document.createElement('span');
    name.className = 'employer-card__name';
    name.textContent = company;
    card.appendChild(name);
    slot.appendChild(card);
    stage.appendChild(slot);
  });

  const prev = document.createElement('button');
  prev.className = 'employers-section__nav employers-section__nav--prev';
  const next = document.createElement('button');
  next.className = 'employers-section__nav employers-section__nav--next';
  stage.appendChild(prev);
  stage.appendChild(next);
  section.appendChild(stage);

  const dots = document.createElement('div');
  dots.className = 'employers-section__dots';
  companies.forEach((company) => {
    const dot = document.createElement('button');
    dot.className = 'employers-section__dot';
    dot.setAttribute('aria-label', company);
    dots.appendChild(dot);
  });
  section.appendChild(dots);
  document.body.appendChild(section);
  return section;
}

function positionsOf(section: HTMLElement): (string | null)[] {
  return Array.from(section.querySelectorAll('[data-carousel-slot]')).map((slot) =>
    slot.getAttribute('data-pos'),
  );
}

function activeCompanyOf(section: HTMLElement): string | null {
  const active = section.querySelector('[data-pos="active"] .employer-card__name');
  return active?.textContent ?? null;
}

function hiddenCardsOf(section: HTMLElement): HTMLElement[] {
  return Array.from(section.querySelectorAll('[data-pos="hidden"] .employer-card'));
}

describe('mount', () => {
  it('keeps the server-rendered rest state: one active, two neighbours, the rest hidden and unreachable', () => {
    const section = buildSection({ companies: ['Freelancer', 'NICE', 'Banco', 'Mamaya', 'Avicola'] });
    mount(section);

    expect(positionsOf(section)).toEqual(['active', 'right', 'hidden', 'hidden', 'left']);
    expect(activeCompanyOf(section)).toBe('Freelancer');

    const hiddenCards = hiddenCardsOf(section);
    expect(hiddenCards).toHaveLength(2);
    for (const card of hiddenCards) {
      expect(card.getAttribute('tabindex')).toBe('-1');
      expect(card.getAttribute('aria-hidden')).toBe('true');
    }

    section.remove();
  });

  it('steps forward and back, wrapping past both ends', () => {
    const section = buildSection({ companies: ['Freelancer', 'NICE', 'Banco', 'Mamaya', 'Avicola'] });
    mount(section);

    section.querySelector<HTMLElement>('.employers-section__nav--next')?.click();
    expect(activeCompanyOf(section)).toBe('NICE');

    // Back from the first card wraps to the last.
    section.querySelector<HTMLElement>('.employers-section__nav--prev')?.click();
    expect(activeCompanyOf(section)).toBe('Freelancer');

    section.querySelector<HTMLElement>('.employers-section__nav--prev')?.click();
    expect(activeCompanyOf(section)).toBe('Avicola');

    // Forward from the last wraps back to the first.
    section.querySelector<HTMLElement>('.employers-section__nav--next')?.click();
    expect(activeCompanyOf(section)).toBe('Freelancer');

    section.remove();
  });

  it('moves the dots\u2019 current state both ways on a jump', () => {
    const section = buildSection({ companies: ['Freelancer', 'NICE', 'Banco', 'Mamaya', 'Avicola'] });
    mount(section);

    const dots = Array.from(section.querySelectorAll<HTMLElement>('.employers-section__dot'));
    const current = () => dots.findIndex((dot) => dot.getAttribute('aria-current') === 'true');
    expect(current()).toBe(0);

    dots[2].click();
    expect(activeCompanyOf(section)).toBe('Banco');
    expect(current()).toBe(2);
    expect(dots[0].getAttribute('aria-current')).toBeNull();

    section.remove();
  });

  it('centres a side card on click without navigating, and lets the centred card navigate', () => {
    const section = buildSection({ companies: ['Freelancer', 'NICE', 'Banco', 'Mamaya', 'Avicola'] });
    mount(section);

    // The right-hand neighbour: its click must centre it AND be prevented. The
    // listener is once-only because the second half clicks the SAME card again —
    // centred now, and its click is legitimately not prevented.
    const rightCard = section.querySelector<HTMLAnchorElement>('[data-pos="right"] .employer-card');
    rightCard?.addEventListener(
      'click',
      (event) => {
        expect(event.defaultPrevented).toBe(true);
      },
      { once: true },
    );
    rightCard?.click();
    expect(activeCompanyOf(section)).toBe('NICE');

    // The centred card: its click is not prevented — it stays the link it always was.
    const activeCard = section.querySelector<HTMLAnchorElement>('[data-pos="active"] .employer-card');
    let activeDefaultPrevented: boolean | null = null;
    activeCard?.addEventListener('click', (event) => {
      activeDefaultPrevented = event.defaultPrevented;
    });
    activeCard?.click();
    expect(activeDefaultPrevented).toBe(false);
    expect(activeCompanyOf(section)).toBe('NICE');

    section.remove();
  });

  it('steps from the keyboard and stops the page from scrolling sideways for it', () => {
    const section = buildSection({ companies: ['Freelancer', 'NICE', 'Banco', 'Mamaya', 'Avicola'] });
    mount(section);

    section.querySelector<HTMLElement>('.employers-section__nav--next')?.focus();
    const arrowRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    section.querySelector<HTMLElement>('.employers-section__nav--next')?.dispatchEvent(arrowRight);
    expect(arrowRight.defaultPrevented).toBe(true);
    expect(activeCompanyOf(section)).toBe('NICE');

    const arrowLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    section.dispatchEvent(arrowLeft);
    expect(arrowLeft.defaultPrevented).toBe(true);
    expect(activeCompanyOf(section)).toBe('Freelancer');

    section.remove();
  });

  it('does nothing without the carousel markup — the static fallback section is left alone', () => {
    const section = document.createElement('section');
    section.className = 'employers-section';
    const row = document.createElement('div');
    row.className = 'employers-section__row';
    section.appendChild(row);

    expect(() => mount(section)).not.toThrow();
    expect(row.className).toBe('employers-section__row');

    section.remove();
  });
});