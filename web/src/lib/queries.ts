/**
 * TanStack Query hooks for all API calls.
 *
 * Query keys are exported so mutation onSuccess handlers can perform
 * targeted cache invalidation.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "./ApiContext";
import type {
  CreateArtifactInput,
  CreateSeminarInput,
  CreateSeminarSessionInput,
  CreateTutorialInput,
  CreateTutorialSessionInput,
  Seminar,
  SeminarSession,
  Tutorial,
  TutorialSession,
  UpdateSeminarInput,
  UpdateTutorialInput,
} from "./types";

// ── Query Keys ─────────────────────────────────────────────────────────────────

export const queryKeys = {
  seminars: () => ["seminars"] as const,
  seminar: (id: string) => ["seminars", id] as const,
  seminarSessions: (seminarId: string) =>
    ["seminars", seminarId, "sessions"] as const,
  session: (id: string) => ["sessions", id] as const,
  tutorials: () => ["tutorials"] as const,
  tutorial: (id: string) => ["tutorials", id] as const,
  tutorialSessions: (tutorialId: string) =>
    ["tutorials", tutorialId, "sessions"] as const,
  tutorialSession: (id: string) => ["tutorial-sessions", id] as const,
  tutorialProblemSets: (tutorialId: string) =>
    ["tutorials", tutorialId, "problem-sets"] as const,
  sessionProblemSet: (sessionId: string) =>
    ["tutorial-sessions", sessionId, "problem-set"] as const,
  dashboard: () => ["dashboard"] as const,
};

// ── Dashboard ──────────────────────────────────────────────────────────────────

export interface DashboardSession {
  id: string;
  type: "seminar" | "tutorial";
  title: string;
  status: string;
  started_at: string;
  kind?: string;
  seminar_id?: string;
  tutorial_id?: string;
}

export function useDashboardSessions() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: async (): Promise<DashboardSession[]> => {
      const [seminars, tutorials] = await Promise.all([
        api.listSeminars(),
        api.listTutorials(),
      ]);

      const [seminarSessionsArrays, tutorialSessionsArrays] = await Promise.all(
        [
          Promise.all(
            seminars.map((s) =>
              api.listSessions(s.id).catch(() => [] as SeminarSession[]),
            ),
          ),
          Promise.all(
            tutorials.map((t) =>
              api
                .listTutorialSessions(t.id)
                .catch(() => [] as TutorialSession[]),
            ),
          ),
        ],
      );

      const seminarMap = new Map<string, Seminar>(
        seminars.map((s) => [s.id, s]),
      );
      const tutorialMap = new Map<string, Tutorial>(
        tutorials.map((t) => [t.id, t]),
      );

      const unifiedSeminarSessions: DashboardSession[] = seminarSessionsArrays
        .flat()
        .map((session) => {
          const seminar = seminarMap.get(session.seminar_id);
          return {
            id: session.id,
            type: "seminar" as const,
            title: seminar
              ? `${seminar.title} - ${session.section_label}`
              : session.section_label,
            status: session.status,
            started_at: session.started_at,
            seminar_id: session.seminar_id,
          };
        });

      const unifiedTutorialSessions: DashboardSession[] = tutorialSessionsArrays
        .flat()
        .map((session) => {
          const tutorial = tutorialMap.get(session.tutorial_id);
          return {
            id: session.id,
            type: "tutorial" as const,
            title: tutorial ? tutorial.title : "Tutorial Session",
            status: session.status,
            started_at: session.started_at,
            tutorial_id: session.tutorial_id,
            kind: session.kind,
          };
        });

      return [...unifiedSeminarSessions, ...unifiedTutorialSessions]
        .sort((a, b) => {
          const aIsActive = a.status === "in_progress";
          const bIsActive = b.status === "in_progress";
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          return (
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
          );
        })
        .slice(0, 5);
    },
  });
}

// ── Seminars ───────────────────────────────────────────────────────────────────

export function useListSeminars() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.seminars(),
    queryFn: () => api.listSeminars(),
  });
}

export function useSeminar(id: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.seminar(id!),
    queryFn: () => api.getSeminar(id!),
    enabled: !!id,
  });
}

export function useListSessions(seminarId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.seminarSessions(seminarId!),
    queryFn: () => api.listSessions(seminarId!),
    enabled: !!seminarId,
  });
}

export function useSession(id: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.session(id!),
    queryFn: () => api.getSession(id!),
    enabled: !!id,
  });
}

// ── Tutorials ──────────────────────────────────────────────────────────────────

export function useListTutorials() {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.tutorials(),
    queryFn: () => api.listTutorials(),
  });
}

export function useTutorial(id: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.tutorial(id!),
    queryFn: () => api.getTutorial(id!),
    enabled: !!id,
  });
}

export function useListTutorialSessions(tutorialId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.tutorialSessions(tutorialId!),
    queryFn: () => api.listTutorialSessions(tutorialId!),
    enabled: !!tutorialId,
  });
}

export function useTutorialSession(id: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.tutorialSession(id!),
    queryFn: () => api.getTutorialSession(id!),
    enabled: !!id,
  });
}

// ── Problem Sets ───────────────────────────────────────────────────────────────

export function useTutorialProblemSets(tutorialId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.tutorialProblemSets(tutorialId!),
    queryFn: () => api.listTutorialProblemSets(tutorialId!),
    enabled: !!tutorialId,
  });
}

// ── Mutations: Seminars ────────────────────────────────────────────────────────

export function useCreateSeminar() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSeminarInput) => api.createSeminar(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.seminars() });
    },
  });
}

export function useUpdateSeminar() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSeminarInput }) =>
      api.updateSeminar(id, input),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.seminars() });
      void qc.invalidateQueries({ queryKey: queryKeys.seminar(id) });
    },
  });
}

export function useDeleteSeminar() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSeminar(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.seminars() });
    },
  });
}

// ── Mutations: Sessions ────────────────────────────────────────────────────────

export function useCreateSession() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      seminarId,
      input,
    }: {
      seminarId: string;
      input: CreateSeminarSessionInput;
    }) => api.createSession(seminarId, input),
    onSuccess: (_, { seminarId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.seminarSessions(seminarId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useAbandonSession() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.abandonSession(id),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: queryKeys.session(data.id) });
      void qc.invalidateQueries({
        queryKey: queryKeys.seminarSessions(data.seminar_id),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useDeleteSession() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: string; seminarId: string }) =>
      api.deleteSession(sessionId),
    onSuccess: (_, { seminarId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.seminarSessions(seminarId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useSubmitResidue() {
  const api = useApi();
  return useMutation({
    mutationFn: ({
      sessionId,
      residueText,
    }: {
      sessionId: string;
      residueText: string;
    }) => api.submitResidue(sessionId, residueText),
  });
}

export function useSubmitTurn() {
  const api = useApi();
  return useMutation({
    mutationFn: ({
      sessionId,
      text,
      hasClaims,
    }: {
      sessionId: string;
      text: string;
      hasClaims?: boolean;
    }) => api.submitTurn(sessionId, text, hasClaims),
  });
}

// ── Mutations: Tutorials ───────────────────────────────────────────────────────

export function useCreateTutorial() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTutorialInput) => api.createTutorial(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tutorials() });
    },
  });
}

export function useUpdateTutorial() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTutorialInput }) =>
      api.updateTutorial(id, input),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.tutorials() });
      void qc.invalidateQueries({ queryKey: queryKeys.tutorial(id) });
    },
  });
}

export function useDeleteTutorial() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTutorial(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tutorials() });
    },
  });
}

// ── Mutations: Tutorial Sessions ───────────────────────────────────────────────

export function useCreateTutorialSession() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      tutorialId,
      input,
    }: {
      tutorialId: string;
      input?: CreateTutorialSessionInput;
    }) => api.createTutorialSession(tutorialId, input),
    onSuccess: (_, { tutorialId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.tutorialSessions(tutorialId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useCompleteTutorialSession() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, notes }: { sessionId: string; notes?: string }) =>
      api.completeTutorialSession(sessionId, notes),
    onSuccess: (data) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.tutorialSession(data.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.tutorialSessions(data.tutorial_id),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useAbandonTutorialSession() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => api.abandonTutorialSession(sessionId),
    onSuccess: (data) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.tutorialSession(data.id),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.tutorialSessions(data.tutorial_id),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useDeleteTutorialSession() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: string; tutorialId: string }) =>
      api.deleteTutorialSession(sessionId),
    onSuccess: (_, { tutorialId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.tutorialSessions(tutorialId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard() });
    },
  });
}

export function useSubmitTutorialTurn() {
  const api = useApi();
  return useMutation({
    mutationFn: ({ sessionId, text }: { sessionId: string; text: string }) =>
      api.submitTutorialTurn(sessionId, text),
  });
}

// ── Mutations: Artifacts ───────────────────────────────────────────────────────

export function useCreateArtifact() {
  const api = useApi();
  return useMutation({
    mutationFn: ({
      sessionId,
      input,
    }: {
      sessionId: string;
      input: CreateArtifactInput;
    }) => api.createArtifact(sessionId, input),
  });
}

export function useDeleteArtifact() {
  const api = useApi();
  return useMutation({
    mutationFn: ({
      sessionId,
      artifactId,
    }: {
      sessionId: string;
      artifactId: string;
    }) => api.deleteArtifact(sessionId, artifactId),
  });
}

export function useDeleteSessionProblemSet() {
  const api = useApi();
  return useMutation({
    mutationFn: (sessionId: string) => api.deleteSessionProblemSet(sessionId),
  });
}

// ── Mutations: Exports ─────────────────────────────────────────────────────────

export function useExport() {
  const api = useApi();
  return useMutation({
    mutationFn: ({
      resourceType,
      id,
      format,
    }: {
      resourceType:
        | "seminar"
        | "session"
        | "tutorial"
        | "tutorial_session"
        | "problem_set";
      id: string;
      format: "json" | "md";
    }): Promise<{ url: string }> => {
      switch (resourceType) {
        case "seminar":
          return api.exportSeminar(id, format);
        case "session":
          return api.exportSession(id, format);
        case "tutorial":
          return api.exportTutorial(id, format);
        case "tutorial_session":
          return api.exportTutorialSession(id, format);
        case "problem_set":
          return api.exportProblemSet(id, format);
      }
    },
  });
}
