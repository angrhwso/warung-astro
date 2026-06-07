import React from 'react'

export default function Card({ as: Component = 'div', hover = false, className = '', children, ...props }) {
  return (
    <Component
      className={[
        'ui-card rounded-3xl border border-warung-line bg-warung-paper p-5 shadow-soft',
        hover ? 'transition duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-warm' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Component>
  )
}
