import { environment } from '../../../../env/env.dev';

/**
 * Serve the catalog from in-memory mock data instead of the dog-food/* and
 * pet-shops/* endpoints.
 *
 * The flag lives in `src/env/env.*.ts` (`useCatalogMocks: true`). Those files
 * are gitignored, so it is read as optional here: an environment file that
 * does not mention it talks to the real API, which is the safe default for
 * every deployed build.
 */
export const USE_CATALOG_MOCKS: boolean =
  (environment as { useCatalogMocks?: boolean }).useCatalogMocks === true;
