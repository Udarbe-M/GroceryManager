export const supportedCurrencies = [
  'PHP',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'SGD',
  'HKD',
  'MYR',
  'INR',
] as const;

export type SupportedCurrencyCode = (typeof supportedCurrencies)[number];
export type CurrencyPreference = 'auto' | SupportedCurrencyCode;

const currencyLocales: Record<SupportedCurrencyCode, string> = {
  PHP: 'en-PH',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
  SGD: 'en-SG',
  HKD: 'zh-HK',
  MYR: 'ms-MY',
  INR: 'en-IN',
};

export const currencyLabels: Record<SupportedCurrencyCode, string> = {
  PHP: 'Philippine Peso',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
  SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar',
  MYR: 'Malaysian Ringgit',
  INR: 'Indian Rupee',
};

const currencyPatterns: { code: SupportedCurrencyCode; pattern: RegExp }[] = [
  { code: 'PHP', pattern: /(₱|PHP|P\b)/i },
  { code: 'USD', pattern: /(\$|USD)/i },
  { code: 'EUR', pattern: /(€|EUR)/i },
  { code: 'GBP', pattern: /(£|GBP)/i },
  { code: 'JPY', pattern: /(¥|JPY)/i },
  { code: 'AUD', pattern: /(AUD)/i },
  { code: 'CAD', pattern: /(CAD)/i },
  { code: 'SGD', pattern: /(SGD)/i },
  { code: 'HKD', pattern: /(HKD)/i },
  { code: 'MYR', pattern: /(MYR|RM)/i },
  { code: 'INR', pattern: /(INR|Rs\.?)/i },
];

export function isSupportedCurrencyCode(value: string): value is SupportedCurrencyCode {
  return supportedCurrencies.includes(value as SupportedCurrencyCode);
}

export function detectCurrencyCode(text: string) {
  for (const { code, pattern } of currencyPatterns) {
    if (pattern.test(text)) {
      return code;
    }
  }

  return undefined;
}

export function getCurrencySymbol(currencyCode: SupportedCurrencyCode) {
  const formatter = new Intl.NumberFormat(currencyLocales[currencyCode], {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  });
  const parts = formatter.formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currencyCode;
}

export function formatCurrencyValue(value: number, currencyCode: SupportedCurrencyCode) {
  return new Intl.NumberFormat(currencyLocales[currencyCode], {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  }).format(value);
}

export function getCurrencyDescription(currencyCode: SupportedCurrencyCode) {
  return `${currencyCode} · ${currencyLabels[currencyCode]}`;
}
