/**
 * Health domain: probes every service the site depends on, for the admin
 * Health page. The public uptime probe stays `/api/health`.
 */
export { checkSiteServices, type SiteHealthDeps } from "./checks";
