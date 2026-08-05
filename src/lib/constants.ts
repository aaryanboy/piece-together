export interface PresetImage {
  id: string;
  title: string;
  category: string;
  url: string;
  thumbnail: string;
}

export const PLAYER_COLORS = [
  '#FF5733', // Vibrant Coral
  '#33FF57', // Emerald Neon
  '#3380FF', // Vivid Sky Blue
  '#F39C12', // Warm Amber
  '#9B59B6', // Electric Purple
  '#1ABC9C', // Aqua Mint
  '#E91E63', // Neon Pink
  '#00BCD4', // Cyan Wave
];

export const PRESET_IMAGES: PresetImage[] = [
  {
    id: 'cosmic-nebula',
    title: 'Cosmic Dreams',
    category: 'Space',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'alpine-lake',
    title: 'Emerald Alpine Mirror',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'tokyo-cyberpunk',
    title: 'Neon Tokyo Alley',
    category: 'Cityscape',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'abstract-fluid',
    title: 'Liquid Gold Abstract',
    category: 'Art',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'autumn-forest',
    title: 'Golden Autumn Canopy',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
  },
  {
    id: 'sunset-coast',
    title: 'Pacific Sunset Horizon',
    category: 'Seascape',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=400&auto=format&fit=crop',
  }
];

export const DIFFICULTY_PRESETS = [
  { label: 'Easy (3 x 3)', rows: 3, cols: 3, total: 9 },
  { label: 'Medium (5 x 5)', rows: 5, cols: 5, total: 25 },
  { label: 'Hard (8 x 8)', rows: 8, cols: 8, total: 64 },
  { label: 'Expert (10 x 10)', rows: 10, cols: 10, total: 100 },
  { label: 'Master (12 x 12)', rows: 12, cols: 12, total: 144 },
];

export const SNAP_DISTANCE_THRESHOLD = 20; // pixels on canvas scale
