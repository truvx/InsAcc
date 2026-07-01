import React from 'react'
import { motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
}

interface Props {
  children: React.ReactNode
  pageKey: string
  module?: string
}

export default function PageTransition({ children, pageKey, module }: Props) {
  return (
    <motion.div
      key={pageKey}
      data-module={module}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
    >
      {children}
    </motion.div>
  )
}
