import React, { useEffect, useRef } from 'react';
import { useTheme2 } from '@grafana/ui';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, StateField, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { acceptCompletion } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';
import { Decoration, DecorationSet } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { mplHighlighter, createMplCompletion, mplLinter, mplSignatureHelp, mplHover } from '@axiomhq/mpl-codemirror';
import '@axiomhq/mpl-codemirror/styles/tokens.css';
import { ensureMplInit } from '../mpl/ensureMplInit';
import { DataSource } from '../datasource';

const PREAMBLE = 'param $__interval: duration; // auto-set by Grafana based on time range\nparam $__rate_interval: duration; // 4x $__interval, suitable for rate() windows\n';
const PREAMBLE_LINES = 2;

function preambleLength(state: EditorState): number {
  if (PREAMBLE_LINES <= 0) {
    return 0;
  }
  const line = state.doc.line(Math.min(PREAMBLE_LINES + 1, state.doc.lines));
  return line.from;
}

// Reject any change that touches the preamble region
const readOnlyPreamble = EditorState.changeFilter.of((tr) => {
  const prefixEnd = preambleLength(tr.startState);
  let dominated = false;
  tr.changes.iterChangedRanges((fromA, toA) => {
    if (fromA < prefixEnd) {
      dominated = true;
    }
  });
  return !dominated;
});

// Prevent cursor from entering the preamble
const cursorGuard = EditorState.transactionFilter.of((tr) => {
  const prefixEnd = preambleLength(tr.newDoc.lines >= PREAMBLE_LINES ? tr.state : tr.startState);
  const sel = tr.newSelection?.main;
  if (sel && sel.from < prefixEnd) {
    return [tr, { selection: { anchor: prefixEnd } }];
  }
  return tr;
});

// Style preamble lines as dimmed / read-only
const preambleLineDeco = Decoration.line({ attributes: { style: 'cursor: not-allowed;' } });
const preambleLastLineDeco = Decoration.line({ attributes: { style: 'cursor: not-allowed; border-bottom: 1px solid rgba(128,128,128,0.3); padding-bottom: 4px; margin-bottom: 4px;' } });

const preambleDecorationField = StateField.define<DecorationSet>({
  create(state) {
    return buildPreambleDecorations(state);
  },
  update(decos, tr) {
    if (tr.docChanged) {
      return buildPreambleDecorations(tr.state);
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function buildPreambleDecorations(state: EditorState): DecorationSet {
  const decorations = [];
  const n = Math.min(PREAMBLE_LINES, state.doc.lines);
  for (let i = 1; i <= n; i++) {
    const line = state.doc.line(i);
    decorations.push((i === n ? preambleLastLineDeco : preambleLineDeco).range(line.from));
  }
  return Decoration.set(decorations);
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onRunQuery?: () => void;
  datasource: DataSource;
  preamble?: string;
}

export function MplQueryCodeMirror({ value, onChange, onBlur, onRunQuery, datasource }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const onRunQueryRef = useRef(onRunQuery);
  const valueRef = useRef(value);
  const datasourceRef = useRef(datasource);
  const theme = useTheme2();

  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;
  onRunQueryRef.current = onRunQuery;
  valueRef.current = value;
  datasourceRef.current = datasource;

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    let view: EditorView | null = null;
    let cancelled = false;

    ensureMplInit().then(() => {
      if (cancelled || !containerRef.current) {
        return;
      }

      const completionExt = createMplCompletion({
        datasets: () => datasourceRef.current.getDatasets(),
        metrics: (dataset: string) => datasourceRef.current.getMetrics(dataset),
        tags: (dataset: string, metric: string) => datasourceRef.current.getTags(dataset, metric),
      });

      const extensions = [
        basicSetup,
        Prec.highest(keymap.of([
          { key: 'Tab', run: acceptCompletion },
          indentWithTab,
          { key: 'Mod-Enter', run: () => { onRunQueryRef.current?.(); return true; } },
        ])),
        EditorView.lineWrapping,
        mplHighlighter,
        completionExt,
        mplLinter,
        mplSignatureHelp,
        mplHover,
        readOnlyPreamble,
        cursorGuard,
        preambleDecorationField,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // Only emit the user-editable portion (after preamble)
            const full = update.state.doc.toString();
            const prefixEnd = preambleLength(update.state);
            onChangeRef.current(full.slice(prefixEnd));
          }
        }),
        EditorView.domEventHandlers({
          blur: () => {
            onBlurRef.current?.();
            return false;
          },
        }),
      ];

      if (theme.isDark) {
        extensions.push(oneDark);
      }

      // Prepend the preamble to the user's query
      const doc = PREAMBLE + valueRef.current;

      view = new EditorView({
        state: EditorState.create({
          doc,
          extensions,
        }),
        parent: containerRef.current,
      });
      viewRef.current = view;
    });

    return () => {
      cancelled = true;
      if (view) {
        view.destroy();
        viewRef.current = null;
      }
    };
    // Re-create the editor when theme changes to apply dark/light mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme.isDark]);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const prefixEnd = preambleLength(view.state);
    const currentUserContent = view.state.doc.toString().slice(prefixEnd);
    if (value !== currentUserContent) {
      view.dispatch({
        changes: { from: prefixEnd, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div ref={containerRef} className={theme.isDark ? 'dark-theme' : undefined} style={{ minHeight: 200 }} />
  );
}
