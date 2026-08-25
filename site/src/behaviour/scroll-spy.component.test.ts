import { describe, expect, it } from 'vitest';
import { initScrollSpy } from './scroll-spy.mjs';

// jsdom lays nothing out — every element reports zero for every geometric property, so a
// test that scrolled a real page and read real positions would tell us nothing. Instead the
// position lookup is injected: `measurePosition` is a plain function from a target element to
// a number, and each test supplies its own numbers through a mutable Map, then calls
// `update()` directly instead of dispatching a real scroll event. That exercises the exact
// same decision the module makes in a browser, without needing jsdom to lay anything out.

type HostItem = { id?: string; href: string; isRoute?: boolean };
type HostSpec = { hostClass: string; spyClass: string; items: HostItem[] };

function buildHost(root: HTMLElement, { hostClass, spyClass, items }: HostSpec) {
  const host = root.ownerDocument.createElement('ul');
  host.className = hostClass;
  host.setAttribute('data-spy', spyClass);
  for (const { id, href, isRoute } of items) {
    const li = root.ownerDocument.createElement('li');
    const anchor = root.ownerDocument.createElement('a');
    anchor.setAttribute('href', isRoute ? href : `#${href}`);
    anchor.textContent = href;
    li.appendChild(anchor);
    host.appendChild(li);
    if (id) {
      const section = root.ownerDocument.createElement('section');
      section.id = id;
      root.appendChild(section);
    }
  }
  root.appendChild(host);
  return host;
}

function currentClasses(host: Element, spyClass: string) {
  return Array.from(host.querySelectorAll('li')).map((li) => li.classList.contains(spyClass));
}

describe('initScrollSpy', () => {
  it('marks exactly one item: the one in the middle, above the first, and below the last', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = buildHost(root, {
      hostClass: 'nav',
      spyClass: 'current',
      items: [
        { id: 'one', href: 'one' },
        { id: 'two', href: 'two' },
        { id: 'three', href: 'three' },
      ],
    });
    const sections = Array.from(root.querySelectorAll('section'));
    const positions = new Map();
    const spy = initScrollSpy(root, {
      scrollTarget: null,
      measurePosition: (el: Element) => positions.get(el) ?? 0,
    });

    // Above the first section: every target is still below the activation offset.
    positions.set(sections[0], 500);
    positions.set(sections[1], 900);
    positions.set(sections[2], 1300);
    spy.update();
    expect(currentClasses(host, 'current')).toEqual([true, false, false]);

    // In the middle: the second section has scrolled past the activation offset, the third
    // has not yet.
    positions.set(sections[0], -400);
    positions.set(sections[1], 50);
    positions.set(sections[2], 600);
    spy.update();
    expect(currentClasses(host, 'current')).toEqual([false, true, false]);

    // Below the last: every target has scrolled past the activation offset.
    positions.set(sections[0], -900);
    positions.set(sections[1], -500);
    positions.set(sections[2], -100);
    spy.update();
    expect(currentClasses(host, 'current')).toEqual([false, false, true]);

    document.body.removeChild(root);
  });

  it('activates a section whose position lands exactly on the activation offset, not only strictly past it', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = buildHost(root, {
      hostClass: 'nav',
      spyClass: 'current',
      items: [
        { id: 'one', href: 'one' },
        { id: 'two', href: 'two' },
      ],
    });
    const sections = Array.from(root.querySelectorAll('section'));
    const positions = new Map();
    const spy = initScrollSpy(root, {
      scrollTarget: null,
      activationOffset: 50,
      measurePosition: (el: Element) => positions.get(el) ?? 0,
    });

    // The second section's position is exactly the activation offset — the boundary itself
    // counts as "in view", not only positions strictly less than it.
    positions.set(sections[0], 400);
    positions.set(sections[1], 50);
    spy.update();
    expect(currentClasses(host, 'current')).toEqual([false, true]);

    document.body.removeChild(root);
  });

  it('tracks two hosts on one page independently', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const nav = buildHost(root, {
      hostClass: 'nav',
      spyClass: 'nav-current',
      items: [
        { id: 'work', href: 'work' },
        { id: 'contact', href: 'contact' },
      ],
    });
    const toc = buildHost(root, {
      hostClass: 'toc',
      spyClass: 'toc-current',
      items: [
        { id: 'intro', href: 'intro' },
        { id: 'detail', href: 'detail' },
      ],
    });
    const positions = new Map();
    const workSection = root.querySelector('#work');
    const contactSection = root.querySelector('#contact');
    const introSection = root.querySelector('#intro');
    const detailSection = root.querySelector('#detail');
    const spy = initScrollSpy(root, {
      scrollTarget: null,
      measurePosition: (el: Element) => positions.get(el) ?? 0,
    });

    positions.set(workSection, -300);
    positions.set(contactSection, 400);
    positions.set(introSection, 200);
    positions.set(detailSection, 800);
    spy.update();

    expect(currentClasses(nav, 'nav-current')).toEqual([true, false]);
    expect(currentClasses(toc, 'toc-current')).toEqual([true, false]);

    document.body.removeChild(root);
  });

  it('skips a host whose anchors resolve to nothing, rather than throwing', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = root.ownerDocument.createElement('ul');
    host.setAttribute('data-spy', 'current');
    const li = root.ownerDocument.createElement('li');
    const anchor = root.ownerDocument.createElement('a');
    anchor.setAttribute('href', '#does-not-exist');
    li.appendChild(anchor);
    host.appendChild(li);
    root.appendChild(host);

    expect(() => initScrollSpy(root, { scrollTarget: null })).not.toThrow();

    document.body.removeChild(root);
  });

  it('leaves a route link in the list untouched', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = buildHost(root, {
      hostClass: 'nav',
      spyClass: 'current',
      items: [{ id: 'work', href: 'work' }],
    });
    // A route item, not an in-page anchor: it does not start with '#'.
    const routeLi = root.ownerDocument.createElement('li');
    const routeAnchor = root.ownerDocument.createElement('a');
    routeAnchor.setAttribute('href', 'https://example.com');
    routeLi.appendChild(routeAnchor);
    host.appendChild(routeLi);

    const positions = new Map();
    const workSection = root.querySelector('#work');
    const spy = initScrollSpy(root, {
      scrollTarget: null,
      measurePosition: (el: Element) => positions.get(el) ?? 0,
    });
    positions.set(workSection, -50);
    spy.update();

    expect(routeLi.classList.contains('current')).toBe(false);
    expect(routeLi.className).toBe('');

    document.body.removeChild(root);
  });

  it('clicking an entry moves to that section and leaves it marked current', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = buildHost(root, {
      hostClass: 'nav',
      spyClass: 'current',
      items: [
        { id: 'one', href: 'one' },
        { id: 'two', href: 'two' },
      ],
    });
    const sections = Array.from(root.querySelectorAll('section'));
    const positions = new Map();
    positions.set(sections[0], 400);
    positions.set(sections[1], 900);
    const spy = initScrollSpy(root, {
      scrollTarget: null,
      measurePosition: (el: Element) => positions.get(el) ?? 0,
    });
    spy.update();
    expect(currentClasses(host, 'current')).toEqual([true, false]);

    const secondAnchor = host.querySelectorAll('a')[1];
    secondAnchor.click();
    // The click navigates; the scroll that follows is what the module reacts to, simulated
    // here by the target's position moving to the top of the viewport.
    positions.set(sections[0], -600);
    positions.set(sections[1], 50);
    spy.update();
    expect(currentClasses(host, 'current')).toEqual([false, true]);

    document.body.removeChild(root);
  });
});
