import { API_URL } from "../data/global";
import {
  HiAcademicCap,
  HiBookOpen,
  HiDocumentText,
  HiGlobe,
  HiIdentification,
  HiLink,
  HiOfficeBuilding,
  HiUserAdd,
} from "react-icons/hi";
import { FaChalkboardTeacher, FaGraduationCap } from "react-icons/fa";
import { type IconType } from "react-icons";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export const ACADEMIC_STATUS_CONFIG = [
  {
    key: "open_to_collaboration" as const,
    label: "Open to Collaborations",
    icon: HiLink,
  },
  {
    key: "seeking_phd_students" as const,
    label: "Seeking PhD Students",
    icon: FaGraduationCap,
  },
  {
    key: "accepting_interns" as const,
    label: "Accepting Interns",
    icon: FaChalkboardTeacher,
  },
  {
    key: "looking_for_postdocs" as const,
    label: "Looking for Postdocs",
    icon: HiUserAdd,
  },
  {
    key: "available_for_mentorship" as const,
    label: "Available for Mentorship",
    icon: HiIdentification,
  },
];

export type AcademicStatusKey = (typeof ACADEMIC_STATUS_CONFIG)[number]["key"];

export const RESEARCH_CATEGORY_ICONS: Record<string, IconType> = {
  "Artificial Intelligence": HiBookOpen,
  "Machine Learning": HiAcademicCap,
  "Computer Vision": HiGlobe,
  "Natural Language Processing": HiDocumentText,
  "Deep Learning": HiBookOpen,
  "Reinforcement Learning": HiAcademicCap,
  Robotics: HiOfficeBuilding,
};

export type ResearcherProfile = {
  id: string;
  cognito_id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  title?: string;
  institution?: string;
  department?: string;
  bio?: string;
  phone?: string;
  linkedin_url?: string;
  google_scholar_url?: string;
  orcid_id?: string;
  research_gate_url?: string;
  personal_website?: string;
  twitter_handle?: string;
  resume_url?: string;
  /** 'public' = visible in list; 'private' = hidden; later: 'verified', 'premium' */
  status?: string;

  current_projects?: {
    title?: string;
    description?: string;
    status?: string;
  }[];

  academic_status?: {
    open_to_collaboration?: boolean;
    seeking_phd_students?: boolean;
    accepting_interns?: boolean;
    looking_for_postdocs?: boolean;
    available_for_mentorship?: boolean;
  };

  research_interests?: string[];

  education?: {
    degree?: string;
    institution?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    expected?: boolean;
    description?: string;
  }[];

  experience?: {
    title?: string;
    company?: string;
    location?: string;
    employment_type?: string;
    start_date?: string;
    end_date?: string;
    current?: boolean;
    description?: string;
  }[];

  grants?: {
    title?: string;
    funding_agency?: string;
    link?: string;
    amount?: number;
    year?: number;
    status?: string;
  }[];
  publications?: unknown[];
};

export const RESEARCHER_DEFAULT_VALUES: ResearcherProfile = {
  id: "",
  cognito_id: "",
  email: "",
  first_name: "",
  last_name: "",
  profile_image_url: "",
  title: "",
  institution: "",
  department: "",
  bio: "",
  phone: "",
  linkedin_url: "",
  google_scholar_url: "",
  orcid_id: "",
  research_gate_url: "",
  personal_website: "",
  twitter_handle: "",
  resume_url: "",
  current_projects: [],
  academic_status: {
    open_to_collaboration: false,
    seeking_phd_students: false,
    accepting_interns: false,
    looking_for_postdocs: false,
    available_for_mentorship: false,
  },
  research_interests: [],
  education: [],
  experience: [],
  grants: [],
  publications: [],
  status: "public",
};

function trimId(id: string | null | undefined): string {
  if (id == null || typeof id !== "string") return "";
  return id.trim();
}

export function useProfileStore(
  id: string | null | undefined,
  getToken?: () => Promise<string | null>
) {
  const idStr = trimId(id);
  return useQuery({
    queryKey: ["profile", idStr, !!getToken],
    queryFn: async () => {
      if (!idStr) throw new Error("Profile id required");
      const headers: Record<string, string> = {};
      if (getToken) {
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const { data } = await axios.get(`${API_URL}/users/${idStr}`, {
        headers,
      });
      const normalized: ResearcherProfile = {
        ...RESEARCHER_DEFAULT_VALUES,
        ...data,
        research_interests: data.research_interests ?? [],
        education: data.education ?? [],
        experience: data.experience ?? [],
        grants: data.grants ?? [],
        publications: data.publications ?? [],
        current_projects: data.current_projects ?? [],
        academic_status: {
          ...RESEARCHER_DEFAULT_VALUES.academic_status,
          ...(data.academic_status ?? {}),
        },
      };
      return normalized;
    },
    enabled: !!idStr,
    staleTime: 60 * 1000,
  });
}

/** Vector-based suggested grant ids for the logged-in user (Cognito sub). */
export function useMatchingGrants(id: string | undefined, topK: number = 20) {
  const idStr = trimId(id);
  const clampedTopK = Math.max(1, Math.min(100, topK));
  return useQuery({
    queryKey: ["matching_grants", idStr, clampedTopK],
    queryFn: async (): Promise<string[]> => {
      if (!idStr) return [];
      const { data } = await axios.get<unknown>(
        `${API_URL}/matching_grants/${idStr}?top_k=${clampedTopK}`
      );
      if (!Array.isArray(data)) return [];
      return data.map((x) => String(x));
    },
    enabled: !!idStr,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
