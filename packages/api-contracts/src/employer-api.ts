export const EMPLOYER_API_CONTRACT_ID = "employer-api" as const;
export const EMPLOYER_API_VERSION = "1.0.0" as const;
export const EMPLOYER_API_MAJOR_VERSION = 1 as const;

export const EMPLOYER_API_CONTRACT_PATH = "openapi/employer-api.v1.yaml" as const;

export const EMPLOYER_API_SUPPORTED_MAJOR_VERSIONS = [1] as const;

export interface ApiContractVersion {
  readonly contract_id: typeof EMPLOYER_API_CONTRACT_ID;
  readonly version: string;
  readonly major_version: number;
  readonly status: "current" | "supported" | "deprecated" | "sunset" | "retired";
  readonly openapi_path: string;
  readonly contract_hash: string;
  readonly deprecated_at: string | null;
  readonly sunset_at: string | null;
}

// Updated when the OpenAPI source changes. Tests assert this is
// present so releases can detect contract drift intentionally.
export const EMPLOYER_API_CONTRACT: ApiContractVersion = {
  contract_id: EMPLOYER_API_CONTRACT_ID,
  version: EMPLOYER_API_VERSION,
  major_version: EMPLOYER_API_MAJOR_VERSION,
  status: "current",
  openapi_path: EMPLOYER_API_CONTRACT_PATH,
  contract_hash: "f23-initial-contract",
  deprecated_at: null,
  sunset_at: null,
};

export const EMPLOYER_API_REQUIRED_HEADERS = {
  authorization: "Authorization",
  idempotencyKey: "Idempotency-Key",
  deprecation: "Deprecation",
  sunset: "Sunset",
} as const;

export const EMPLOYER_API_SCOPES = {
  reqRead: "employer.req.read",
  reqWrite: "employer.req.write",
  webhookRead: "employer.webhook.read",
  webhookWrite: "employer.webhook.write",
  credentialWrite: "employer.credential.write",
} as const;
