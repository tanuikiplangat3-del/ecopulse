// Publisher sign-up links a buyer generates for themselves.
//
// These constants live here, NOT in app/actions/publisher-invites.ts. A file
// marked "use server" may only export async functions - exporting a plain
// const from one fails the Docker build outright with
// "Only async functions are allowed to be exported in a 'use server' file",
// which is a whole deploy cycle lost to a one-line mistake.

/** How long a link stays usable. */
export const INVITE_DAYS = 30;

/**
 * How many unused links one buyer may have outstanding.
 *
 * There is no admin approval on this path, so something has to stop one account
 * generating hundreds. Used links do not count, so a buyer genuinely bringing
 * publishers in is never blocked; only unused ones piling up are.
 */
export const MAX_OPEN_INVITES = 10;

/**
 * How many links one buyer may ever create, used or not.
 *
 * The open-link cap alone is no limit at all: an attacker only needs one link
 * to accept. This is the ceiling that actually bounds how many publisher
 * accounts a single buyer can put their own name against.
 */
export const MAX_TOTAL_INVITES = 25;
