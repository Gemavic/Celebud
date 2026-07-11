import {
  Video, Mic, Star, Briefcase, Film, Flame, Landmark, Users, Heart,
  Newspaper, Trophy, Cpu, Activity, TrendingUp, GraduationCap, Globe,
  Shield, Scale, Plane, Headphones,
} from 'lucide-react';
import { Category } from '../lib/database.types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  video: Video,
  mic: Mic,
  star: Star,
  briefcase: Briefcase,
  film: Film,
  landmark: Landmark,
  users: Users,
  heart: Heart,
  newspaper: Newspaper,
  trophy: Trophy,
  cpu: Cpu,
  activity: Activity,
  'trending-up': TrendingUp,
  'graduation-cap': GraduationCap,
  globe: Globe,
  shield: Shield,
  scale: Scale,
  plane: Plane,
  headphones: Headphones,
};

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
      <div className="flex items-center space-x-3 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
            selectedCategory === null
              ? 'bg-red-600 text-white shadow-[0_4px_10px_rgba(220,38,38,0.3)]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>All Content</span>
        </button>

        {categories.map((category) => {
          const Icon = iconMap[category.icon] || Star;
          const isSelected = selectedCategory === category.slug;

          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.slug)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-red-600 text-white shadow-[0_4px_10px_rgba(220,38,38,0.3)]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
