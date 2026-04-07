import { useCallback, useRef } from 'react';

/**
 * Custom hook that returns a debounced version of the provided function.
 * The debounced function will only be called after the specified delay
 * has passed since the last time it was invoked.
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const funcRef = useRef(func);
  
  // Update the ref whenever func changes
  funcRef.current = func;

  const debouncedFunc = useCallback(
    function (...args: Parameters<T>) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        funcRef.current(...args);
      }, delay);
    },
    [delay] // Only delay is needed in dependencies since we use ref for func
  );

  return debouncedFunc as T;
}
