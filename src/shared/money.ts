/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Exact Integer Currency & Unit Cost Calculations
 * 
 * Rules:
 * - USD amounts: stored in integer CENTS (1 USD = 100 cents)
 * - Unit costs: stored in integer DIX-MILLIÈMES (1 USD = 10,000 dix-millièmes) for high precision PUMP
 * - CDF amounts: integer Francs Congolais
 * - Zero floating point drift
 */

/**
 * Converts a floating/decimal dollar string or number to integer cents.
 * e.g. 12.50 -> 1250, "45.99" -> 4599
 */
export function usdToCents(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts integer cents to dollar string with 2 decimals.
 * e.g. 1250 -> "12.50"
 */
export function centsToUSDString(cents: number): string {
  const safeCents = Math.round(cents || 0);
  const sign = safeCents < 0 ? '-' : '';
  const abs = Math.abs(safeCents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${dollars}.${remainder.toString().padStart(2, '0')}`;
}

/**
 * Pretty formats cents as currency string.
 * e.g. 1250 -> "$ 12.50"
 */
export function formatUSD(cents: number): string {
  return `$ ${centsToUSDString(cents)}`;
}

/**
 * Converts decimal cost to integer dix-millièmes (4 decimal places).
 * e.g. 45.2550 -> 452550
 */
export function usdToDixMillieme(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num)) return 0;
  return Math.round(num * 10000);
}

/**
 * Formats dix-millièmes into "$ XX.XXXX"
 */
export function formatDixMilliemeUSD(dixMillieme: number): string {
  const safe = Math.round(dixMillieme || 0);
  const sign = safe < 0 ? '-' : '';
  const abs = Math.abs(safe);
  const dollars = Math.floor(abs / 10000);
  const remainder = abs % 10000;
  return `${sign}$ ${dollars}.${remainder.toString().padStart(4, '0')}`;
}

/**
 * Converts USD cents to CDF using the specified exchange rate.
 * Formula: round(cents * rate / 100)
 */
export function centsUSDToCDF(centsUSD: number, rateUSD_CDF: number): number {
  if (!centsUSD || !rateUSD_CDF) return 0;
  return Math.round((centsUSD * rateUSD_CDF) / 100);
}

/**
 * Converts CDF to USD cents using the specified exchange rate.
 * Formula: round(cdf * 100 / rate)
 */
export function cdfToCentsUSD(cdf: number, rateUSD_CDF: number): number {
  if (!cdf || !rateUSD_CDF || rateUSD_CDF <= 0) return 0;
  return Math.round((cdf * 100) / rateUSD_CDF);
}

/**
 * Formats CDF with thousands spaces
 * e.g. 2850000 -> "2 850 000 FC"
 */
export function formatCDF(cdf: number): string {
  const safe = Math.round(cdf || 0);
  const formatted = safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FC`;
}

/**
 * Computes selling price in cents:
 * If fixedPriceCents is set (>0), returns fixedPriceCents.
 * Else: costConvertedToCents * (1 + margin / 100) rounded to nearest cent.
 */
export function computeSellingPriceCents(
  costDixMillieme: number,
  fixedPriceCents?: number,
  marginPercent: number = 25
): number {
  if (fixedPriceCents !== undefined && fixedPriceCents !== null && fixedPriceCents > 0) {
    return Math.round(fixedPriceCents);
  }
  // Convert dix-millième (10,000) to cents (100)
  const costCents = costDixMillieme / 100;
  const markup = 1 + marginPercent / 100;
  return Math.max(0, Math.round(costCents * markup));
}

/**
 * Calculates new Weighted Average Cost (PUMP - Coût Moyen Pondéré)
 * Formula specified in business rule:
 * nouveau coût = (stock avant × coût avant + quantité × prix d'achat) ÷ (stock avant + quantité)
 * Un stock négatif compte pour 0.
 * Précision 4 décimales (dix-millièmes).
 * Le coût est calculé avant d'ajouter le stock.
 * 
 * @param stockBefore Current stock quantity (if <= 0 counts as 0)
 * @param costBeforeDixMillieme Current PUMP in dix-millièmes (e.g. 40.0000$ = 400000)
 * @param purchasedQty Quantity being purchased (> 0)
 * @param purchasePriceCents Unit purchase price in cents (e.g. 50.00$ = 5000)
 * @returns New PUMP in integer dix-millièmes
 */
export function calculateNewPUMP(
  stockBefore: number,
  costBeforeDixMillieme: number,
  purchasedQty: number,
  purchasePriceCents: number
): number {
  if (purchasedQty <= 0) return costBeforeDixMillieme;

  const validStockBefore = Math.max(0, stockBefore);
  const purchasePriceDixMillieme = purchasePriceCents * 100;

  if (validStockBefore === 0) {
    return purchasePriceDixMillieme;
  }

  const totalValueBefore = validStockBefore * costBeforeDixMillieme;
  const purchaseValue = purchasedQty * purchasePriceDixMillieme;
  const totalStockAfter = validStockBefore + purchasedQty;

  return Math.round((totalValueBefore + purchaseValue) / totalStockAfter);
}
