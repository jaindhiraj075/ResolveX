import { Transition, Variants } from 'motion/react';

// Fast, premium easing curves (similar to Linear / Apple OS curves)
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeSmooth = [0.22, 1, 0.36, 1] as const;

// Transition presets
export const fastTransition: Transition = {
  duration: 0.2,
  ease: easeSmooth,
};

export const defaultTransition: Transition = {
  duration: 0.26,
  ease: easeSmooth,
};

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
};

// Route-level page transitions (Subtle exit up, enter up-to-resting)
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: easeSmooth,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Staggered dashboard / card containers
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: easeSmooth,
    },
  },
};

// Modal transitions (Backdrop & Dialog)
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const modalDialogVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 8,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: easeSmooth,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Dropdown menu transitions
export const dropdownVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: -4,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: easeSmooth,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: {
      duration: 0.14,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Toast notification transitions
export const toastVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.96,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.22,
      ease: easeSmooth,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.96,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Reduced motion fallback variants (pure opacity, zero spatial displacement)
export const reducedPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};
