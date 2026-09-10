/** True when the URL is the static inspector, not the explainer SPA. */
export function isLivemodelAssetPath(pathname: string): boolean {
  return pathname === '/livemodel' || pathname.startsWith('/livemodel/')
}
