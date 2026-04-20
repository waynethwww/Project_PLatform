import { useEffect, useState } from 'react';

import { DashboardPage as WeeklyReportPage } from './pages/DashboardPage';
import { PMWeeklyFormPage } from './pages/PMWeeklyFormPage';

type AppView = 'weekly-report' | 'pm-form';

function getCurrentView(): AppView {
  if (typeof window === 'undefined') {
    return 'weekly-report';
  }

  return window.location.hash === '#/pm-form' ? 'pm-form' : 'weekly-report';
}

export default function App() {
  const [view, setView] = useState<AppView>(getCurrentView);

  useEffect(() => {
    function handleHashChange() {
      setView(getCurrentView());
    }

    if (!window.location.hash || window.location.hash === '#/dashboard') {
      window.location.hash = '#/weekly-report';
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function navigate(nextView: AppView) {
    window.location.hash =
      nextView === 'weekly-report' ? '#/weekly-report' : '#/pm-form';
  }

  return (
    <div className="app-shell">
      <div className="app-switcher">
        <div>
          <p className="app-switcher__eyebrow">Project Weekly Report System</p>
          <strong>项目经营周报系统</strong>
        </div>
        <div className="app-switcher__buttons">
          <button
            className={view === 'weekly-report' ? 'is-active' : ''}
            onClick={() => navigate('weekly-report')}
          >
            周汇报视图
          </button>
          <button
            className={view === 'pm-form' ? 'is-active' : ''}
            onClick={() => navigate('pm-form')}
          >
            PM 周填报
          </button>
        </div>
      </div>
      {view === 'weekly-report' ? <WeeklyReportPage /> : <PMWeeklyFormPage />}
    </div>
  );
}
