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
      throw new Error(`Failed to fetch news: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    try {
      const data = JSON.parse(text);
      return data;
    } catch {
      console.error('Failed to parse JSON response:', text);
      throw new Error('Invalid JSON response from server');
    }
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
