import { useEffect, useState } from 'react';

import { DashboardPage as WeeklyReportPage } from './pages/DashboardPage';
import { ExpertNetworkFormPage } from './pages/ExpertNetworkFormPage';
import { PMWeeklyFormPage } from './pages/PMWeeklyFormPage';

type AppView = 'weekly-report' | 'pm-form' | 'expert-network';

type NavItem = {
  key: AppView | string;
  title: string;
  detail: string;
  icon: string;
  view?: AppView;
  disabled?: boolean;
};

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: '核心工作台',
    items: [
      {
        key: 'weekly-report',
        title: '周汇报视图',
        detail: '管理层汇报与经营总览',
        icon: '汇',
        view: 'weekly-report',
      },
    ],
  },
  {
    title: '填报中心',
    items: [
      {
        key: 'pm-form',
        title: 'PM 周填报',
        detail: '项目经理周维度更新',
        icon: 'PM',
        view: 'pm-form',
      },
      {
        key: 'expert-network',
        title: '专家网络填报',
        detail: '专家运营专项录入',
        icon: '专',
        view: 'expert-network',
      },
    ],
  },
  {
    title: '预留能力',
    items: [
      {
        key: 'supplier',
        title: '供应商管理',
        detail: '后续接入供应商协同',
        icon: '供',
        disabled: true,
      },
      {
        key: 'ai-center',
        title: 'AI 智能中心',
        detail: '摘要、分析与预警能力',
        icon: 'AI',
        disabled: true,
      },
      {
        key: 'alert-center',
        title: '预警中心',
        detail: '规则提醒与异常跟踪',
        icon: '预',
        disabled: true,
      },
    ],
  },
];

function getCurrentView(): AppView {
  if (typeof window === 'undefined') {
    return 'weekly-report';
  }

  if (window.location.hash === '#/pm-form') {
    return 'pm-form';
  }

  if (window.location.hash === '#/expert-network') {
    return 'expert-network';
  }

  return 'weekly-report';
}

export default function App() {
  const [view, setView] = useState<AppView>(getCurrentView);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 960 : false,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (window.sessionStorage.getItem('app-scroll-top-on-load') === '1') {
      window.sessionStorage.removeItem('app-scroll-top-on-load');
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }

    function handleHashChange() {
      setView(getCurrentView());
    }

    function handleResize() {
      const nextIsMobile = window.innerWidth <= 960;
      setIsMobileViewport(nextIsMobile);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    }

    if (!window.location.hash || window.location.hash === '#/dashboard') {
      window.location.hash = '#/weekly-report';
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function navigate(nextView: AppView) {
    const nextHash =
      nextView === 'weekly-report'
        ? '#/weekly-report'
        : nextView === 'pm-form'
          ? '#/pm-form'
          : '#/expert-network';

    setIsSidebarOpen(false);
    window.sessionStorage.setItem('app-scroll-top-on-load', '1');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    window.setTimeout(() => {
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
      window.location.reload();
    }, 180);
  }

  return (
    <div
      className={`app-shell app-shell--workspace ${
        isSidebarOpen ? 'is-sidebar-open' : 'is-sidebar-hidden'
      } ${isMobileViewport ? 'is-mobile-shell' : ''}`}
    >
      {isSidebarOpen ? (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label="关闭导航抽屉"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">
          <div className="app-sidebar__brand-copy">
            <p>Project Management Hub</p>
            <strong>项目管理中台</strong>
          </div>
          <button
            type="button"
            className="app-sidebar__close"
            aria-label="关闭导航抽屉"
            onClick={() => setIsSidebarOpen(false)}
          >
            <span />
            <span />
          </button>
        </div>
        <div className="app-sidebar__section-label">工作区导航</div>
        <nav className="app-sidebar__nav" aria-label="系统导航">
          {NAV_GROUPS.map((group) => (
            <section key={group.title} className="app-nav-group">
              <h2>{group.title}</h2>
              <div className="app-nav-group__items">
                {group.items.map((item) => {
                  const isActive = item.view ? view === item.view : false;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`app-nav-item ${
                        isActive ? 'is-active' : ''
                      } ${item.disabled ? 'is-disabled' : ''}`}
                      onClick={() => (item.view ? navigate(item.view) : undefined)}
                      disabled={item.disabled}
                    >
                      <span className="app-nav-item__icon">{item.icon}</span>
                      <span className="app-nav-item__copy">
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <div className="app-workspace">
        <div className="app-toolbar-anchor">
          <button
            type="button"
            className={`app-topbar__menu ${isSidebarOpen ? 'is-active' : ''}`}
            aria-label={isSidebarOpen ? '关闭左侧导航' : '打开左侧导航'}
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <main className="app-content">
          {view === 'weekly-report' ? (
            <WeeklyReportPage />
          ) : view === 'pm-form' ? (
            <PMWeeklyFormPage />
          ) : (
            <ExpertNetworkFormPage />
          )}
        </main>
      </div>
    </div>
  );
}
