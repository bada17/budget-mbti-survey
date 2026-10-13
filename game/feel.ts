/** Claude's tuning surface. Distances are world pixels, durations milliseconds. */
export const FEEL = {
  walkSpeed: 150, interactionRadius: 37, questionRevealDistance: 100,
  cameraFollow: 0.12, cameraLookAhead: 0.16, maxDeltaMs: 40,
  transitionMs: 280, replyFeedbackMs: 650, walkBobPx: 1.5, walkCycleMs: 340,
  actorScale: 2.25, sceneryScale: 2, markerPulseMs: 1000,
  joystickRadius: 36, joystickDeadzone: 0.12, arrivalRadius: 36,
  effectsEnabled: true, reducedMotion: { transitionMs: 0, walkBobPx: 0 },
} as const;
