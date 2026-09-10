import type { Transition } from "motion/react";

/** Default clip-reveal easing for cartesian charts. */
export const DEFAULT_ANIMATION_EASING = "cubic-bezier(0.85, 0, 0.15, 1)";

export const DEFAULT_ANIMATION_DURATION_MS = 1100;

type TweenTransition = Extract<Transition, { type?: "tween" }> & {
  duration?: number;
  ease?: NonNullable<Transition extends { ease?: infer E } ? E : never> | number[];
};

/** Default enter transition — matches the original line chart reveal. */
export const DEFAULT_CHART_ENTER_TRANSITION = {
  type: "tween" as const,
  duration: DEFAULT_ANIMATION_DURATION_MS / 1000,
  ease: [0.85, 0, 0.15, 1] as [number, number, number, number],
};

function tweenFields(transition?: Transition): {
  duration?: number;
  ease?: (typeof DEFAULT_CHART_ENTER_TRANSITION)["ease"];
} {
  if (!transition) {
    return {};
  }
  const record = transition as TweenTransition;
  return {
    duration: typeof record.duration === "number" ? record.duration : undefined,
    ease: Array.isArray(record.ease)
      ? (record.ease as [number, number, number, number])
      : undefined,
  };
}

/**
 * Clip-path width reveal must use tween — spring does not reliably animate SVG width.
 */
export function clipRevealTransition(enterTransition?: Transition): typeof DEFAULT_CHART_ENTER_TRANSITION {
  const fields = tweenFields(enterTransition);
  if (enterTransition?.type === "tween") {
    return {
      ...DEFAULT_CHART_ENTER_TRANSITION,
      ...enterTransition,
      type: "tween",
      ease: fields.ease ?? DEFAULT_CHART_ENTER_TRANSITION.ease,
      duration: fields.duration ?? DEFAULT_CHART_ENTER_TRANSITION.duration,
    };
  }

  return {
    type: "tween",
    duration: fields.duration ?? DEFAULT_ANIMATION_DURATION_MS / 1000,
    ease: DEFAULT_CHART_ENTER_TRANSITION.ease,
  };
}
