// The sky the server hands the pipeline for each scenario step, computed with the server's own code
// (server/sky.ts), so the eval feeds the worker exactly what a live run does. Read-only on the repo:
// the wttr.in cache goes to the directory given as the second argument.
//
//     node eval/sky.ts <scenario.json> <cache dir>
import { readFileSync } from 'node:fs';

import { skyFor, today } from '../server/sky.ts';

const [scenario, outDir] = process.argv.slice(2);
const ticks: { incident_id: string; time: string }[] = JSON.parse(readFileSync(scenario, 'utf8')).ticks;
const day = today();
const out: Record<string, unknown> = {};
for (const tick of ticks) out[tick.incident_id] = await skyFor(day, tick.time, outDir, false);
console.log(JSON.stringify(out));
