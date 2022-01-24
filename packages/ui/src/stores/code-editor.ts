import { StorageConfig } from '@/config/storage';
import { ReactCodeMirrorProps } from '@uiw/react-codemirror';
import createStore from 'zustand';
import { persist } from 'zustand/middleware';

export type CodeEditorTheme = ReactCodeMirrorProps['theme'];

type TState = {
  theme: CodeEditorTheme;
  keyMap: string;
  tabSize: number;

  changeTabSize: (tabSize: number) => void;
  changeTheme: (theme: CodeEditorTheme) => void;
  changeKeyMap: (keyMap: string) => void;
};

export const useCodeEditorStore = createStore<TState>(
  persist(
    (set, _) => ({
      keyMap: 'default',
      theme: 'light',
      tabSize: 2,

      changeTabSize: (tabSize) => set({ tabSize }),
      changeKeyMap: (keyMap) => set({ keyMap }),
      changeTheme: (theme) => set({ theme }),
    }),
    {
      name: `${StorageConfig.persistNs}code-editor`,
    }
  )
);
