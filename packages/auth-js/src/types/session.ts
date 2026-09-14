import { User } from "../lib/types";

export type Session = {
  provider_token?: string;
  provider_refresh_token?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type: "bearer";
  user: User;
};
