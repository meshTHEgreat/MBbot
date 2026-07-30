# Portal v2 UX contract

## Direction

- Mode: evolution.
- User and job: a research operator must understand the complete strategy
  pipeline, distinguish configurable values from the values a real queued run
  will use, validate one exact request, and queue it without accidental
  holdout or cost-policy changes.
- Direction: preserve the existing dark research-instrument surface and make
  causality its organizing visual language.
- Signature: an effective-state rail carried by every configuration control,
  every stage summary, and the final review.
- System: reuse the existing semantic colors, panels, typography, focus ring,
  mobile stepper, and 44px target floor. Add only state, optional-stage,
  review-table, and guided-flow primitives.
- UX risks: ignored settings that look executable; unsupported choices
  discovered only after validation; hidden optional defaults; lost context
  across nine stages; accidental queueing before review.

## Behavioral contract

- Selected Laws of UX:
  - Working Memory and Recognition: effective values, causes, and stage
    summaries stay visible instead of requiring recall.
  - Chunking and Cognitive Load: the pipeline remains nine task-shaped stages;
    optional stages disclose their stated defaults on demand.
  - Fitts: stage actions and mobile controls keep a minimum 44px target.
  - Goal Gradient: each stage ends with one truthful next-stage action, while
    free stepper navigation remains available.
- Nielsen priorities:
  - Visibility of system status: every control states whether it affects the
    current queue route.
  - Match with the real system: the legacy route shows its fixed effective
    values, not merely the adapter envelope values.
  - Error prevention: unsupported dual-cost selection is disabled at the
    point of choice.
  - User control: optional customizations can be reset to named defaults and
    every review row can be edited.
  - Consistency: the same four state labels and meanings recur throughout.
- Checklist coverage: tabs, buttons, inputs, radio and checkbox groups,
  disclosure, alert dialog, table, form validation, disabled/read-only,
  warning, error, and success states.

## Interaction and accessibility

- Stepper: APG tabs with manual focusability/automatic activation on click,
  Left/Right/Home/End movement, one selected tab, one visible tabpanel, and
  free navigation.
- Next actions: native `button type="button"` elements. Activation alone
  advances; form Enter is never intercepted. Focus moves to the destination
  panel heading.
- Optional stages: native disclosure buttons expose `aria-expanded` and
  `aria-controls`. Defaults remain named while details are collapsed.
- Holdout: the existing modal `alertdialog` retains focus entry, containment
  supplied by native `dialog`, Escape cancellation, explicit acknowledgement,
  and focus return.
- Review: a native table presents one row per configuration stage; Edit is a
  native button that returns focus to that stage heading.
- State markers: requested symbols are decorative (`aria-hidden`) and always
  paired with visible text. Each associated form control references the marker
  with `aria-describedby`.
- Queueing: Stage 8 is the only surface containing Validate and Queue. Any
  configuration edit clears the validated request fingerprint.

## Responsive and preference behavior

- 360px: scroll-snap stepper, single-column review rows, sticky Stage-8 action
  bar, full-screen holdout sheet, no body overflow.
- 768px and wider: nine-column stepper and non-fixed actions.
- Tables scroll within labeled containers; the page body never scrolls
  sideways.
- Ripple feedback is suppressed under `prefers-reduced-motion`.

## Required evidence

- Exact pre-pass default legacy request:
  - canonical UTF-8 bytes: 3023
  - SHA-256:
    `7291ed8f85c047391f879de631e3734938a9348f6ce4803e3c249e22c5002235`
- Local unit/schema tests.
- Local axe-core and Lighthouse mobile gates.
- Keyboard-only stepper, Next chain, optional reset, Review Edit, validation,
  and holdout-dialog walkthrough.
- 360, 768, 1024, and 1440px visual/responsive inspection.
