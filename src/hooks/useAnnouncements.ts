import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Announcement {
  id: string;
  title: string | null;
  message: string;
  status: "active" | "closed";
  target_mode: "all" | "users";
  created_at: string;
  created_by: string;
}

export interface AnnouncementTarget {
  id: string;
  announcement_id: string;
  user_id: string;
  created_at: string;
}

export interface AnnouncementAck {
  id: string;
  announcement_id: string;
  user_id: string;
  acked_at: string;
  profiles?: {
    name: string | null;
    email: string | null;
  };
}

export interface AnnouncementStats {
  total_targets: number;
  acked_count: number;
  pending_count: number;
}

// Hook for admin to manage announcements
export function useAnnouncementsAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all announcements
  const { data: announcements = [], isLoading: loadingAnnouncements, refetch } = useQuery({
    queryKey: ["announcements-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
  });

  // Fetch acks for a specific announcement
  const fetchAcks = async (announcementId: string): Promise<AnnouncementAck[]> => {
    const { data: acks, error: acksError } = await supabase
      .from("announcement_ack")
      .select("*")
      .eq("announcement_id", announcementId)
      .order("acked_at", { ascending: false });

    if (acksError) throw acksError;

    if (!acks || acks.length === 0) return [];

    // Get profiles for these users
    const userIds = acks.map(a => a.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", userIds);

    return acks.map(ack => ({
      ...ack,
      profiles: profiles?.find(p => p.user_id === ack.user_id) || null,
    })) as AnnouncementAck[];
  };

  // Fetch stats for an announcement
  const fetchStats = async (announcement: Announcement): Promise<AnnouncementStats> => {
    // Get ack count
    const { count: ackedCount } = await supabase
      .from("announcement_ack")
      .select("*", { count: "exact", head: true })
      .eq("announcement_id", announcement.id);

    let totalTargets = 0;

    if (announcement.target_mode === "all") {
      // Count all users
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      totalTargets = count || 0;
    } else {
      // Count specific targets
      const { count } = await supabase
        .from("announcement_targets")
        .select("*", { count: "exact", head: true })
        .eq("announcement_id", announcement.id);
      totalTargets = count || 0;
    }

    return {
      total_targets: totalTargets,
      acked_count: ackedCount || 0,
      pending_count: totalTargets - (ackedCount || 0),
    };
  };

  // Fetch targets for a specific announcement
  const fetchTargets = async (announcementId: string): Promise<AnnouncementTarget[]> => {
    const { data, error } = await supabase
      .from("announcement_targets")
      .select("*")
      .eq("announcement_id", announcementId);

    if (error) throw error;
    return data as AnnouncementTarget[];
  };

  // Create announcement mutation
  const createAnnouncement = useMutation({
    mutationFn: async ({
      title,
      message,
      targetMode,
      targetUserIds,
    }: {
      title?: string;
      message: string;
      targetMode: "all" | "users";
      targetUserIds?: string[];
    }) => {
      if (!user) throw new Error("Não autenticado");

      // Create the announcement
      const { data: announcement, error: announcementError } = await supabase
        .from("announcements")
        .insert({
          title: title || null,
          message,
          target_mode: targetMode,
          created_by: user.id,
        })
        .select()
        .single();

      if (announcementError) throw announcementError;

      // If targeting specific users, create targets
      if (targetMode === "users" && targetUserIds && targetUserIds.length > 0) {
        const targets = targetUserIds.map(userId => ({
          announcement_id: announcement.id,
          user_id: userId,
        }));

        const { error: targetsError } = await supabase
          .from("announcement_targets")
          .insert(targets);

        if (targetsError) throw targetsError;
      }

      return announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-announcements"] });
    },
  });

  // Close announcement mutation
  const closeAnnouncement = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from("announcements")
        .update({ status: "closed" })
        .eq("id", announcementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements-admin"] });
      queryClient.invalidateQueries({ queryKey: ["user-announcements"] });
    },
  });

  // Duplicate announcement mutation
  const duplicateAnnouncement = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) throw new Error("Não autenticado");

      // Get original announcement
      const { data: original, error: fetchError } = await supabase
        .from("announcements")
        .select("*")
        .eq("id", announcementId)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate
      const { data: duplicate, error: createError } = await supabase
        .from("announcements")
        .insert({
          title: original.title,
          message: original.message,
          target_mode: original.target_mode,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // If original had targets, copy them
      if (original.target_mode === "users") {
        const { data: originalTargets } = await supabase
          .from("announcement_targets")
          .select("user_id")
          .eq("announcement_id", announcementId);

        if (originalTargets && originalTargets.length > 0) {
          const newTargets = originalTargets.map(t => ({
            announcement_id: duplicate.id,
            user_id: t.user_id,
          }));

          await supabase.from("announcement_targets").insert(newTargets);
        }
      }

      return duplicate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements-admin"] });
    },
  });

  // Realtime for announcements
  useEffect(() => {
    const channel = supabase
      .channel("announcements-admin-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["announcements-admin"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcement_ack",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["announcements-admin"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    announcements,
    loadingAnnouncements,
    refetch,
    fetchAcks,
    fetchStats,
    fetchTargets,
    createAnnouncement,
    closeAnnouncement,
    duplicateAnnouncement,
  };
}

// Hook for users to see their announcements
export function useUserAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get active announcements for this user (that haven't been acked)
  const { data: pendingAnnouncement, isLoading } = useQuery({
    queryKey: ["user-announcements", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get all active announcements
      const { data: announcements, error: announcementsError } = await supabase
        .from("announcements")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (announcementsError) throw announcementsError;
      if (!announcements || announcements.length === 0) return null;

      // Get user's acks
      const { data: acks } = await supabase
        .from("announcement_ack")
        .select("announcement_id")
        .eq("user_id", user.id);

      const ackedIds = new Set(acks?.map(a => a.announcement_id) || []);

      // Find the first unacked announcement that applies to this user
      for (const announcement of announcements) {
        if (ackedIds.has(announcement.id)) continue;

        if (announcement.target_mode === "all") {
          return announcement as Announcement;
        }

        // Check if user is in targets
        const { data: target } = await supabase
          .from("announcement_targets")
          .select("id")
          .eq("announcement_id", announcement.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (target) {
          return announcement as Announcement;
        }
      }

      return null;
    },
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Acknowledge announcement
  const ackAnnouncement = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("announcement_ack")
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
        });

      if (error && error.code !== "23505") throw error; // Ignore duplicate key error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-announcements"] });
    },
  });

  // Realtime for announcements changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("user-announcements-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-announcements"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    pendingAnnouncement,
    isLoading,
    ackAnnouncement,
  };
}
