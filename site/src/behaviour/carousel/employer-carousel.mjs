/**
 * The employer strip's carousel behaviour — the site's first interactive widget.
 *
 * The stage composes without this module: the section renders the slots server-side
 * (the first card active, its declared neighbours at the sides, the rest hidden),
 * so the strip is a readable coverflow before any script runs and stays one if this
 * never loads. Everything here is the movement: the step arrows, the dots, the
 * keyboard, the swipe, and the click contract the author chose — a side card's click
 * centres it, the centred card's click navigates to the employer's story.
 */

/** The reference's own number: a drag must travel this far to step one slot. */
const SWIPE_THRESHOLD_PX = 45;

/** Mouse jitter on a deliberate click — a press that moved less than this is the
 * visitor clicking, not swiping, and its click must pass through untouched. Browsers
 * apply the same idea to touch taps. */
const CLICK_SLOP_PX = 6;

/**
 * The slot a card occupies at a given active index — the ring's whole arithmetic.
 * Distance 0 is the active card, 1 the right-hand neighbour, total-1 the left-hand
 * one; every other card is hidden underneath. Fewer than three cards form no ring
 * at all: the section renders its static fallback for that count and this returns
 * null, so the ring can never seat a card in a slot that does not exist.
 *
 * @param {number} index The card's own index.
 * @param {number} activeIndex The index of the card that should sit at the centre.
 * @param {number} total How many cards the ring holds.
 * @returns {'active'|'left'|'right'|'hidden'|null} The slot, or null below three cards.
 */
export function slotFor(index, activeIndex, total) {
  if (total < 3) return null;
  const distance = (index - activeIndex + total) % total;
  if (distance === 0) return 'active';
  if (distance === 1) return 'right';
  if (distance === total - 1) return 'left';
  return 'hidden';
}

/**
 * Wires one rendered section: reads the server-rendered rest state off its slots and
 * keeps every control in step with it. Bails without touching anything unless the
 * carousel markup is actually there — a section below three cards renders the static
 * fallback and no stage, and this must leave it alone.
 *
 * @param {Element} section The rendered employers section.
 * @returns {void}
 */
export function mount(section) {
  if (!(section instanceof HTMLElement)) return;

  const stage = section.querySelector('.employers-section__stage');
  if (!(stage instanceof HTMLElement)) return;

  const slots = Array.from(stage.querySelectorAll('[data-carousel-slot]'));
  const cards = slots.map((slot) => slot.querySelector('.employer-card'));
  const dots = Array.from(section.querySelectorAll('.employers-section__dot'));
  const previousButton = section.querySelector('.employers-section__nav--prev');
  const nextButton = section.querySelector('.employers-section__nav--next');

  if (
    slots.length < 3 ||
    !(previousButton instanceof HTMLButtonElement) ||
    !(nextButton instanceof HTMLButtonElement) ||
    cards.some((card) => !(card instanceof HTMLAnchorElement))
  ) {
    return;
  }

  const total = slots.length;

  // The server rendered the initial slots; the ring starts wherever they say, so the
  // script's rest state and the markup's can never disagree about where the visitor
  // is standing.
  const renderedActive = slots.findIndex((slot) => slot.getAttribute('data-pos') === 'active');
  let activeIndex = renderedActive === -1 ? 0 : renderedActive;

  /**
   * Applies one position to the whole strip: the slots, the hidden cards' reachability,
   * and the dots' current state. The card's click contract reads the slots, so the
   * slots are the single source of where the strip stands.
   *
   * @param {number} index The index to seat at the centre; wrapped, not clamped.
   * @returns {void}
   */
  function showSlide(index) {
    activeIndex = (index + total) % total;

    slots.forEach((slot, slotIndex) => {
      const position = slotFor(slotIndex, activeIndex, total);
      if (position === null) return;
      slot.setAttribute('data-pos', position);

      const card = cards[slotIndex];
      if (!(card instanceof HTMLAnchorElement)) return;
      if (position === 'hidden') {
        // Hidden cards are neither reachable by tab nor visible to the accessibility
        // tree — the stage must be a carousel, not a trap.
        card.setAttribute('tabindex', '-1');
        card.setAttribute('aria-hidden', 'true');
      } else {
        card.removeAttribute('tabindex');
        card.removeAttribute('aria-hidden');
      }
    });

    dots.forEach((dot, dotIndex) => {
      if (dotIndex === activeIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  previousButton.addEventListener('click', () => showSlide(activeIndex - 1));
  nextButton.addEventListener('click', () => showSlide(activeIndex + 1));
  dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => showSlide(dotIndex)));

  // The author's click contract: a side card's click CENTRES it — prevented, so the
  // link underneath does not fire — and the centred card's click navigates, which is
  // what the card has always been. A swipe past the threshold suppresses the click a
  // release would fire, so a drag never lands as a navigation.
  let suppressClick = false;
  cards.forEach((card, slotIndex) => {
    if (!(card instanceof HTMLAnchorElement)) return;
    card.addEventListener('click', (event) => {
      // The card is a link, not a button: a suppressed click must be PREVENTED, not
      // merely ignored — a swallow without a preventDefault still follows the href,
      // and a swipe that ends inside the wide centred card is exactly that click.
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      if (slotIndex !== activeIndex) {
        event.preventDefault();
        showSlide(slotIndex);
      }
    });
  });

  // The keyboard steps the strip from inside it, and the keypress never scrolls the
  // page sideways while it does.
  section.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showSlide(activeIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(activeIndex + 1);
    }
  });

  // The swipe: a horizontal drag past the threshold steps one slot in the drag's
  // direction — left brings the next card in, right the previous one — and a shorter
  // one changes nothing. Passive listeners: the stage's own scroll never happens.
  // The cards are links, and a link dragged is a NATIVE drag-and-drop in every
  // browser: the drag session captures the pointer stream and the pointerup this
  // whole gesture hangs on never arrives. Cancelling dragstart on the stage hands the
  // gesture back to the pointer events — the stage is a swipe surface first.
  stage.addEventListener('dragstart', (event) => {
    event.preventDefault();
  });
  let pointerStartX = null;
  stage.addEventListener(
    'pointerdown',
    (event) => {
      pointerStartX = event.clientX;
      suppressClick = false;
    },
    { passive: true },
  );
  stage.addEventListener(
    'pointerup',
    (event) => {
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(distance) < SWIPE_THRESHOLD_PX) {
        // A short drag is still a drag: its release must not land as the card's
        // click, or a swipe that fell short of the threshold would navigate the
        // visitor away mid-gesture — the strip's promise is that it changes
        // nothing. Only a press that never really moved (a click, jitter aside)
        // passes through and keeps its meaning.
        if (Math.abs(distance) > CLICK_SLOP_PX) suppressClick = true;
        return;
      }
      suppressClick = true;
      showSlide(distance < 0 ? activeIndex + 1 : activeIndex - 1);
    },
    { passive: true },
  );
  stage.addEventListener('pointercancel', () => {
    pointerStartX = null;
  });

  showSlide(activeIndex);
}