import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { axios } from '../axios';
import { registerRoute } from '../utils';
import { z } from '../zod';
import { signinSchema } from './signin';
import { signupPasswordSchema } from './types';
import type { IUserMeVo } from './user-me';
import { userMeVoSchema } from './user-me';

export const SIGN_UP = '/auth/signup';

export const refMetaSchema = z.object({
  query: z.string().optional(),
  referer: z.string().optional(),
});

export type IRefMeta = z.infer<typeof refMetaSchema>;

export const signupSchema = signinSchema.merge(
  z.object({
    accountName: z
      .string()
      .min(3)
      .max(30)
      .regex(
        /^[a-z0-9_-]+$/,
        'Account name can only contain lowercase letters, numbers, hyphens and underscores'
      )
      .optional(),
    email: z.string().email().toLowerCase().optional(),
    defaultSpaceName: z.string().optional(),
    refMeta: refMetaSchema.optional(),
    password: signupPasswordSchema,
    verification: z
      .object({
        code: z.string(),
        token: z.string(),
      })
      .optional(),
    inviteCode: z.string().optional(),
    turnstileToken: z.string().optional(),
  })
);

export type ISignup = z.infer<typeof signupSchema>;

export const SignupRoute: RouteConfig = registerRoute({
  method: 'post',
  path: SIGN_UP,
  description: 'Sign up',
  request: {
    body: {
      content: {
        'application/json': {
          schema: signupSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Sign up and sing in successfully',
      content: {
        'application/json': {
          schema: userMeVoSchema,
        },
      },
    },
  },
  tags: ['auth'],
});

export const signup = async (body: ISignup) => {
  return axios.post<IUserMeVo>(SIGN_UP, body);
};
