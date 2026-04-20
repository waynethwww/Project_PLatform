declare global {
  interface Window {
    dd?: {
      ready(callback: () => void): void;
      error(callback: (error: unknown) => void): void;
      runtime: {
        permission: {
          requestAuthCode(options: {
            corpId: string;
            onSuccess(result: { code: string }): void;
            onFail(error: unknown): void;
          }): void;
        };
      };
    };
  }
}

export async function requestDingTalkAuthCode(corpId: string): Promise<string> {
  if (!window.dd) {
    throw new Error('DingTalk JSAPI not available in current environment');
  }

  return new Promise((resolve, reject) => {
    window.dd?.ready(() => {
      window.dd?.runtime.permission.requestAuthCode({
        corpId,
        onSuccess: (result) => resolve(result.code),
        onFail: reject,
      });
    });

    window.dd?.error(reject);
  });
}

export async function loginWithDingTalk(corpId: string) {
  const authCode = await requestDingTalkAuthCode(corpId);
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || '/api'}/dingtalk/login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authCode }),
    },
  );

  if (!response.ok) {
    throw new Error('DingTalk login failed');
  }

  return response.json();
}

