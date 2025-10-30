import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute } from '../utils';
import { z } from '../zod';

export const CHANGE_ACCOUNT_NAME = '/auth/account-name';

export const changeAccountNameRoSchema = z.object({
  accountName: z.string().min(3).max(50),
  password: z.string(),
});

export type IChangeAccountNameRo = z.infer<typeof changeAccountNameRoSchema>;

export const changeAccountNameRoute: RouteConfig = registerRoute({
  method: 'patch',
  path: CHANGE_ACCOUNT_NAME,
  description: 'Change account name',
  request: {
    body: {
      content: {
        'application/json': {
          schema: changeAccountNameRoSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Change account name successfully',
    },
  },
  tags: ['auth'],
});

export const changeAccountName = async (ro: IChangeAccountNameRo) => {
  return axios.patch<void>(CHANGE_ACCOUNT_NAME, ro);
};
