import { Role } from '../users/role.enum';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

/** What guards attach to the request as `req.user`. */
export interface AuthUser {
  id: string;
  role: Role;
}
