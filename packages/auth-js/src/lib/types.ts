import { FACTOR_STATUS, FactorListType } from "../constants/factor";
import { Factor } from "../types/type";

export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  headers?: {
    [key: string]: string;
  };
};

export interface AuthRequestOptions extends RequestOptions {
  jwt?: string;
  redirectTo?: string;
  body?: object;
  query?: { [key: string]: string };

  /**
   * Transform request response from AuthJS into a suitable format
   * If not provided, the response will be returned as-is.
   */
  responseFormat?: (data: any) => any;
}

export type User = {
  id: string;
  created_at: string;
  email?: string;
  new_email?: string;
  role?: string;
  factors?: (
    | Factor<FactorListType, FACTOR_STATUS.VERIFIED>
    | Factor<FactorListType, FACTOR_STATUS.UN_VERIFIED>
  )[];
  updated_at?: string;
  deleted_at?: string;
  recovery_sent_at?: string;
  email_confirmed_at?: string;
  is_anonymous?: boolean;
};
