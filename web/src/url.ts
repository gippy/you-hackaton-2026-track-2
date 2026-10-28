// URLs the page builds. Behind Apify Standby the page is opened with ?token=..., and there is no session
// cookie, so every request the page makes (the WebSocket, audio, images) must carry the same token.
import type { ArtAsset } from '../../shared/protocol.ts';

const token = new URLSearchParams(location.search).get('token');

/** `path` with the page's token added, when the page has one. */
export function withToken(path: string): string {
    if (!token) return path;
    return `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
}

/** The URL of an art file from the manifest (`art/nightfall/...`), relative to the page, versioned by its content. */
export const artUrl = (asset: ArtAsset) => withToken(`./${asset.file}${asset.v ? `?v=${asset.v}` : ''}`);
