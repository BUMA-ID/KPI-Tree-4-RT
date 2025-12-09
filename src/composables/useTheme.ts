import { ref, computed, watch, onMounted } from 'vue';

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'kpi-tree-theme';

// Global state
const theme = ref<Theme>('system');
const systemTheme = ref<'light' | 'dark'>('light');

// Check system preference
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

// Apply theme to document
function applyTheme(resolvedTheme: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }
}

export function useTheme() {
  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (theme.value === 'system') {
      return systemTheme.value;
    }
    return theme.value;
  });

  function setTheme(newTheme: Theme) {
    theme.value = newTheme;
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(resolvedTheme.value);
  }

  // Initialize theme
  onMounted(() => {
    // Load saved theme
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved) {
      theme.value = saved;
    }

    // Set up system theme detection
    systemTheme.value = getSystemTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      systemTheme.value = e.matches ? 'dark' : 'light';
      if (theme.value === 'system') {
        applyTheme(systemTheme.value);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    // Apply initial theme
    applyTheme(resolvedTheme.value);
  });

  // Watch for theme changes
  watch(resolvedTheme, (newTheme) => {
    applyTheme(newTheme);
  });

  return {
    theme,
    resolvedTheme,
    setTheme,
  };
}
