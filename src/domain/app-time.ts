export function getAppNow(): Date {
  const configured = process.env.NEXT_PUBLIC_DEMO_NOW ?? process.env.DEMO_NOW;
  if (configured) {
    const parsed = new Date(configured);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
