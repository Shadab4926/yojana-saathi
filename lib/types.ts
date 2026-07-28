export interface SchemeQuery {
  state: string;
  age?: number;
  occupation: string;
  gender?: "male" | "female" | "other";
  incomeBracket?: string;
  category?: string; // e.g. "farmer", "student", "senior citizen", "disabled", "women", "general"
  rawTranscript?: string;
  language: string; // BCP-47 e.g. hi-IN
}

export interface SchemeResult {
  nameNative: string;
  nameEnglish: string;
  benefits: string;
  eligibility: string;
  applicationProcess: string;
  requiredDocuments: string[];
  officialLink: string;
  sourceSnippetUrl: string;
  sourceDomain: string;
  lastVerified: string; // ISO date string, from cache metadata
}

export interface SearchSchemesResponse {
  query: SchemeQuery;
  schemes: SchemeResult[];
  fromCache: boolean;
  searchedAt: string;
  warnings?: string[];
}

export interface JobQuery {
  state: string;
  qualification: string; // e.g. "10th pass", "graduate", "engineering"
  category?: string; // e.g. "banking", "railways", "SSC", "state PSC", "any"
  rawTranscript?: string;
  language: string;
}

export interface JobResult {
  postNameNative: string;
  postNameEnglish: string;
  organization: string;
  totalVacancies: string;
  eligibility: string;
  applicationStartDate: string;
  applicationEndDate: string;
  examDate: string;
  applicationFee: string;
  notificationLink: string;
  applicationPortalLink: string;
  sourceSnippetUrl: string;
  sourceDomain: string;
  lastVerified: string;
}

export interface SearchJobsResponse {
  query: JobQuery;
  jobs: JobResult[];
  fromCache: boolean;
  searchedAt: string;
  warnings?: string[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}
