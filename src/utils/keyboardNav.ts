/**
 * Keyboard navigation utilities for accessibility
 */

/**
 * Setup keyboard navigation for button groups
 * Implements arrow key navigation between buttons
 */
export function setupKeyboardNavigation(
  containerSelector: string,
  buttonSelector: string
): () => void {
  const container = document.querySelector(containerSelector);
  if (!container) return () => {};

  const handleKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    
    const buttons = Array.from(container.querySelectorAll(buttonSelector)) as HTMLButtonElement[];
    const currentIndex = buttons.findIndex(btn => btn === document.activeElement);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        nextIndex = (currentIndex + 1) % buttons.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = buttons.length - 1;
        break;
      default:
        return;
    }

    buttons[nextIndex]?.focus();
  };

  container.addEventListener('keydown', handleKeyDown);

  // Cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Make element keyboard accessible by adding tabindex if needed
 */
export function makeKeyboardAccessible(element: HTMLElement): void {
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }
}

/**
 * Setup Enter/Space key activation for custom interactive elements
 */
export function setupKeyActivation(
  element: HTMLElement,
  callback: () => void
): () => void {
  const handleKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      callback();
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Trap focus within a container (useful for modals)
 */
export function trapFocus(containerElement: HTMLElement): () => void {
  const focusableElements = containerElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleKeyDown = (event: Event) => {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  containerElement.addEventListener('keydown', handleKeyDown);

  return () => {
    containerElement.removeEventListener('keydown', handleKeyDown);
  };
}
