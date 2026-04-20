import { useEffect, useState } from 'react';

import { DashboardPage } from './pages/DashboardPage';
import { PMWeeklyFormPage } from './pages/PMWeeklyFormPage';

type AppView = 'dashboard' | 'pm-form';

function getCurrentView(): AppView {
  if (typeof window === 'undefined') {
    return 'dashboard';
  }

  return window.location.hash === '#/pm-form' ? 'pm-form' : 'dashboard';
}

export default function App() {
  const [view, setView] = useState<AppView>(getCurrentView);

  useEffect(() => {
    function handleHashChange() {
      setView(getCurrentView());
    }

    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function navigate(nextView: AppView) {
    window.location.hash = nextView === 'dashboard' ? '#/dashboard' : '#/pm-form';
  }

  return (
    <div className="app-shell">
      <div className="app-switcher">
        <div>
          <p className="app-switcher__eyebrow">Project Platform Preview</p>
          <strong>系统页面预览</strong>
        </div>
        <div className="app-switcher__buttons">
          <button
            className={view === 'dashboard' ? 'is-active' : ''}
            onClick={() => navigate('dashboard')}
          >
            管理大屏
          </button>
          <button
            className={view === 'pm-form' ? 'is-active' : ''}
            onClick={() => navigate('pm-form')}
          >
            PM 周填报
          </button>
        </div>
      </div>
      {view === 'dashboard' ? <DashboardPage /> : <PMWeeklyFormPage />}
    </div>
  );
}

