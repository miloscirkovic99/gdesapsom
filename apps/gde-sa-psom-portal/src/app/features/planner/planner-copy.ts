import type { LimitReason } from './planner.models';
import { formatLimitDate } from './planner-text';

/** Texts of the planner pages. Nothing here describes a particular place. */

export const PLANNER_INTRO =
  'Opiši psa i izaberi dan u gradu ili zimovanje. Planer slaže plan samo od mesta iz naše baze koja primaju pse, prema prognozi, radnom vremenu i tvom psu.';

export const LOADING_TEXT = 'Njuškamo najbolja mesta…';
export const RULES_BADGE = 'Plan sastavljen bez AI asistenta';

export const PLANNER_FAQ: readonly { question: string; answer: string }[] = [
  {
    question: 'Kako radi planer sa psom?',
    answer:
      'Izabereš grad i dan ili destinaciju za zimovanje i opišeš psa. Planer bira samo mesta iz baze Gde sa psom koja primaju pse i slaže ih prema prognozi i radnom vremenu.',
  },
  {
    question: 'Koliko planova mogu da napravim?',
    answer: 'Do 3 plana nedeljno sa jednog uređaja. Gotov plan možeš da otvaraš, deliš i da menjaš stanice koliko želiš.',
  },
  {
    question: 'Da li planer izmišlja mesta?',
    answer:
      'Ne. Plan sme da sadrži samo mesta iz naše baze. Ako AI pomoćnik predloži bilo šta drugo, taj predlog odbacujemo, a plan sastavljamo po pravilima, bez AI asistenta.',
  },
  {
    question: 'Šta se dešava sa imenom mog psa?',
    answer: 'Ime ostaje u tvom pregledaču i nikad se ne šalje našem serveru. Upisuje se u plan tek na tvom ekranu.',
  },
  {
    question: 'Odakle je prognoza?',
    answer: 'Prognozu uzimamo od Norveškog meteorološkog instituta (MET Norway).',
  },
  {
    question: 'Da li plan zamenjuje savet veterinara?',
    answer: 'Ne. Planer ne daje veterinarske savete; za zdravlje psa obrati se veterinaru.',
  },
];

/** The message for a refused plan request (429). */
export function limitMessage(reason: LimitReason, nextAt: string | null): string {
  const date = formatLimitDate(nextAt);
  switch (reason) {
    case 'device':
      return date
        ? `Ove nedelje su sa ovog uređaja iskorišćena sva 3 plana. Sledeći plan možeš da napraviš ${date}`
        : 'Ove nedelje su sa ovog uređaja iskorišćena sva 3 plana.';
    case 'network':
      return date
        ? `Sa ove mreže je ove nedelje napravljeno mnogo planova, pokušaj ponovo ${date}`
        : 'Sa ove mreže je ove nedelje napravljeno mnogo planova, pokušaj ponovo za nekoliko dana.';
    case 'cooldown':
      return 'Malo sporije: sačekaj nekoliko sekundi, pa pokušaj ponovo.';
  }
}

export const FAILURE_MESSAGES = {
  captcha: 'Provera da nisi robot nije uspela. Pokušaj ponovo.',
  invalid: 'Proveri polja forme i pokušaj ponovo.',
  unavailable: 'Planer trenutno ne može da napravi plan. Pokušaj ponovo za koji minut.',
  not_found: 'Ovaj plan ne postoji ili je obrisan.',
  siteKey: 'Planer trenutno nije dostupan.',
} as const;

/**
 * Ready-made plans offered when the weekly limit is reached: saved plans
 * picked by the editor. Empty until there are some; the list is then hidden.
 */
export const READY_PLANS: readonly { label: string; planId: string }[] = [];
