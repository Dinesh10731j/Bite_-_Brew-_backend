import { AuthController } from '../../../src/controller/auth/auth.controller';

describe('AuthController cookie options', () => {
  it('uses cross-site cookie settings for secure HTTPS requests', () => {
    const options = AuthController.getAuthCookieOptions({
      secure: true,
      headers: {},
    } as any);

    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
  });

  it('keeps local cookies less strict for non-secure requests', () => {
    const options = AuthController.getAuthCookieOptions({
      secure: false,
      headers: {},
    } as any);

    expect(options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });
  });
});
