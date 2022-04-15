import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import React, { useEffect, useRef } from 'react';
import { javascript } from '@codemirror/lang-javascript';
import type { ViewUpdate } from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/history';
import { defaultKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/matchbrackets';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/closebrackets';
import { commentKeymap } from '@codemirror/comment';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { lintKeymap } from '@codemirror/lint';

import { EditorState, EditorView, keymap, useCodeMirror } from '@uiw/react-codemirror';
import { completeFromGlobalScope } from '@/components/CodeEditor/autocomplete';
import { useUnmountEffect } from 'src/hooks';
import { useCodeEditorStore } from 'src/stores/code-editor';
import { useDebouncedCallback } from 'use-debounce';

// todo: validate on change
interface EditorProps {
  className?: string;
  value?: string;
  theme?: 'light' | 'dark';
  autocomplete?: boolean;
  editable?: boolean;
  placeholder?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  debounceInterval?: number;
  onInit?: (view: EditorView, state: EditorState) => void;
  onChange?: (value: string, update: ViewUpdate) => void;
  style?: React.CSSProperties;
}

export const FilterEditor = ({
  value = '',
  autocomplete = true,
  theme,
  onChange = undefined,
  debounceInterval = 300,
  onInit,
  editable,
  className,
  placeholder,
  height = '36px',
  minHeight,
  maxHeight,
  width = '100%',
  minWidth,
  maxWidth,
  style
}: EditorProps) => {
  const editor = useRef<HTMLDivElement>(null);
  const extensions = [
    history(),
//  drawSelection(),
    defaultHighlightStyle.fallback,
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...commentKeymap,
      ...completionKeymap,
      ...lintKeymap
    ]),
    javascript()
  ];

  const themeToUse = theme || useCodeEditorStore((store) => store.theme) || 'light';

  if (autocomplete && editable === true) {
    extensions.push(autocompletion({ override: [completeFromGlobalScope] }));
  }

  const debouncedChange = useDebouncedCallback((value: string, update: ViewUpdate) => {
    if (onChange) {
      onChange(value, update);
    }
  }, debounceInterval);

  const { setContainer, view, state } = useCodeMirror({
    basicSetup: false,
    container: editor.current,
    extensions,
    theme: themeToUse,
    value,
    editable,
    onChange: debouncedChange,
    placeholder,
    height,
    minHeight,
    maxHeight,
    width,
    minWidth,
    maxWidth,
  });

  useUnmountEffect(() => {
    if (view) {
      view.destroy();
    }
  }, []);

  useEffect(() => {
    if (editor.current) {
      setContainer(editor.current);
    }
  }, [editor.current]);

  useEffect(() => {
    if (view && state && onInit) {
      onInit(view, state);
    }
  }, [state, view]);

  return <div ref={editor} className={className} style={style} />;
};

export default FilterEditor;
