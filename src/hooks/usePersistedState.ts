import { useState, useEffect, useRef } from 'react';

type Serializer<T> = {
  read: (raw: string) => T;
  write: (value: T) => string;
};

const jsonSerializer = <T>(): Serializer<T> => ({
  read: (raw) => JSON.parse(raw) as T,
  write: (value) => JSON.stringify(value),
});

export function usePersistedState<T>(
  key: string,
  initial: T | (() => T),
  serializer?: Serializer<T>,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const ser = useRef(serializer ?? jsonSerializer<T>()).current;

  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) {
        return typeof initial === 'function' ? (initial as () => T)() : initial;
      }
      return ser.read(saved);
    } catch {
      return typeof initial === 'function' ? (initial as () => T)() : initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, ser.write(state));
    } catch (e) {
      console.error(`Failed to persist ${key}`, e);
    }
  }, [key, state, ser]);

  return [state, setState];
}

export const stringSerializer: Serializer<string> = {
  read: (raw) => raw,
  write: (value) => value,
};

export const numberSerializer: Serializer<number> = {
  read: (raw) => parseFloat(raw),
  write: (value) => String(value),
};

export const booleanSerializer: Serializer<boolean> = {
  read: (raw) => raw === 'true',
  write: (value) => String(value),
};
