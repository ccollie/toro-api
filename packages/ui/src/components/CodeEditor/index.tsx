import React, { useCallback, useEffect, useState } from 'react';
import CodeMirror, {
  EditorState,
  EditorView,
  Extension,
  ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { bracketMatching } from '@codemirror/matchbrackets';
import { closeBrackets } from '@codemirror/closebrackets';
import { useCodeEditorStore } from '@/stores/code-editor';
import { dimensionToString } from '@/components/utils';
import { useUpdateEffect } from 'src/hooks';

export type EditorLanguage = 'javascript' | 'json';

type TProps = {
  language?: EditorLanguage;
  value?: string;
  onChange?: (value: string) => void;
  autofocus?: boolean;
  height?: string | number;
  width?: string | number;
  basicSetup?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  isSingleLine?: boolean;
};

const CodeEditor = (props: TProps) => {
  const {
    language = 'javascript',
    value,
    onChange,
    placeholder,
    autofocus = false,
    readOnly = false,
    className,
    basicSetup = true,
    isSingleLine,
  } = props;
  const [code, setCode] = useState(valueOrDefault(value));
  const [editorRef, setEditorRef] = useState<ReactCodeMirrorRef | null>();
  const [view, setView] = useState<EditorView>();
  const [extensions, setExtensions] = useState<Extension[]>();
  const height = dimensionToString(props.height);
  const width = dimensionToString(props.width);

  const theme = useCodeEditorStore((state) => state.theme);

  const handleChange = useCallback(
    (value: string) => {
      if (onChange) {
        // todo: additional validation (e.g. ajv.validate)
        onChange(value);
      }
    },
    [props.onChange],
  );

  function valueOrDefault(value: string | undefined): string {
    return value ?? (language === 'javascript' ? '' : '{}');
  }

  useUpdateEffect(() => {
    if (editorRef?.view) {
      const view = editorRef.view;
      const currentValue = view.state.doc.toString();
      const val = valueOrDefault(value);
      if (val !== currentValue) {
        setTimeout(() => {
          view.dispatch({
            changes: { from: 0, to: currentValue.length, insert: val },
          });
        }, 0);

      }
    }
  }, [value, editorRef]);

  function getExtensions(): Extension[] {
    const result: Extension[] = [];
    if (!basicSetup) {
      result.push(bracketMatching(), closeBrackets());
    }
    if (language === 'json') {
      result.push(json());
    } else if (language === 'javascript') {
      result.push(javascript());
      if (isSingleLine ?? true) {
        // eslint-disable-next-line max-len
        // https://discuss.codemirror.net/t/codemirror-6-single-line-and-or-avoid-carriage-return/2979
        result.push(
          EditorState.transactionFilter.of((tr) =>
            tr.newDoc.lines > 1 ? [] : tr,
          ),
        );
      }
    }
    return result;
  }

  useEffect(() => {
    setExtensions(getExtensions());
  }, [language]);

  return (
    <CodeMirror
      value={code}
      height={height}
      width={width}
      theme={theme}
      editable={!readOnly}
      basicSetup={basicSetup}
      extensions={extensions}
      autoFocus={autofocus}
      className={className}
      placeholder={placeholder}
      onChange={handleChange}
      ref={setEditorRef}
    />
  );
};
export default CodeEditor;
