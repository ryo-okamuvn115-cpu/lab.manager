import { useCallback, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import AccessPendingPage from '@/components/AccessPendingPage';
import AuthPage from '@/components/AuthPage';
import Navigation from '@/components/Navigation';
import PasswordRecoveryPage from '@/components/PasswordRecoveryPage';
import SetupRequiredPage from '@/components/SetupRequiredPage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import DashboardPage from '@/pages/DashboardPage';
import InventoryManagerPage from '@/pages/InventoryManagerPage';
import OrdersManagerPage from '@/pages/OrdersManagerPage';
import ProtocolsManagerPage from '@/pages/ProtocolsManagerPage';
import { accessAPI, authAPI } from '@/lib/api';
import { useLabManager } from '@/hooks/useLabManager';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Page, WorkspaceRole } from '@/lib/types';

type AccessState = 'idle' | 'checking' | 'granted' | 'denied';
type AuthFlow = 'default' | 'recovery';

function FullScreenMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authFlow, setAuthFlow] = useState<AuthFlow>('default');
  const [accessState, setAccessState] = useState<AccessState>('idle');
  const [accessError, setAccessError] = useState<string | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const isAppReady = Boolean(session) && accessState === 'granted';
  const isAdmin = workspaceRole === 'admin';

  const {
    snapshot,
    loading,
    saving,
    error,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    createStorageLocation,
    updateStorageLocation,
    deleteStorageLocation,
    createOrder,
    updateOrder,
    deleteOrder,
    createProtocol,
    updateProtocol,
    deleteProtocol,
  } = useLabManager(isAppReady);

  useEffect(() => {
    document.title = 'Lab Manager - 研究室共有システム';
  }, []);

  const isRecoveryLinkOpen = useCallback(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    const markers = `${window.location.hash}&${window.location.search}`.toLowerCase();
    return markers.includes('type=recovery');
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let active = true;

    void authAPI
      .getSession()
      .then((nextSession) => {
        if (!active) {
          return;
        }

        setSession(nextSession);
        if (nextSession && isRecoveryLinkOpen()) {
          setAuthFlow('recovery');
          setAuthNotice('新しいパスワードを設定してください。');
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setAuthError(error instanceof Error ? error.message : 'ログイン状態を確認できませんでした。');
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    const {
      data: { subscription },
    } = authAPI.onAuthStateChange((event, nextSession) => {
      if (!active) {
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        setSession(nextSession);
        setAuthFlow('recovery');
        setAuthError(null);
        setAuthNotice('新しいパスワードを設定してください。');
        setAuthLoading(false);
        return;
      }

      setSession(nextSession);
      setAuthLoading(false);
      setAuthError(null);

      if (event === 'SIGNED_OUT') {
        setAuthFlow('default');
        return;
      }

      if (event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setAuthFlow('default');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isRecoveryLinkOpen]);

  useEffect(() => {
    if (!session) {
      setAccessState('idle');
      setAccessError(null);
      setWorkspaceRole(null);
      setCurrentPage('home');
      return;
    }

    let active = true;

    setAccessState('checking');
    setAccessError(null);

    void accessAPI
      .getWorkspaceAccess()
      .then((access) => {
        if (!active) {
          return;
        }

        setAccessState(access.allowed ? 'granted' : 'denied');
        setWorkspaceRole(access.role);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setAccessState('denied');
        setWorkspaceRole(null);
        setAccessError(error instanceof Error ? error.message : 'アクセス権を確認できませんでした。');
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (currentPage === 'admin' && !isAdmin) {
      setCurrentPage('home');
    }
  }, [currentPage, isAdmin]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      await authAPI.signIn({ email, password });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'ログインできませんでした。');
    } finally {
      setAuthSubmitting(false);
    }
  }, []);

  const handleSignUp = useCallback(async (email: string, password: string) => {
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const result = await authAPI.signUp({ email, password });

      if (result.isExistingUser) {
        setAuthError('このメールアドレスは登録されています。ログインするか、パスワード再設定を使ってください。');
        return;
      }

      if (result.needsEmailConfirmation) {
        setAuthNotice(
          '確認メールを送信しました。メール認証が有効な場合はリンクを開いてからログインしてください。研究室メンバーとして使うには、管理者がそのメールアドレスを `workspace_members` に追加する必要があります。',
        );
        return;
      }

      setAuthNotice(
        'アカウントを作成しました。研究室メンバーとして使うには、管理者がそのメールアドレスを `workspace_members` に追加してください。',
      );
      setSession(result.session);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'アカウントを作成できませんでした。');
    } finally {
      setAuthSubmitting(false);
    }
  }, []);

  const handleRequestPasswordReset = useCallback(async (email: string) => {
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      const result = await authAPI.requestPasswordReset(email);
      setAuthNotice(
        result.redirectTo
          ? 'パスワード再設定メールを送信しました。メール内のリンクを開いて、新しいパスワードを設定してください。'
          : 'パスワード再設定メールを送信しました。現在のスマホアプリでは、メールのリンク先を別途設定していないため、受信メールの案内に沿ってブラウザ側で新しいパスワードを設定してください。',
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'パスワード再設定メールを送信できませんでした。',
      );
    } finally {
      setAuthSubmitting(false);
    }
  }, []);

  const handleUpdatePassword = useCallback(async (password: string) => {
    setAuthSubmitting(true);
    setAuthError(null);
    setAuthNotice(null);

    try {
      await authAPI.updatePassword(password);
      setAuthFlow('default');
      setAuthNotice('パスワードを更新しました。');
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : '新しいパスワードを設定できませんでした。',
      );
    } finally {
      setAuthSubmitting(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthSubmitting(true);
    setAuthError(null);

    try {
      await authAPI.signOut();
      setAuthNotice(null);
      setSession(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'ログアウトできませんでした。');
    } finally {
      setAuthSubmitting(false);
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <DashboardPage
            snapshot={snapshot}
            loading={loading}
            saving={saving}
            error={error}
            onNavigate={setCurrentPage}
          />
        );
      case 'inventory':
        return (
          <InventoryManagerPage
            items={snapshot?.inventory ?? []}
            loading={loading}
            saving={saving}
            error={error}
            lastSyncAt={snapshot?.updatedAt ?? null}
            locationOptions={(snapshot?.storageLocations ?? [])
              .filter((location) => location.isActive)
              .map((location) => location.name)}
            onCreate={createInventoryItem}
            onUpdate={updateInventoryItem}
            onDelete={deleteInventoryItem}
          />
        );
      case 'admin':
        return (
          <AdminSettingsPage
            locations={snapshot?.storageLocations ?? []}
            inventoryItems={snapshot?.inventory ?? []}
            loading={loading}
            saving={saving}
            error={error}
            lastSyncAt={snapshot?.updatedAt ?? null}
            onCreateLocation={createStorageLocation}
            onUpdateLocation={updateStorageLocation}
            onDeleteLocation={deleteStorageLocation}
          />
        );
      case 'orders':
        return (
          <OrdersManagerPage
            orders={snapshot?.orders ?? []}
            loading={loading}
            saving={saving}
            error={error}
            lastSyncAt={snapshot?.updatedAt ?? null}
            onCreate={createOrder}
            onUpdate={updateOrder}
            onDelete={deleteOrder}
          />
        );
      case 'protocols':
        return (
          <ProtocolsManagerPage
            protocols={snapshot?.protocols ?? []}
            loading={loading}
            saving={saving}
            error={error}
            lastSyncAt={snapshot?.updatedAt ?? null}
            onCreate={createProtocol}
            onUpdate={updateProtocol}
            onDelete={deleteProtocol}
          />
        );
      default:
        return (
          <DashboardPage
            snapshot={snapshot}
            loading={loading}
            saving={saving}
            error={error}
            onNavigate={setCurrentPage}
          />
        );
    }
  };

  if (!isSupabaseConfigured) {
    return <SetupRequiredPage />;
  }

  if (authLoading) {
    return (
      <FullScreenMessage
        title="認証状態を確認しています"
        description="Supabase と接続して、ログイン済みかどうかを確認しています。"
      />
    );
  }

  if (!session) {
    return (
      <AuthPage
        busy={authSubmitting}
        error={authError}
        notice={authNotice}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onRequestPasswordReset={handleRequestPasswordReset}
      />
    );
  }

  if (authFlow === 'recovery') {
    return (
      <PasswordRecoveryPage
        busy={authSubmitting}
        error={authError}
        notice={authNotice}
        onUpdatePassword={handleUpdatePassword}
      />
    );
  }

  if (accessState === 'checking') {
    return (
      <FullScreenMessage
        title="研究室メンバー権限を確認しています"
        description={`${session.user.email ?? '現在のアカウント'} のアクセス権を確認しています。`}
      />
    );
  }

  if (accessState === 'denied') {
    return (
      <AccessPendingPage
        email={session.user.email ?? null}
        error={accessError}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lab Manager</h1>
            <p className="text-sm text-gray-500">
              研究室の試薬・発注・プロトコルを、メンバーごとのログインで安全に共有します。
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-slate-900">{session.user.email ?? 'ログイン中'}</div>
              <div className="text-xs text-slate-500">Supabase と同期中</div>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={authSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col md:min-h-[calc(100vh-97px)] md:flex-row">
        <Navigation currentPage={currentPage} onPageChange={setCurrentPage} isAdmin={isAdmin} />
        <main className="flex-1">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
