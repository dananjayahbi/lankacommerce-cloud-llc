"use client"

import * as React from "react"
import { useFormContext, Controller, FormProvider, type ControllerProps, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

// FormField
function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return <Controller {...props} />
}

// FormItem context
interface FormItemContextValue { id: string }
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function FormItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const id = React.useId()
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("space-y-1.5", className)} {...props} />
    </FormItemContext.Provider>
  )
}

// FormLabel
function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="form-label" className={cn(className)} {...props} />
}

// FormControl
function FormControl({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="form-control" {...props} />
}

// FormDescription
function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="form-description" className={cn("text-muted-foreground text-sm", className)} {...props} />
  )
}

// FormMessage
function FormMessage({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return children ? (
    <p data-slot="form-message" className={cn("text-destructive text-sm font-medium", className)} {...props}>
      {children}
    </p>
  ) : null
}

// useFormField hook
function useFormField() {
  const { id } = React.useContext(FormItemContext)
  return { id, formItemId: `${id}-form-item`, formDescriptionId: `${id}-form-item-description`, formMessageId: `${id}-form-item-message` }
}

// Form — wraps FormProvider + form element
interface FormProps<TFieldValues extends FieldValues = FieldValues> extends Omit<React.HTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  children: React.ReactNode
  onSubmit?: React.FormEventHandler<HTMLFormElement> | undefined
  // Allow spreading useForm return
  [key: string]: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Form({ children, onSubmit, ...props }: FormProps<any>) {
  // Extract RHF methods if they look like a form return object
  const methods = props as unknown as UseFormReturn
  const hasControl = 'control' in props && typeof (props as Record<string, unknown>).control === 'object'
  if (hasControl) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { control: _c, handleSubmit: _h, register: _r, formState: _f, watch: _w, setValue: _sv, getValues: _gv, reset: _rs, setError: _se, clearErrors: _ce, trigger: _tr, unregister: _ur, ...htmlProps } = props as UseFormReturn & FormProps
    return (
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} {...(htmlProps as React.HTMLAttributes<HTMLFormElement>)}>
          {children}
        </form>
      </FormProvider>
    )
  }
  return <form onSubmit={onSubmit} {...(props as React.HTMLAttributes<HTMLFormElement>)}>{children}</form>
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, useFormField, useFormContext }

