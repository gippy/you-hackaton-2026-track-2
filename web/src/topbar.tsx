// The sticky bar at the top of the page: the station's title, whether the run on screen is live or saved,
// the sound controls and the "Call expert" buttons.
import { useState } from 'react';

import type { ClientMessage } from '../../shared/protocol.ts';
import type { SoundBoard } from './audio.ts';
import { EXPERTS, callExpert, isOpen, pageFor, pageStatus } from './experts.tsx';
import type { State } from './station.ts';

export function TopBar({ state, subtitle, sound, post }: { state: State; subtitle: string; sound: SoundBoard; post: (msg: ClientMessage) => void }) {
    const { library, operator } = state;
    const [soundOn, setSoundOn] = useState(false);
    const [volume, setVolume] = useState(sound.volume);
    const sourceLabel = !state.connected ? 'disconnected' : state.source === 'snapshot' ? 'saved run' : state.source === 'live' ? 'live run' : state.mode ?? 'connecting';
    // The expert the code-mapped playbook points to is the primary button; a harmless report needs neither.
    const harmless = state.incident?.incident.verdict === 'harmless';
    const recommended = harmless || !library || !state.playbook ? null : EXPERTS.find((x) => library.experts[x].playbooks.includes(state.playbook!)) ?? null;
    const offline = state.mode === 'offline';

    const enableSound = (on: boolean) => {
        sound.setEnabled(on);
        setSoundOn(on);
    };

    return (
        <header className="topbar">
            <div className="brand">
                <span className="sigil" aria-hidden="true">
                    ☍
                </span>
                <div>
                    <h1>{state.title}</h1>
                    <div className="sub">{subtitle}</div>
                </div>
            </div>
            <div className="controls">
                <div className="group" aria-label="Station status">
                    <span className={`state ${state.source === 'snapshot' || offline ? 'snapshot' : state.connected ? 'live' : 'muted'}`}>{sourceLabel}</span>
                </div>
                <div className="group" aria-label="Sound">
                    <button type="button" className={`ghost ${soundOn ? 'on' : ''}`} aria-pressed={soundOn} onClick={() => enableSound(!soundOn)}>
                        Sound<span aria-hidden="true">{soundOn ? ' ◉' : ' ○'}</span>
                    </button>
                    <input
                        type="range"
                        className="volume"
                        aria-label="Volume"
                        aria-valuetext={`${Math.round(volume * 100)}%`}
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={(e) => {
                            sound.setVolume(Number(e.target.value));
                            setVolume(Number(e.target.value));
                        }}
                    />
                </div>
                <div className="group experts" role="group" aria-labelledby="experts-label">
                    <span id="experts-label" className="experts-label">
                        Call expert
                    </span>
                    {library &&
                        EXPERTS.map((expert) => {
                            const page = pageFor(state, expert);
                            const open = page && isOpen(page);
                            return (
                                <span key={expert} className="expert">
                                    <button
                                        type="button"
                                        className={expert === recommended ? '' : 'ghost'}
                                        aria-disabled={!state.manifest || offline || open}
                                        title={offline ? 'Offline: no expert can be paged' : `Pages ${library.experts[expert].label.toLowerCase()} on call through PagerDuty`}
                                        onClick={() => callExpert(state, expert, sound, post)}
                                    >
                                        {library.experts[expert].label}
                                    </button>
                                    {page && (
                                        <span className={`page-status page-${page.status}`} title={page.error}>
                                            {pageStatus(page)}
                                        </span>
                                    )}
                                    {open && page.id && (
                                        <button type="button" className="link" onClick={() => post({ type: 'resolve_page', key: page.key })}>
                                            Resolve
                                        </button>
                                    )}
                                </span>
                            );
                        })}
                    <Dispatch state={state} post={post} />
                    <span className="cm">
                        {offline
                            ? 'Offline: no expert can be paged'
                            : harmless
                              ? 'No expert needed'
                              : operator.countermeasure
                                ? (library?.arsenal[operator.countermeasure] ?? operator.countermeasure)
                                : 'No countermeasure picked'}
                    </span>
                </div>
            </div>
        </header>
    );
}

const DISPATCH_STATUS = { sending: 'Posting…', sent: 'Posted', off: 'Not posted: dispatch is off', failed: 'Post failed' } as const;

/** Posts the station on screen to the venue's #loft-incident channel; the server builds the message and limits it. */
function Dispatch({ state, post }: { state: State; post: (msg: ClientMessage) => void }) {
    const id = state.incident?.incident_id ?? '';
    const done = state.dispatches.find((d) => d.incident_id === id && d.status !== 'failed');
    const last = state.dispatches.find((d) => d.incident_id === id);
    const observe = state.manifest?.recommended_action === 'observe';
    const blocked = !state.manifest || state.mode === 'offline' || observe || Boolean(done);
    return (
        <span className="expert">
            <button
                type="button"
                className="ghost"
                aria-disabled={blocked}
                title={observe ? 'The station says observe: nothing to dispatch' : 'Posts this station to #loft-incident on the venue Discord'}
                onClick={() => !blocked && post({ type: 'dispatch' })}
            >
                Dispatch to #loft-incident
            </button>
            {last && (
                <span className={`page-status dispatch-${last.status}`} title={last.error ?? last.text}>
                    {DISPATCH_STATUS[last.status]}
                </span>
            )}
        </span>
    );
}
