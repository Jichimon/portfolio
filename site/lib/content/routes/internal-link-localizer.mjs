import { buildLocalizedRoutePath } from './route-set.mjs';

const FRAGMENT_HREF_PATTERN = /^#/;
const MAILTO_HREF_PATTERN = /^mailto:/i;
const EXTERNAL_OR_PROTOCOL_RELATIVE_HREF_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const SPANISH_ROUTE_PREFIX = '/es/';

export function localizeInternalHref(href, lang) {
  if (
    FRAGMENT_HREF_PATTERN.test(href) ||
    MAILTO_HREF_PATTERN.test(href) ||
    EXTERNAL_OR_PROTOCOL_RELATIVE_HREF_PATTERN.test(href) ||
    href.startsWith(SPANISH_ROUTE_PREFIX)
  ) {
    return href;
  }
  return buildLocalizedRoutePath(href, lang);
}
