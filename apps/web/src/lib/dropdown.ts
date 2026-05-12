export type DropdownLayout = {
  direction: 'down' | 'up';
  maxHeight: number;
};

const DEFAULT_MAX_HEIGHT = 260;
const EDGE_PADDING = 12;

export function getDropdownLayout(
  rootElement: HTMLElement | null,
  triggerElement: HTMLElement | null,
  preferredMaxHeight = DEFAULT_MAX_HEIGHT,
  gap = 8,
): DropdownLayout {
  if (
    !rootElement ||
    !triggerElement ||
    typeof window === 'undefined' ||
    typeof document === 'undefined'
  ) {
    return {
      direction: 'down',
      maxHeight: preferredMaxHeight,
    };
  }

  const triggerRect = triggerElement.getBoundingClientRect();
  const boundaryElement = rootElement.closest('.pm-modal__panel') as HTMLElement | null;
  const boundaryRect = boundaryElement?.getBoundingClientRect();

  const boundaryBottom = boundaryRect
    ? boundaryRect.bottom - EDGE_PADDING
    : window.innerHeight - EDGE_PADDING;
  const boundaryTop = boundaryRect
    ? boundaryRect.top + EDGE_PADDING
    : EDGE_PADDING;

  const spaceBelow = boundaryBottom - triggerRect.bottom - gap;
  const spaceAbove = triggerRect.top - boundaryTop - gap;
  const availableBelow = Math.max(spaceBelow, 0);
  const availableAbove = Math.max(spaceAbove, 0);
  const direction =
    availableBelow >= availableAbove || availableBelow >= preferredMaxHeight
      ? 'down'
      : 'up';
  const maxHeight = Math.min(
    preferredMaxHeight,
    direction === 'down' ? availableBelow : availableAbove,
  );

  return {
    direction,
    maxHeight,
  };
}
