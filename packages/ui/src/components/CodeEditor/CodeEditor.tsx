import { EditorView, placeholder, ViewUpdate } from '@codemirror/view';
import React, { ComponentProps, useCallback, useEffect, useState } from 'react';
import {
  EditorState,
  Extension,
} from '@codemirror/state';
import { useMemo } from 'react';
import CodeMirror from 'rodemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { bracketMatching } from '@codemirror/matchbrackets';
import { closeBrackets } from '@codemirror/closebrackets';
import { basicSetup } from '@codemirror/basic-setup';
import { oneDark } from '@codemirror/theme-one-dark';
import { useCodeEditorStore } from '@/stores/code-editor';
import { dimensionToString } from '@/components/utils';
import { defaultLightThemeOption } from './theme/light';

export type EditorLanguage = 'javascript' | 'json';

type TProps = {
  language?: EditorLanguage;
  value?: string;
  onChange?: (value: string) => void;
  autofocus?: boolean;
  height?: string | number;
  width?: string | number;
  maxHeight?: string | number;
  maxWidth?: string | number;
  minHeight?: string | number;
  minWidth?: string | number;
  /**
   * Whether to optional basicSetup by default
   * @default true
   */
  basicSetup?: boolean;
  /** Enables a placeholder—a piece of example content to show when the editor is empty. */
  placeholder?: string | HTMLElement;
  /**
   * `light` / `dark` / `Extension` Defaults to `light`.
   * @default light
   */
  theme?: 'light' | 'dark' | Extension;
  readOnly?: boolean;
  className?: string;
  isSingleLine?: boolean;
};

const CodeEditor = (props: TProps) => {
  const {
    language = 'javascript',
    value,
    onChange,
    placeholder: placeholderStr = '',
    autofocus = false,
    readOnly = false,
    className,
    basicSetup: defaultBasicSetup = true,
    isSingleLine,
  } = props;
  const [extensions, setExtensions] = useState<Extension[]>();
  const [view, setView] = useState<EditorView>();
  const height = dimensionToString(props.height) ?? null;
  const width = dimensionToString(props.width) ?? null;
  const maxHeight = dimensionToString(props.maxHeight) ?? null;
  const maxWidth = dimensionToString(props.maxWidth) ?? null;
  const minHeight = dimensionToString(props.minHeight) ?? null;
  const minWidth = dimensionToString(props.minWidth) ?? null;
  const [elementProps, setElementProps] = useState<ComponentProps<'div'>>();

  const theme = useCodeEditorStore((state) => state.theme ?? 'light');

  const defaultThemeOption = EditorView.theme({
    '&': {
      height,
      minHeight,
      maxHeight,
      width,
      minWidth,
      maxWidth,
    },
  });

  const defaultValue = useMemo(() => {
    return (language === 'javascript' ? '' : '{}');
  },[language]);

  const [writeValue, setWriteValue] = useState(defaultValue);
  const [readValue, setReadValue] = useState(writeValue);

  const handleChange = useCallback(
    (v: ViewUpdate) => {
    if (v.docChanged) {
      const value = v.state.doc.toString();
      onChange?.(value);
      setReadValue(value);
    }
  },
    [props.onChange],
  );


  useEffect(() => {
    setWriteValue(value ?? defaultValue);
  }, [value]);

  function getExtensions(): Extension[] {
    const result: Extension[] = [defaultThemeOption];
    if (!defaultBasicSetup) {
      result.push(bracketMatching(), closeBrackets());
    } else {
      result.unshift(basicSetup);
    }

    if (placeholderStr) {
      result.unshift(placeholder(placeholderStr));
    }

    switch (theme) {
      case 'light':
        result.push(defaultLightThemeOption);
        break;
      case 'dark':
        result.push(oneDark);
        break;
      default:
        result.push(theme);
        break;
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
    if (readOnly) {
      result.push(EditorView.editable.of(false));
    }

    return result;
  }

  useEffect(() => {
    setExtensions(getExtensions());
  }, [language, placeholderStr, theme, defaultBasicSetup, readOnly]);

  useEffect(() => {
    if (autofocus && view) {
      view.focus();
    }
  }, [autofocus, view]);

  useEffect(() => {
    setElementProps({ className });
  }, [className]);

  return (
    <CodeMirror
      value={writeValue}
      extensions={extensions}
      onEditorViewChange={setView}
      elementProps={elementProps}
      onUpdate={handleChange}
    />
  );
};
export default CodeEditor;
