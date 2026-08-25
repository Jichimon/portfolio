// Position tracking for a host element and its in-page anchors: as the visitor scrolls,
// exactly one anchor's parent is marked as the section currently in view. The host names its
// own marker class through `data-spy`, so one implementation serves every list that wants
// this — a nav, a table of contents, or anything else that points at sections on the same
// page. Nothing here reaches for `document` or `window` on its own: the root to operate on
// and the scroll source to listen on both arrive as arguments, so the same page can host more
// than one independently-tracked list and a test can run this more than once without state
// leaking between runs.

// A target counts as "in view" once its top has scrolled up past this many pixels from the
// tracking origin — trailing the very top edge, the way a fixed header would sit over it.
const DEFAULT_ACTIVATION_OFFSET = 140;

function isInPageAnchor(anchor) {
  const href = anchor.getAttribute('href');
  return typeof href === 'string' && href.charAt(0) === '#' && href.length > 1;
}

// Resolves one host's tracked items: its in-page anchors, each paired with the element its
// fragment points at. An anchor whose target cannot be found (or that is not an in-page
// anchor at all, such as a route link) is left out rather than paired with nothing — that is
// what keeps a route link in the same list untouched, and what lets a host with no
// resolvable anchors come back empty instead of throwing.
function buildTrackedGroup(host, root) {
  const anchors = Array.from(host.querySelectorAll('a[href]')).filter(isInPageAnchor);
  const items = anchors
    .map((anchor) => {
      const id = anchor.getAttribute('href').slice(1);
      const target = root.querySelector(`[id="${id}"]`);
      return target ? { anchor, target } : null;
    })
    .filter((item) => item !== null);
  return { markerClass: host.getAttribute('data-spy'), items };
}

// Exactly one index is ever chosen: the last item whose measured position has scrolled up
// past the activation offset, or the first item when none has — which is what keeps a single
// item marked above the first section and below the last one, not zero and not two.
function currentIndexForPositions(positions, activationOffset) {
  let current = 0;
  for (let index = 0; index < positions.length; index += 1) {
    if (positions[index] <= activationOffset) {
      current = index;
    }
  }
  return current;
}

function applyMark(group, currentIndex) {
  group.items.forEach((item, index) => {
    const listItem = item.anchor.parentElement;
    if (!listItem) return;
    listItem.classList.toggle(group.markerClass, index === currentIndex);
  });
}

// root: the element (or document) containing both the data-spy hosts and the sections their
// anchors point at.
//
// options.scrollTarget: what to listen on for scroll events — window by default, or an
// ancestor with its own scroll container, or null to attach no listener at all (a caller, or
// a test, that will invoke `update()` itself).
//
// options.measurePosition: given a target element, returns its current position. Defaults to
// reading the real layout; a test that has no real layout to read supplies its own function
// instead, which is the whole reason this is a parameter rather than a call baked into the
// module.
//
// options.activationOffset: the trailing distance described above.
export function initScrollSpy(root, options = {}) {
  const {
    scrollTarget = typeof window === 'undefined' ? null : window,
    measurePosition = (element) => element.getBoundingClientRect().top,
    activationOffset = DEFAULT_ACTIVATION_OFFSET,
  } = options;

  const groups = Array.from(root.querySelectorAll('[data-spy]'))
    .map((host) => buildTrackedGroup(host, root))
    .filter((group) => group.items.length > 0);

  function update() {
    groups.forEach((group) => {
      const positions = group.items.map((item) => measurePosition(item.target));
      applyMark(group, currentIndexForPositions(positions, activationOffset));
    });
  }

  if (groups.length > 0 && scrollTarget) {
    scrollTarget.addEventListener('scroll', update, { passive: true });
  }

  update();

  function destroy() {
    if (scrollTarget) {
      scrollTarget.removeEventListener('scroll', update);
    }
  }

  return { update, destroy };
}
