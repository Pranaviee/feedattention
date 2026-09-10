import type { Transition } from "motion/react";
import { DEFAULT_CHART_ENTER_TRANSITION } from "./animation";

export function transitionWithDelay(
  transition: Transition | undefined,
  delaySeconds: number,
  fallback: Transition = DEFAULT_CHART_ENTER_TRANSITION
): Transition {
  const base = transition ?? fallback;
  return { ...base, delay: delaySeconds };
}

export interface SpringOptions {
  stiffness: number;
  damping: number;
  mass?: number;
}

export function springOptionsFromTransition(
  transition?: Transition,
  fallback: SpringOptions = { stiffness: 60, damping: 20 }
): SpringOptions {
  if (!transition) {
    return fallback;
  }
  const spring = transition as Transition & {
    bounce?: number;
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
  if (transition.type === "spring") {
    const bounce =
      typeof spring.bounce === "number" ? spring.bounce : undefined;
    const baseStiffness =
      typeof spring.stiffness === "number"
        ? spring.stiffness
        : fallback.stiffness;
    const baseDamping =
      typeof spring.damping === "number" ? spring.damping : fallback.damping;
    return {
      stiffness:
        bounce == null
          ? baseStiffness
          : Math.min(400, Math.max(80, baseStiffness * (1 + bounce * 0.35))),
      damping:
        bounce == null
          ? baseDamping
          : Math.max(8, baseDamping * (1 - bounce * 0.25)),
      mass: typeof spring.mass === "number" ? spring.mass : fallback.mass,
    };
  }
  const duration =
    "duration" in transition && typeof transition.duration === "number"
      ? transition.duration
      : 0.8;
  return {
    stiffness: Math.min(500, Math.max(40, 280 / duration)),
    damping: Math.min(40, Math.max(12, 18 + duration * 4)),
  };
}
