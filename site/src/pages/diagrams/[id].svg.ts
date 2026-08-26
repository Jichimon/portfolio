import type { APIRoute } from 'astro';
import { listDiagramIds, readDiagramAsset } from '../../gateway/content-queries.ts';

// One static route per diagram the content actually references, so the build emits
// exactly the assets the articles name and nothing else. This is a plain file copy
// expressed as a route: no rendering, no headless browser, no runtime resolution.
// An id named by a directive with no file behind it throws while this list is being
// built, which fails the build naming the id rather than shipping an <img> that
// renders as a silent gap on a published page.
export async function getStaticPaths() {
  const ids = await listDiagramIds();
  return ids.map((id) => ({ params: { id } }));
}

export const GET: APIRoute = ({ params }) =>
  new Response(readDiagramAsset(params.id as string), {
    headers: { 'content-type': 'image/svg+xml' },
  });
