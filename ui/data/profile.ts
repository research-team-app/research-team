import type { Collaborator } from "../store/useCollaborator";
import { ACADEMIC_STATUS_CONFIG } from "@/store/useProfileStore";

export interface FilterOptions {
  searchQuery: string;
  openToCollaboration: boolean;
  seekingPhd: boolean;
  acceptingInterns: boolean;
  lookingForPostdocs: boolean;
  availableForMentorship: boolean;
}

export function getCollaboratorStatus(collaborator: Collaborator) {
  const activeStatuses = ACADEMIC_STATUS_CONFIG.filter((option) => {
    const statusMap: Record<string, boolean | null> = {
      openToCollaboration:
        collaborator.academic_status?.open_to_collaboration ?? false,
      seekingPhd: collaborator.academic_status?.seeking_phd_students ?? false,
      acceptingInterns:
        collaborator.academic_status?.accepting_interns ?? false,
      lookingForPostdocs:
        collaborator.academic_status?.looking_for_postdocs ?? false,
      availableForMentorship:
        collaborator.academic_status?.available_for_mentorship ?? false,
    };
    return statusMap[option.key];
  });
  return activeStatuses;
}
