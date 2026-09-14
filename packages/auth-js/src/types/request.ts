import { AuthError } from "../error/auth-error";

// Creating narrowing for factor type
// This will help to narrow the type of factor based on the factor type
// For example:
export type RequestResult<T, ErrorType extends Error = AuthError> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: Error extends AuthError ? AuthError : ErrorType;
    };
