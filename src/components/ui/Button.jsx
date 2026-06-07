import React from 'react'

const variants = {
  primary: 'bg-gradient-to-r from-warung-primary to-red-500 text-white shadow-warm',
  secondary: 'border border-warung-line bg-warung-paper text-warung-text hover:border-warung-primary',
  danger: 'bg-gradient-to-r from-warung-danger to-warung-primary text-white shadow-warm',
  success: 'bg-gradient-to-r from-warung-secondary to-emerald-600 text-white shadow-warm',
  ghost: 'bg-transparent text-warung-text hover:bg-orange-100/60',
}

const sizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-4 text-base',
  icon: 'h-11 w-11 p-0',
}

export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  children,
  ...props
}) {
  return (
    <Component
      className={[
        'ripple inline-flex items-center justify-center gap-2 rounded-full font-black transition duration-200 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-warung-secondary/20 disabled:pointer-events-none disabled:opacity-55',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      ].join(' ')}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </Component>
  )
}
