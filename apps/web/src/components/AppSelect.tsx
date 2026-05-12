import { useEffect, useMemo, useRef, useState } from 'react';

import { DropdownLayout, getDropdownLayout } from '../lib/dropdown';

export type SelectOption = {
  value: string;
  label: string;
};

type AppSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  tone?: 'light' | 'dark';
  size?: 'default' | 'compact';
  ariaLabel?: string;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function AppSelect(props: AppSelectProps) {
  const {
    value,
    options,
    onChange,
    placeholder = '请选择',
    disabled = false,
    tone = 'light',
    size = 'default',
    ariaLabel,
  } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState<DropdownLayout>({
    direction: 'down' as const,
    maxHeight: 260,
  });

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value],
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [value]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function updateMenuLayout() {
      setMenuLayout(getDropdownLayout(rootRef.current, triggerRef.current, 260, 8));
    }

    const frameId = window.requestAnimationFrame(updateMenuLayout);

    window.addEventListener('resize', updateMenuLayout);
    document.addEventListener('scroll', updateMenuLayout, true);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateMenuLayout);
      document.removeEventListener('scroll', updateMenuLayout, true);
    };
  }, [open, options.length]);

  function handleSelect(nextValue: string) {
    setOpen(false);
    onChange(nextValue);
  }

  return (
    <div
      ref={rootRef}
      className={joinClassNames(
        'app-select',
        `app-select--${tone}`,
        `app-select--${size}`,
        open && 'is-open',
        disabled && 'is-disabled',
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        className="app-select__trigger"
        onClick={() => !disabled && setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span
          className={joinClassNames(
            'app-select__value',
            !selectedOption && 'app-select__value--placeholder',
          )}
        >
          {selectedOption?.label || placeholder}
        </span>
        <span className="app-select__chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="app-select__menu"
          role="listbox"
          aria-label={ariaLabel}
          style={{
            maxHeight: `${Math.max(menuLayout.maxHeight, 0)}px`,
            top: menuLayout.direction === 'down' ? 'calc(100% + 8px)' : 'auto',
            bottom: menuLayout.direction === 'up' ? 'calc(100% + 8px)' : 'auto',
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={joinClassNames(
                  'app-select__option',
                  isSelected && 'is-selected',
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(option.value);
                }}
                onClick={() => handleSelect(option.value)}
              >
                <span>{option.label}</span>
                <span className="app-select__check" aria-hidden="true">
                  {isSelected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
