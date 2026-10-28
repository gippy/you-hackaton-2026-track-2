// The sky over the Loft: sunset, civil dusk, full dark and moonrise, and the moon's phase.
//
// suncalc computes everything offline. When the network is up, wttr.in's astronomy data (keyless)
// replaces the times it also has, sunset and moonrise, because suncalc's moonrise can be ten
// minutes off. Each event says which source its time came from.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import SunCalc from 'suncalc';

import type { Sky, SkyEvent } from '../shared/protocol.ts';

const LOFT = { lat: 37.7904, lon: -122.3993, place: 'AWS Builder Loft, San Francisco' };
const WTTR_URL = 'https://wttr.in/San+Francisco?format=j1';
const TZ = 'America/Los_Angeles';

/** "18:15" for a Date, in the Loft's time zone. */
function hhmm(date: Date): string {
    return date.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Today's date in the Loft's time zone, as YYYY-MM-DD. */
function today(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** The UTC offset of the Loft's time zone on a day, like "-07:00". */
function offset(day: string): string {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' })
        .formatToParts(new Date(`${day}T12:00:00Z`))
        .find((p) => p.type === 'timeZoneName')!.value; // "GMT-7"
    const hours = Number(name.replace('GMT', '') || 0);
    return `${hours < 0 ? '-' : '+'}${String(Math.abs(hours)).padStart(2, '0')}:00`;
}

/** An ISO time for "HH:MM" on a day in the Loft's time zone. */
function at(day: string, time: string): string {
    return new Date(`${day}T${time}:00${offset(day)}`).toISOString();
}

function phaseName(phase: number): string {
    const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    return names[Math.round(phase * 8) % 8];
}

interface WttrAstronomy {
    sunset: string;
    moonrise: string;
    moon_phase: string;
    moon_illumination: number;
}

/** wttr.in's astronomy for a day, fetched once per day and cached in out/sky/. Null when it cannot be reached. */
async function fetchWttr(day: string, outDir: string): Promise<WttrAstronomy | null> {
    const cache = join(outDir, 'sky', `${day}.json`);
    if (existsSync(cache)) return JSON.parse(readFileSync(cache, 'utf8'));
    try {
        const res = await fetch(WTTR_URL, { signal: AbortSignal.timeout(8000) });
        const weather = ((await res.json()) as any).weather?.find((w: any) => w.date === day);
        const astro = weather?.astronomy?.[0];
        if (!astro) return null;
        // "6:15 PM" to "18:15"
        const to24 = (t: string) => {
            const [, h, m, ap] = t.match(/(\d+):(\d+)\s*(AM|PM)/i) ?? [];
            return h ? `${String((Number(h) % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${m}` : '';
        };
        const value = { sunset: to24(astro.sunset), moonrise: to24(astro.moonrise), moon_phase: astro.moon_phase, moon_illumination: Number(astro.moon_illumination) };
        mkdirSync(join(outDir, 'sky'), { recursive: true });
        writeFileSync(cache, JSON.stringify(value, null, 2));
        return value;
    } catch {
        return null;
    }
}

/** Today's sky. `clock` is a scenario step's "HH:MM", or empty for live time. */
export async function skyFor(clock: string, outDir: string): Promise<Sky> {
    const day = today();
    const noon = new Date(at(day, '12:00'));
    const sun = SunCalc.getTimes(noon, LOFT.lat, LOFT.lon);
    const moon = SunCalc.getMoonTimes(new Date(at(day, '00:00')), LOFT.lat, LOFT.lon);
    const wttr = await fetchWttr(day, outDir);
    // An event at wttr.in's time when it has one, else at suncalc's.
    const event = (id: SkyEvent['id'], label: string, computed: Date | undefined, wttrTime?: string): SkyEvent => {
        const local = wttrTime || (computed ? hhmm(computed) : '');
        return { id, label, local, at: local ? at(day, local) : '', source: wttrTime ? 'wttr.in' : 'suncalc', computed: computed ? hhmm(computed) : '' };
    };
    const events = [
        event('sunset', 'Sunset', sun.sunset, wttr?.sunset),
        event('civil_dusk', 'Civil dusk', sun.dusk),
        event('full_dark', 'Full dark', sun.night),
        event('moonrise', 'Moonrise', moon.rise, wttr?.moonrise),
    ];
    const illumination = SunCalc.getMoonIllumination(moon.rise ?? noon);
    const reference = clock ? new Date(at(day, clock)) : new Date();
    return {
        day,
        place: LOFT.place,
        clock,
        clock_at: clock ? at(day, clock) : '',
        events,
        minutes_to: Object.fromEntries(events.filter((e) => e.at).map((e) => [e.id, Math.round((Date.parse(e.at) - reference.getTime()) / 60000)])),
        moon: {
            phase: wttr?.moon_phase || phaseName(illumination.phase),
            illumination: wttr?.moon_illumination ?? Math.round(illumination.fraction * 100),
            source: wttr ? 'wttr.in' : 'suncalc',
        },
        live_source: wttr ? { url: WTTR_URL, summary: `Sunset ${wttr.sunset}, moonrise ${wttr.moonrise}, ${wttr.moon_phase}, ${wttr.moon_illumination}% lit` } : null,
    };
}
