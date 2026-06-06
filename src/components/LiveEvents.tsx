import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Users, Video, MapPin, Ticket, Clock } from 'lucide-react';

interface LiveEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  cover_image_url: string | null;
  start_time: string;
  end_time: string | null;
  venue_or_link: string | null;
  ticket_price: number;
  max_attendees: number | null;
  current_attendees: number;
  host_name: string | null;
  host_avatar_url: string | null;
  is_featured: boolean;
  status: string;
}

export function LiveEvents() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data } = await supabase
      .from('live_events')
      .select('*')
      .in('status', ['upcoming', 'live'])
      .order('start_time', { ascending: true })
      .limit(6);

    if (data) setEvents(data);
    setLoading(false);
  }

  function formatEventDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getTimeUntil(dateStr: string) {
    const now = new Date();
    const event = new Date(dateStr);
    const diff = event.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 1) return `In ${days} days`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 1) return `In ${hours} hours`;
    return 'Starting soon';
  }

  if (loading || events.length === 0) return null;

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Video className="w-5 h-5 text-red-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Live Events</h2>
          </div>
          <p className="text-gray-500 text-sm">Exclusive virtual events, interviews & networking</p>
        </div>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tickets from $4.99</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className={`relative bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 group ${
              event.is_featured ? 'border-red-200 ring-1 ring-red-100' : 'border-gray-200'
            }`}
          >
            {event.is_featured && (
              <div className="absolute top-3 right-3 z-10 bg-red-600 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                Featured
              </div>
            )}

            {event.status === 'live' && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full" />
                LIVE NOW
              </div>
            )}

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 h-32 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent" />
              <Video className="w-10 h-10 text-white/30" />
              <div className="absolute bottom-3 left-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
                  {event.event_type === 'virtual' && <Video className="w-3 h-3" />}
                  {event.event_type === 'in_person' && <MapPin className="w-3 h-3" />}
                  {event.event_type}
                </span>
              </div>
            </div>

            <div className="p-5">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-2 group-hover:text-red-600 transition-colors">
                {event.title}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2 mb-4">{event.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formatEventDate(event.start_time)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-red-600 font-medium">{getTimeUntil(event.start_time)}</span>
                </div>
                {event.max_attendees && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>{event.current_attendees}/{event.max_attendees} spots filled</span>
                  </div>
                )}
              </div>

              {event.host_name && (
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                    {event.host_name.charAt(0)}
                  </div>
                  <span className="text-xs text-gray-500">Hosted by <span className="font-medium text-gray-700">{event.host_name}</span></span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-gray-900">${event.ticket_price.toFixed(2)}</span>
                  <span className="text-xs text-gray-500 ml-1">/ ticket</span>
                </div>
                <button
                  onClick={() => handleGetTicket(event)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  Get Ticket
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function handleGetTicket(event: LiveEvent) {
  const subject = encodeURIComponent(`Ticket Request: ${event.title}`);
  const body = encodeURIComponent(`Hi CelebUD Team,\n\nI'd like to purchase a ticket for "${event.title}" ($${event.ticket_price}).\n\nPlease send me the payment link.\n\nThank you!`);
  window.open(`mailto:events@celebud.com?subject=${subject}&body=${body}`, '_blank');
}
