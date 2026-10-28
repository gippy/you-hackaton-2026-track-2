// The report's text with the intake's evidence quotes marked: threat evidence, the harmless explanation and the
// people at risk, each with the model's reason on hover or keyboard focus. The pipeline keeps only quotes that
// occur in the report (pipeline/library.py clean_quotes), so each one is found here as it is.
import { Fragment, useId } from 'react';

import type { EvidenceQuote } from '../../shared/protocol.ts';

const KINDS: Record<EvidenceQuote['kind'], string> = {
    threat: 'Threat evidence',
    harmless: 'Harmless explanation',
    people: 'People at risk',
};

/** The quotes in the order they appear in `text`, with their position. A quote not in the text, or overlapping an earlier one, is left out. */
function place(text: string, quotes: EvidenceQuote[]) {
    const found = quotes.map((q) => ({ ...q, at: text.indexOf(q.quote) })).filter((q) => q.at >= 0 && q.quote.length > 0);
    found.sort((a, b) => a.at - b.at);
    return found.filter((q, i) => i === 0 || q.at >= found[i - 1].at + found[i - 1].quote.length);
}

export function EvidenceText({ text, quotes }: { text: string; quotes: EvidenceQuote[] }) {
    const id = useId();
    const placed = place(text, quotes);
    let pos = 0;
    return (
        <>
            {placed.map((q, i) => {
                const before = text.slice(pos, q.at);
                pos = q.at + q.quote.length;
                return (
                    <Fragment key={i}>
                        {before}
                        <mark className={`evidence ev-${q.kind}`} tabIndex={0} aria-describedby={`${id}-${i}`}>
                            {q.quote}
                            <span className="ev-why" role="tooltip" id={`${id}-${i}`}>
                                {KINDS[q.kind]}: {q.why}
                            </span>
                        </mark>
                    </Fragment>
                );
            })}
            {text.slice(pos)}
        </>
    );
}

/** What each highlight color means, for the kinds the report shows. */
export function EvidenceLegend({ quotes }: { quotes: EvidenceQuote[] }) {
    const kinds = (Object.keys(KINDS) as EvidenceQuote['kind'][]).filter((k) => quotes.some((q) => q.kind === k));
    return (
        <p className="ev-legend small">
            <span className="muted">Evidence the model quoted:</span>
            {kinds.map((k) => (
                <span key={k} className={`evidence ev-${k}`}>
                    {KINDS[k]}
                </span>
            ))}
        </p>
    );
}
