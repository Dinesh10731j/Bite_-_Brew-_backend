export const cleanEnv = (value?: string): string | undefined => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

export const cleanPass = (value?: string): string | undefined => {
  const cleaned = cleanEnv(value);
  return cleaned ? cleaned.replace(/\s+/g, '') : cleaned;
};

export const parseToInt = (value?: string, defaultValue: number = 0): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

export const parseToBoolean = (value?: string, defaultValue: boolean = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};
