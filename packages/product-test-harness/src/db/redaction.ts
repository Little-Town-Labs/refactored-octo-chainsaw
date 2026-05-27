export function redactDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return `${url.protocol}//[redacted]@[${url.host}]${url.pathname}`;
  } catch {
    return "[redacted-database-url]";
  }
}

export function containsDatabaseUrl(value: string): boolean {
  return /postgres(?:ql)?:\/\/\S+/i.test(value);
}

export function redactDatabaseUrls(value: string): string {
  return value.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-database-url]");
}
