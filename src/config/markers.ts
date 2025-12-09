// Marker configuration matching XMind marker system

export interface MarkerOption {
  id: string;
  label: string;
  icon?: string; // For custom rendering
  color?: string;
}

export interface MarkerCategory {
  id: string;
  label: string;
  options: MarkerOption[];
}

export const MARKER_CATEGORIES: MarkerCategory[] = [
  {
    id: 'priority',
    label: 'Task Priority',
    options: [
      { id: 'priority-1', label: '1', color: '#ef4444' },
      { id: 'priority-2', label: '2', color: '#f97316' },
      { id: 'priority-3', label: '3', color: '#eab308' },
      { id: 'priority-4', label: '4', color: '#22c55e' },
      { id: 'priority-5', label: '5', color: '#3b82f6' },
      { id: 'priority-6', label: '6', color: '#6366f1' },
      { id: 'priority-7', label: '7', color: '#8b5cf6' },
      { id: 'priority-8', label: '8', color: '#a855f7' },
      { id: 'priority-9', label: '9', color: '#64748b' },
    ],
  },
  {
    id: 'task',
    label: 'Task Progress',
    options: [
      { id: 'task-start', label: 'Not Started', icon: 'circle' },
      { id: 'task-oct', label: '1/8', icon: 'clock-1' },
      { id: 'task-quarter', label: '1/4', icon: 'clock-2' },
      { id: 'task-3oct', label: '3/8', icon: 'clock-3' },
      { id: 'task-half', label: '1/2', icon: 'clock-4' },
      { id: 'task-5oct', label: '5/8', icon: 'clock-5' },
      { id: 'task-3quarter', label: '3/4', icon: 'clock-6' },
      { id: 'task-7oct', label: '7/8', icon: 'clock-7' },
      { id: 'task-done', label: 'Done', icon: 'check-circle' },
    ],
  },
  {
    id: 'flag',
    label: 'Flags',
    options: [
      { id: 'flag-red', label: 'Red', color: '#ef4444' },
      { id: 'flag-orange', label: 'Orange', color: '#f97316' },
      { id: 'flag-yellow', label: 'Yellow', color: '#eab308' },
      { id: 'flag-green', label: 'Green', color: '#22c55e' },
      { id: 'flag-blue', label: 'Blue', color: '#3b82f6' },
      { id: 'flag-purple', label: 'Purple', color: '#8b5cf6' },
      { id: 'flag-gray', label: 'Gray', color: '#64748b' },
    ],
  },
  {
    id: 'star',
    label: 'Stars',
    options: [
      { id: 'star-red', label: 'Red', color: '#ef4444' },
      { id: 'star-orange', label: 'Orange', color: '#f97316' },
      { id: 'star-yellow', label: 'Yellow', color: '#eab308' },
      { id: 'star-green', label: 'Green', color: '#22c55e' },
      { id: 'star-blue', label: 'Blue', color: '#3b82f6' },
      { id: 'star-purple', label: 'Purple', color: '#8b5cf6' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    options: [
      { id: 'people-red', label: 'Red', color: '#ef4444' },
      { id: 'people-orange', label: 'Orange', color: '#f97316' },
      { id: 'people-yellow', label: 'Yellow', color: '#eab308' },
      { id: 'people-green', label: 'Green', color: '#22c55e' },
      { id: 'people-blue', label: 'Blue', color: '#3b82f6' },
      { id: 'people-purple', label: 'Purple', color: '#8b5cf6' },
    ],
  },
  {
    id: 'arrow',
    label: 'Arrows',
    options: [
      { id: 'arrow-up', label: 'Up', icon: 'arrow-up' },
      { id: 'arrow-down', label: 'Down', icon: 'arrow-down' },
      { id: 'arrow-left', label: 'Left', icon: 'arrow-left' },
      { id: 'arrow-right', label: 'Right', icon: 'arrow-right' },
      { id: 'arrow-up-right', label: 'Up Right', icon: 'arrow-up-right' },
      { id: 'arrow-down-right', label: 'Down Right', icon: 'arrow-down-right' },
      { id: 'arrow-refresh', label: 'Refresh', icon: 'refresh-cw' },
    ],
  },
  {
    id: 'symbol',
    label: 'Symbols',
    options: [
      { id: 'symbol-plus', label: 'Plus', icon: 'plus', color: '#22c55e' },
      { id: 'symbol-minus', label: 'Minus', icon: 'minus', color: '#ef4444' },
      { id: 'symbol-question', label: 'Question', icon: 'help-circle', color: '#eab308' },
      { id: 'symbol-info', label: 'Info', icon: 'info', color: '#3b82f6' },
      { id: 'symbol-x', label: 'X', icon: 'x', color: '#ef4444' },
      { id: 'symbol-check', label: 'Check', icon: 'check', color: '#22c55e' },
      { id: 'symbol-pause', label: 'Pause', icon: 'pause', color: '#f97316' },
      { id: 'symbol-exclam', label: 'Important', icon: 'alert-triangle', color: '#ef4444' },
    ],
  },
  {
    id: 'month',
    label: 'Month',
    options: [
      { id: 'month-1', label: 'Jan', color: '#3b82f6' },
      { id: 'month-2', label: 'Feb', color: '#3b82f6' },
      { id: 'month-3', label: 'Mar', color: '#3b82f6' },
      { id: 'month-4', label: 'Apr', color: '#22c55e' },
      { id: 'month-5', label: 'May', color: '#22c55e' },
      { id: 'month-6', label: 'Jun', color: '#22c55e' },
      { id: 'month-7', label: 'Jul', color: '#ef4444' },
      { id: 'month-8', label: 'Aug', color: '#ef4444' },
      { id: 'month-9', label: 'Sep', color: '#ef4444' },
      { id: 'month-10', label: 'Oct', color: '#f97316' },
      { id: 'month-11', label: 'Nov', color: '#f97316' },
      { id: 'month-12', label: 'Dec', color: '#f97316' },
    ],
  },
  {
    id: 'week',
    label: 'Day of Week',
    options: [
      { id: 'week-sun', label: 'Sun', color: '#ef4444' },
      { id: 'week-mon', label: 'Mon', color: '#3b82f6' },
      { id: 'week-tue', label: 'Tue', color: '#8b5cf6' },
      { id: 'week-wed', label: 'Wed', color: '#22c55e' },
      { id: 'week-thu', label: 'Thu', color: '#8b5cf6' },
      { id: 'week-fri', label: 'Fri', color: '#22c55e' },
      { id: 'week-sat', label: 'Sat', color: '#f97316' },
    ],
  },
];

// Helper to get marker info by ID
export function getMarkerById(markerId: string): { category: MarkerCategory; option: MarkerOption } | null {
  for (const category of MARKER_CATEGORIES) {
    const option = category.options.find(o => o.id === markerId);
    if (option) {
      return { category, option };
    }
  }
  return null;
}

// Helper to get category by ID
export function getCategoryById(categoryId: string): MarkerCategory | undefined {
  return MARKER_CATEGORIES.find(c => c.id === categoryId);
}
