import React, { useCallback, useEffect, useState } from 'react';
import CodeMirror, { EditorState, Extension } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { bracketMatching } from '@codemirror/matchbrackets';
import { closeBrackets } from '@codemirror/closebrackets';
import { useCodeEditorStore } from '@/stores/code-editor';
import { dimensionToString } from '@/components/utils';

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
  const [code, setCode] = useState('');
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

  useEffect(() => {
    if (value) {
      setCode(value);
    }
  }, [value]);

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
        // https://discuss.codemirror.net/t/codemirror-6-single-line-and-or-avoid-carriage-return/2979
        result.push(EditorState.transactionFilter.of(tr => tr.newDoc.lines > 1 ? [] : tr));
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
    />
  );
};
export default CodeEditor;
