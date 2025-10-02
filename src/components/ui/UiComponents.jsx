import React from 'react';

// Card Components
export const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ children, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight text-zinc-900 ${className}`}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = "" }) => (
  <p className={`text-sm text-zinc-500 ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

// Badge Component
export const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-zinc-300 text-zinc-900 hover:bg-zinc-50",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
  };

  return (
    <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

// Button Component
export const Button = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const variants = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950",
    destructive: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
    outline: "border-2 border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900 active:bg-zinc-100",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300",
    ghost: "hover:bg-zinc-100 text-zinc-700 active:bg-zinc-200",
    link: "text-zinc-900 underline-offset-4 hover:underline",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-12 rounded-lg px-8 text-base",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Input Component
export const Input = ({ className = "", ...props }) => (
  <input
    className={`flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
    {...props}
  />
);

// Label Component
export const Label = ({ children, htmlFor, className = "" }) => (
  <label
    htmlFor={htmlFor}
    className={`text-sm font-medium leading-none text-zinc-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
  >
    {children}
  </label>
);

// Checkbox Component
export const Checkbox = ({ checked, onCheckedChange, className = "", ...props }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={() => onCheckedChange?.(!checked)}
    className={`peer h-5 w-5 shrink-0 rounded border-2 border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
      checked ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white hover:border-zinc-400'
    } ${className}`}
    {...props}
  >
    {checked && (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="3"
      >
        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
);

// Avatar Components
export const Avatar = ({ children, className = "" }) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-200 ${className}`}>
    {children}
  </div>
);

export const AvatarImage = ({ src, alt, className = "" }) => (
  <img
    src={src}
    alt={alt}
    className={`aspect-square h-full w-full object-cover ${className}`}
  />
);

export const AvatarFallback = ({ children, className = "" }) => (
  <div className={`flex h-full w-full items-center justify-center rounded-full bg-zinc-100 text-zinc-700 font-semibold text-sm ${className}`}>
    {children}
  </div>
);