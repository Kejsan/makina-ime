import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, hint, id, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id || generatedId;
        const descriptionId = error || hint ? `${inputId}-description` : undefined;
        return (
            <div className="w-full space-y-2">
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    type={type}
                    aria-invalid={Boolean(error)}
                    aria-describedby={descriptionId}
                    className={cn(
                        "mi-field file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
                        error && 'border-destructive focus-visible:ring-destructive',
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {(error || hint) && <p id={descriptionId} className={cn('text-sm', error ? 'font-medium text-destructive' : 'text-muted-foreground')}>{error || hint}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";

