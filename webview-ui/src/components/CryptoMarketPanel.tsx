import { useEffect, useMemo, useState } from 'react';

type Coin = {
  symbol: string;
  name: string;
  key: string;
};

type CoinPriceMap = Record<string, number>;

const TRACKED_COINS: Coin[] = [
  { symbol: 'BTC', name: 'Bitcoin', key: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', key: 'ethereum' },
  { symbol: 'SOL', name: 'Solana', key: 'solana' },
  { symbol: 'USDT', name: 'Tether', key: 'tether' },
];

const REFRESH_INTERVAL_MS = 60_000;

function formatUsd(value: number | null): string {
  if (value === null) return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

export function CryptoMarketPanel() {
  const [prices, setPrices] = useState<CoinPriceMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;

    const fetchPrices = async () => {
      try {
        const ids = TRACKED_COINS.map((coin) => coin.key).join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as Record<string, { usd?: number }>;
        const nextPrices: CoinPriceMap = {};
        for (const coin of TRACKED_COINS) {
          const value = data[coin.key]?.usd;
          if (typeof value === 'number') nextPrices[coin.key] = value;
        }

        if (!active) return;
        setPrices(nextPrices);
        setError(null);
        setUpdatedAt(new Date());
      } catch {
        if (!active) return;
        setError('Unable to refresh prices');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchPrices();
    const timer = window.setInterval(() => {
      void fetchPrices();
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const lastUpdatedLabel = useMemo(() => {
    if (!updatedAt) return 'waiting first update...';
    return updatedAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [updatedAt]);

  return (
    <div className="absolute top-8 right-8 z-12 pixel-panel min-w-220 px-10 py-8">
      <div className="text-sm text-accent-bright mb-4">CRYPTO MARKET</div>
      <div className="flex flex-col gap-4">
        {TRACKED_COINS.map((coin) => (
          <div key={coin.key} className="flex items-center justify-between gap-10 text-xs">
            <div className="text-text-muted">{coin.symbol}</div>
            <div className="text-text">{formatUsd(prices[coin.key] ?? null)}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-2xs text-text-muted">
        {isLoading ? 'Loading prices...' : `Updated: ${lastUpdatedLabel}`}
        {error ? <span className="text-warning"> • {error}</span> : null}
      </div>
    </div>
  );
}
