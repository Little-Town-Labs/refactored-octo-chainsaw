export const NOTIFICATION_SCOPES = {
  publish: "notification:template:publish",
  build: "notification:artifact:build",
  gate: "notification:gate:evaluate",
  deliver: "notification:delivery:create",
  review: "notification:review",
} as const;

export function requireNotificationScope(scopes: readonly string[], required: string): void {
  if (!scopes.includes(required)) {
    throw new Error(`missing_scope:${required}`);
  }
}
