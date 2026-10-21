/** The suggest-a-place form's controls (the API's field names). */
export type SpotControl =
  | 'iuo_ime'
  | 'iuo_adressa'
  | 'iuo_link_web'
  | 'iuo_telefon'
  | 'ops_id'
  | 'ugo_id'
  | 'sta_id'
  | 'bas_id'
  | 'iuo_opis';

export type SpotStepId = 'place' | 'dogs' | 'contact' | 'photos' | 'review';

export interface SpotStep {
  id: SpotStepId;
  /** Short name, in the progress line and on the review step. */
  label: string;
  title: string;
  lead: string;
  /** Controls checked before moving on; required ones carry a validator on the form. */
  controls: readonly SpotControl[];
  /** The step needs the outside photo. */
  needsPhoto?: boolean;
}

/** One topic per step, the questions in the order people know the answers. */
export const SPOT_STEPS: readonly SpotStep[] = [
  {
    id: 'place',
    label: 'mobile_step_place',
    title: 'mobile_step_place_title',
    lead: 'lp_add_lead',
    controls: ['iuo_ime', 'ugo_id', 'iuo_adressa', 'ops_id'],
  },
  {
    id: 'dogs',
    label: 'mobile_step_dogs',
    title: 'mobile_step_dogs_title',
    lead: 'mobile_step_dogs_lead',
    controls: ['sta_id', 'bas_id', 'iuo_opis'],
  },
  {
    id: 'contact',
    label: 'mobile_step_contact',
    title: 'mobile_step_contact_title',
    lead: 'mobile_step_contact_lead',
    controls: ['iuo_link_web', 'iuo_telefon'],
  },
  {
    id: 'photos',
    label: 'mobile_step_photos',
    title: 'mobile_step_photos_title',
    lead: 'mobile_step_photos_lead',
    controls: [],
    needsPhoto: true,
  },
  {
    id: 'review',
    label: 'mobile_step_review',
    title: 'mobile_step_review_title',
    lead: 'mobile_step_review_lead',
    controls: [],
  },
];

/** Whether everything `step` asks for is there. */
export function isStepComplete(step: SpotStep, isValid: (control: SpotControl) => boolean, hasPhoto: boolean): boolean {
  return step.controls.every(isValid) && (!step.needsPhoto || hasPhoto);
}

/** Index of the first step with something missing, or -1 when the form can be sent. */
export function firstIncompleteStep(
  steps: readonly SpotStep[],
  isValid: (control: SpotControl) => boolean,
  hasPhoto: boolean,
): number {
  return steps.findIndex((step) => !isStepComplete(step, isValid, hasPhoto));
}

/**
 * The step to show for a restored draft: where the user was, but never past
 * the first step that is still missing something.
 */
export function resumeStep(
  saved: number,
  steps: readonly SpotStep[],
  isValid: (control: SpotControl) => boolean,
  hasPhoto: boolean,
): number {
  const last = steps.length - 1;
  const wanted = Math.min(Math.max(0, Math.floor(saved)), last);
  const missing = firstIncompleteStep(steps, isValid, hasPhoto);
  return missing === -1 ? wanted : Math.min(wanted, missing);
}
