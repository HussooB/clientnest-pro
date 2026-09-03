import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50',
        {
          'bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90': variant === 'default',
          'bg-red-900 text-zinc-50 hover:bg-red-900/90': variant === 'destructive',
          'border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900': variant === 'outline',
          'bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80': variant === 'secondary',
          'hover:bg-zinc-100 hover:text-zinc-900': variant === 'ghost',
          'text-zinc-900 underline-offset-4 hover:underline': variant === 'link',
        },
        {
          'h-9 px-4 py-2': size === 'default',
          'h-8 rounded-md px-3 text-xs': size === 'sm',
          'h-10 rounded-md px-8': size === 'lg',
          'h-9 w-9': size === 'icon',
        },
        className
      )}
      {...props}
    />
  );
}