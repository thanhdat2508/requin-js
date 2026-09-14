export const ensureTrailingSlash = (url: string): string => {
  return url.endsWith("/") ? url : url + "/";
};

export const validateRequinUrl = (requinUrl: string) => {
  const trimUrl = requinUrl.trim();

  if (!trimUrl) {
    throw new Error("RequinCloudURL is required.");
  }

  if (!trimUrl.match(/^https?:\/\//i)) {
    throw new Error(
      "Invalid RequinCloudURL: Must be a valid HTTP or HTTPS URL.",
    );
  }

  try {
    return new URL(ensureTrailingSlash(trimUrl));
  } catch (error) {
    throw Error("Invalid RequinCloudURL: Provided URL is malformed.");
  }
};

const warnedKeySubtypes = new Set<string>();
const KNOWN_KEY_SUBTYPES = new Set([
  "production",
  "service_role",
  "anon",
  "dev",
  "staging",
  "publishable",
  "secret",
]);

export const checkApiKeyFormat = (key: string): void => {
  if (!key.startsWith("rq_")) {
    return;
  }

  const subtype = key.match(/^rq_([a-zA-Z0-9]+)_/)?.[1] ?? "unknown";

  if (KNOWN_KEY_SUBTYPES.has(subtype) || warnedKeySubtypes.has(subtype)) {
    return;
  }

  warnedKeySubtypes.add(subtype);

  console.warn(
    `Unrecognized Requin API key format ${subtype}. The client will proceed and send this key as-is; if you see authentication errors you may need to upgrade @requin/requin-js to a version that recognizes this key type.`,
  );
};
