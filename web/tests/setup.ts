import '@testing-library/jest-dom/vitest'

// jsdom does not implement ResizeObserver, which App uses to publish the real
// header height as `--header-h`. A no-op stub is enough: the component applies
// the measurement once up front, and layout never changes under jsdom.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub
}

if (!('IntersectionObserver' in globalThis)) {
  class IntersectionObserverStub implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin = '0px'
    readonly thresholds: ReadonlyArray<number> = []
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
  globalThis.IntersectionObserver = IntersectionObserverStub
}

// jsdom does no layout, so scrollIntoView is absent. Tests that care about the
// deep-link jump spy on this.
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {}
}
