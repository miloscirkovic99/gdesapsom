import { firstIncompleteStep, isStepComplete, resumeStep, SPOT_STEPS, SpotControl } from './spot-steps';

const REQUIRED: SpotControl[] = ['iuo_ime', 'ugo_id', 'iuo_adressa', 'ops_id', 'sta_id', 'bas_id', 'iuo_link_web'];

/** Validity as the form reports it: optional fields are always valid, required ones when filled. */
const validWith = (filled: SpotControl[]) => (control: SpotControl) =>
  !REQUIRED.includes(control) || filled.includes(control);

describe('suggest-a-place steps', () => {
  it('asks every required field in exactly one step and ends with the review', () => {
    const asked = SPOT_STEPS.flatMap((step) => step.controls);
    expect(new Set(asked).size).toBe(asked.length);
    expect(REQUIRED.every((control) => asked.includes(control))).toBe(true);
    expect(SPOT_STEPS.at(-1)?.id).toBe('review');
  });

  it('completes the photo step only with the outside photo', () => {
    const photos = SPOT_STEPS.find((step) => step.id === 'photos');
    if (!photos) throw new Error('no photo step');
    expect(isStepComplete(photos, validWith([]), false)).toBe(false);
    expect(isStepComplete(photos, validWith([]), true)).toBe(true);
  });

  it('finds the first step that still misses something', () => {
    expect(firstIncompleteStep(SPOT_STEPS, validWith([]), false)).toBe(0);
    expect(firstIncompleteStep(SPOT_STEPS, validWith(['iuo_ime', 'ugo_id', 'iuo_adressa', 'ops_id']), false)).toBe(1);
    expect(firstIncompleteStep(SPOT_STEPS, validWith(REQUIRED), false)).toBe(3);
    expect(firstIncompleteStep(SPOT_STEPS, validWith(REQUIRED), true)).toBe(-1);
  });

  it('reopens a draft where it was left, but not past a step with something missing', () => {
    const placeDone = validWith(['iuo_ime', 'ugo_id', 'iuo_adressa', 'ops_id']);
    expect(resumeStep(2, SPOT_STEPS, placeDone, false)).toBe(1);
    expect(resumeStep(1, SPOT_STEPS, placeDone, false)).toBe(1);
    expect(resumeStep(4, SPOT_STEPS, validWith(REQUIRED), true)).toBe(4);
    expect(resumeStep(99, SPOT_STEPS, validWith(REQUIRED), true)).toBe(4);
    expect(resumeStep(-3, SPOT_STEPS, validWith(REQUIRED), true)).toBe(0);
  });
});
