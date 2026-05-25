import type { JSX, ReactNode } from "react";

export type EmployerConsoleFeedbackKind = "success" | "error" | "empty" | "warning";

export function EmployerConsoleFeedback({
  kind,
  title,
  children,
}: {
  readonly kind: EmployerConsoleFeedbackKind;
  readonly title: string;
  readonly children?: ReactNode;
}): JSX.Element {
  const role = kind === "success" || kind === "empty" ? "status" : "alert";
  return (
    <section role={role} aria-labelledby={`employer-console-${kind}-heading`}>
      <h2 id={`employer-console-${kind}-heading`}>{title}</h2>
      {children}
    </section>
  );
}

export function FieldErrors({
  errors,
}: {
  readonly errors?: Record<string, readonly string[]>;
}): JSX.Element | null {
  if (!errors || Object.keys(errors).length === 0) return null;
  return (
    <section role="alert" aria-labelledby="form-errors-heading">
      <h2 id="form-errors-heading">Review the form</h2>
      <ul>
        {Object.entries(errors).flatMap(([field, messages]) =>
          messages.map((message) => (
            <li key={`${field}:${message}`}>
              <a href={`#${field}`}>{field}</a>: {message}
            </li>
          )),
        )}
      </ul>
    </section>
  );
}
