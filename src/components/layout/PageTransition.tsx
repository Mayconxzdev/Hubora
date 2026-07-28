import { motion, useReducedMotion } from 'motion/react';
import { ReactNode } from 'react';

interface PageTransitionProps { children: ReactNode; }

export function PageTransition({ children }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      // A redução de movimento não deve deixar a página momentaneamente
      // translúcida. Além de ser mais confortável para quem pediu esse modo,
      // texto e ações já chegam com contraste completo enquanto carregam.
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
