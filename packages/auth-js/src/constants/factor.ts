export enum FACTOR_LIST {
  TOTP = "TOTP",
  PHONE_NUMBER = "PHONE_NUMBER",
}

export enum FACTOR_STATUS {
  VERIFIED = "VERIFIED",
  UN_VERIFIED = "UN_VERIFIED",
}

export type FactorListType = keyof typeof FACTOR_LIST;
export type FactorStatusType = keyof typeof FACTOR_STATUS;
