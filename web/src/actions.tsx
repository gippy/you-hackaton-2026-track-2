// The model's quick actions under the incident directive: one-click operator moves. Each button runs a move the
// operator can also make by hand (seal a sector, pick a countermeasure, mark people out, call an expert), so the
// next step's station builds on it. A move already in effect shows as done.
import type { Expert, QuickAction } from '../../shared/protocol.ts';
import { squares, type Ctx } from './components.tsx';

/** Whether the move is already in effect, and the move itself. */
function move(a: QuickAction, ctx: Ctx): { done: boolean; run: () => void } {
    const { operator, send, quick } = ctx;
    switch (a.kind) {
        case 'seal':
        case 'unseal':
            return { done: operator.sealed.includes(a.target) === (a.kind === 'seal'), run: () => send({ type: 'toggle-seal', sector: a.target }) };
        case 'countermeasure':
            return { done: operator.countermeasure === a.target, run: () => send({ type: 'countermeasure', id: a.target }) };
        case 'extract': {
            const { total } = squares(quick.people ?? 0, []);
            const indexes = Array.from({ length: a.target === 'half' ? Math.ceil(total / 2) : total }, (_, i) => i);
            return { done: indexes.every((i) => operator.extracted.includes(i)), run: () => send({ type: 'extract', indexes }) };
        }
        case 'call_expert':
            return { done: quick.paged(a.target as Expert), run: () => quick.call(a.target as Expert) };
    }
}

export function QuickActions({ ctx }: { ctx: Ctx }) {
    if (!ctx.quick.actions.length) return null;
    return (
        <div className="quick" role="group" aria-labelledby="quick-label">
            <span id="quick-label" className="quick-label">
                Quick moves
            </span>
            {ctx.quick.actions.map((a) => {
                const { done, run } = move(a, ctx);
                return (
                    <button key={`${a.kind}-${a.target}`} type="button" className={`ghost ${done ? 'done' : ''}`} aria-disabled={done} onClick={() => !done && run()}>
                        {done && <span aria-hidden="true">✓ </span>}
                        {a.label}
                        {done && <span className="sr-only"> (done)</span>}
                    </button>
                );
            })}
        </div>
    );
}
