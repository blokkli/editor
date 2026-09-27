import { inject, provide } from '#imports'
import type { ComputedRef, InjectionKey } from 'vue'
import type { OfficeContactFragment } from '#graphql-operations'

type PageOffice = ComputedRef<OfficeContactFragment | null | undefined>

// A fragment gets no props, so the detail page provides its office to the
// contact fragment in its sidebar.
const PAGE_OFFICE: InjectionKey<PageOffice> = Symbol('pageOffice')

/**
 * Provides the detail page's responsible office.
 */
export function providePageOffice(office: PageOffice) {
  provide(PAGE_OFFICE, office)
}

/**
 * The responsible office of the detail page around, if any.
 */
export function usePageOffice() {
  return inject(PAGE_OFFICE, null)
}
