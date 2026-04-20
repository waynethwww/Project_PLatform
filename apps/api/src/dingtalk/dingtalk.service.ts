import { Injectable, InternalServerErrorException } from '@nestjs/common';

type DingtalkUserIdentity = {
  userid: string;
  deviceId?: string;
  sys?: boolean;
  associatedUnionid?: string;
  unionid?: string;
};

type DingtalkDepartment = {
  dept_id: number;
  name: string;
  parent_id?: number;
};

type DingtalkUser = {
  userid: string;
  name: string;
  email?: string;
  mobile?: string;
  title?: string;
  dept_id_list?: number[];
};

@Injectable()
export class DingtalkService {
  async loginByAuthCode(authCode: string) {
    const accessToken = await this.getAppAccessToken();
    const identity = await this.getUserIdentityByCode(accessToken, authCode);
    const profile = await this.getUserProfile(accessToken, identity.userid);

    return {
      accessToken,
      profile,
      corpId: process.env.DINGTALK_CORP_ID,
      agentId: process.env.DINGTALK_AGENT_ID,
    };
  }

  async syncOrganization() {
    const accessToken = await this.getAppAccessToken();
    const departments = await this.getDepartmentChildren(accessToken, 1);

    const usersByDepartment = await Promise.all(
      departments.map(async (department) => ({
        department,
        users: await this.getUsersByDepartment(accessToken, department.dept_id),
      })),
    );

    return {
      departmentCount: departments.length,
      departments,
      usersByDepartment,
    };
  }

  private async getAppAccessToken(): Promise<string> {
    const appKey = process.env.DINGTALK_APP_KEY;
    const appSecret = process.env.DINGTALK_APP_SECRET;

    if (!appKey || !appSecret) {
      throw new InternalServerErrorException(
        'Missing DINGTALK_APP_KEY or DINGTALK_APP_SECRET',
      );
    }

    const url = new URL('https://oapi.dingtalk.com/gettoken');
    url.searchParams.set('appkey', appKey);
    url.searchParams.set('appsecret', appSecret);

    const response = await fetch(url, { method: 'GET' });
    const payload = (await response.json()) as {
      access_token?: string;
      errmsg?: string;
      errcode?: number;
    };

    if (!response.ok || !payload.access_token) {
      throw new InternalServerErrorException(
        `Failed to get DingTalk access token: ${payload.errmsg || response.statusText}`,
      );
    }

    return payload.access_token;
  }

  private async getUserIdentityByCode(
    accessToken: string,
    authCode: string,
  ): Promise<DingtalkUserIdentity> {
    const response = await fetch(
      `https://oapi.dingtalk.com/topapi/v2/user/getuserinfo?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode }),
      },
    );

    const payload = (await response.json()) as {
      errcode?: number;
      errmsg?: string;
      result?: DingtalkUserIdentity;
    };

    if (!response.ok || payload.errcode !== 0 || !payload.result?.userid) {
      throw new InternalServerErrorException(
        `Failed to exchange DingTalk auth code: ${payload.errmsg || response.statusText}`,
      );
    }

    return payload.result;
  }

  private async getUserProfile(
    accessToken: string,
    userId: string,
  ): Promise<DingtalkUser> {
    const response = await fetch(
      `https://oapi.dingtalk.com/topapi/v2/user/get?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: userId }),
      },
    );

    const payload = (await response.json()) as {
      errcode?: number;
      errmsg?: string;
      result?: DingtalkUser;
    };

    if (!response.ok || payload.errcode !== 0 || !payload.result) {
      throw new InternalServerErrorException(
        `Failed to get DingTalk user profile: ${payload.errmsg || response.statusText}`,
      );
    }

    return payload.result;
  }

  private async getDepartmentChildren(
    accessToken: string,
    deptId: number,
  ): Promise<DingtalkDepartment[]> {
    const response = await fetch(
      `https://oapi.dingtalk.com/topapi/v2/department/listsub?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept_id: deptId }),
      },
    );

    const payload = (await response.json()) as {
      errcode?: number;
      errmsg?: string;
      result?: DingtalkDepartment[];
    };

    if (!response.ok || payload.errcode !== 0) {
      throw new InternalServerErrorException(
        `Failed to fetch DingTalk departments: ${payload.errmsg || response.statusText}`,
      );
    }

    return payload.result || [];
  }

  private async getUsersByDepartment(
    accessToken: string,
    deptId: number,
  ): Promise<DingtalkUser[]> {
    const idResponse = await fetch(
      `https://oapi.dingtalk.com/topapi/user/listid?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dept_id: deptId }),
      },
    );

    const idPayload = (await idResponse.json()) as {
      errcode?: number;
      errmsg?: string;
      result?: { userid_list?: string[] };
    };

    if (!idResponse.ok || idPayload.errcode !== 0) {
      throw new InternalServerErrorException(
        `Failed to fetch department users: ${idPayload.errmsg || idResponse.statusText}`,
      );
    }

    const userIds = idPayload.result?.userid_list || [];
    const users = await Promise.all(
      userIds.map((userId) => this.getUserProfile(accessToken, userId)),
    );

    return users;
  }
}
