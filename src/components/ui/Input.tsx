import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                {label && (
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    className={cn(
                        "mi-field file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
                        error && 'border-destructive focus-visible:ring-destructive',
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";

