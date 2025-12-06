const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function fetchLatestNews() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-news`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch news');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
}

export function startAutoRefresh(intervalMinutes: number, callback: () => void) {
  const intervalMs = intervalMinutes * 60 * 1000;
  const intervalId = setInterval(callback, intervalMs);

  return () => clearInterval(intervalId);
}
