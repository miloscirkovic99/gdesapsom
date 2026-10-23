import { compareScenarios } from '../domain/compare';
import { defaultScenario, estimateScenario } from '../domain/costs';
import type { Lang } from '../domain/lang';
import { assessTrip } from '../domain/readiness';
import { PRICE_BOOK } from '../domain/rules/prices';
import { RULESET } from '../domain/rules/ruleset';
import type { TripPlan } from '../domain/trip.models';
import { buildInsightsRequest } from './insights-request';
import type { InsightsRequest } from './insights.models';

/** A Croatia car trip as the page would send it (in Serbian unless asked), for the AI specs. */
export function sampleInsightsRequest(lang: Lang = 'sr'): InsightsRequest {
  const today = '2026-10-23';
  const trip: TripPlan = {
    origin: 'RS',
    departureCity: 'Novi Sad',
    destination: 'HR',
    destinationCity: 'Split',
    transitCountries: [],
    departureDate: '2026-12-20',
    returnDate: '2026-12-27',
    transport: 'car',
    purpose: 'non-commercial',
    travelers: 2,
    dogs: [
      {
        id: 'dog-1',
        birthDate: '2022-03-01',
        microchip: 'iso',
        chipBeforeVaccination: 'yes',
        rabiesVaccinated: 'yes',
        rabiesVaccinationDate: '2026-05-10',
        rabiesValidUntil: '2027-05-10',
        rabiesPrimary: 'no',
        passport: 'yes',
        restrictedBreed: 'no',
        fciRegistered: 'unknown',
        weightKg: null,
      },
    ],
  };
  const report = assessTrip(trip, RULESET, today, lang);
  const scenarios = [
    {
      ...defaultScenario('A', 'Varijanta A', { destination: 'HR', transport: 'car', transitCountries: [], nights: 7 }),
      distanceKm: 650,
      tolls: 45,
      accommodationPerNight: 60,
      stayPetFee: 10,
    },
    {
      ...defaultScenario('B', 'Varijanta B', { destination: 'HR', transport: 'plane', transitCountries: [], nights: 7 }),
      ticketPricePerPerson: 220,
      petTransportCarrier: 'air-serbia' as const,
      accommodationPerNight: 60,
      stayPetFee: 10,
    },
  ];
  const shared = {
    currency: 'EUR' as const,
    rsdPerEur: 117.4822,
    contingencyPercent: 10,
    fuelConsumption: 6.5,
    fuelPrice: 1.6,
    emissionClass: null,
    vetPrep: {},
  };
  const breakdowns = scenarios.map((scenario) =>
    estimateScenario(scenario, shared, {
      travelers: 2,
      dogs: 1,
      dogWeightsKg: [null],
      departureDate: trip.departureDate,
      roundTrip: true,
      today,
      prepItems: report.prepItems,
      prices: PRICE_BOOK,
      lang,
    }),
  );
  return buildInsightsRequest({ trip, report, scenarios, breakdowns, comparison: compareScenarios(scenarios, breakdowns, lang), today, lang });
}

/** A reply that passes every check: open requirement ids, numbers taken from the request. */
export function goodOutput(request: InsightsRequest): Record<string, unknown> {
  const open = request.readiness.items.filter((item) => item.status !== 'confirmed');
  return {
    summary: 'Put je izvodljiv, ali pre polaska moraš da obaviš nekoliko koraka. Najvažniji je EU veterinarski sertifikat.',
    steps: open.slice(0, 2).map((item) => ({ requirementId: item.key, text: `Uradi: ${item.title}.` })),
    savings: [{ category: 'accommodation', text: 'Smeštaj je najveći trošak: uporedi više ponuda sa doplatom za psa.' }],
    comparison: 'Put kolima izlazi jeftinije od leta za iste noći.',
  };
}
