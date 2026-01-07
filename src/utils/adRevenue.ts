export interface AdRevenueCalculation {
  adId: string;
  adTitle: string;
  impressions: number;
  clicks: number;
  cpmRate: number;
  revenue: number;
  ctr: number;
}

export function calculateAdRevenue(
  impressions: number,
  cpmRate: number
): number {
  return (impressions / 1000) * cpmRate;
}

export function calculateCTR(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
