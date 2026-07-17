import { docsConfig } from '$lib/docs-config'
import { fetchOtherProjects } from '@humanspeak/docs-kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async () => ({
    otherProjects: await fetchOtherProjects(docsConfig.slug)
})
