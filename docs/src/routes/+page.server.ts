import { dev } from '$app/environment'
import { createPackageStatsLoad } from '@humanspeak/docs-kit/server'
import rootPkg from '../../../package.json'

export const prerender = false

export const load = createPackageStatsLoad({
    pkg: rootPkg,
    dev,
    devFallback: { tarballBytes: 18000, unpackedBytes: 62000 }
})
