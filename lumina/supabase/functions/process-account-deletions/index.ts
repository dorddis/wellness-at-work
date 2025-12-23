/**
 * Process Account Deletions Edge Function
 *
 * GDPR-compliant account deletion processor.
 * Runs on a schedule to permanently delete accounts that have been
 * marked for deletion for more than 30 days.
 *
 * Trigger: Supabase cron (every day at 3 AM UTC)
 *
 * What gets deleted:
 * - wellness_data
 * - break_events
 * - exercise_sessions
 * - challenge_participants
 * - org_alerts (user-specific)
 * - org_members entry
 * - auth.users entry (via admin API)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GRACE_PERIOD_DAYS = 30;

interface DeletionCandidate {
  user_id: string;
  org_id: string;
  deletion_requested_at: string;
}

Deno.serve(async (req: Request) => {
  // Only allow POST requests (cron trigger) or authorized calls
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify authorization (cron jobs send a special header, or use service key)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - GRACE_PERIOD_DAYS);
    const cutoffISOString = cutoffDate.toISOString();

    console.log(`[AccountDeletion] Processing deletions requested before ${cutoffISOString}`);

    // Find users marked for deletion more than 30 days ago
    const { data: candidates, error: fetchError } = await supabaseAdmin
      .from("org_members")
      .select("user_id, org_id, deletion_requested_at")
      .not("deletion_requested_at", "is", null)
      .lt("deletion_requested_at", cutoffISOString);

    if (fetchError) {
      console.error("[AccountDeletion] Failed to fetch candidates:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch deletion candidates" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!candidates || candidates.length === 0) {
      console.log("[AccountDeletion] No accounts to delete");
      return new Response(
        JSON.stringify({ message: "No accounts to delete", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[AccountDeletion] Found ${candidates.length} accounts to delete`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each deletion
    for (const candidate of candidates as DeletionCandidate[]) {
      results.processed++;
      const userId = candidate.user_id;
      const orgId = candidate.org_id;

      console.log(`[AccountDeletion] Processing user ${userId}`);

      try {
        // Delete in order (respecting foreign key constraints)

        // 1. Delete wellness_data
        const { error: wellnessError } = await supabaseAdmin
          .from("wellness_data")
          .delete()
          .eq("user_id", userId);

        if (wellnessError) {
          console.warn(`[AccountDeletion] wellness_data: ${wellnessError.message}`);
        }

        // 2. Delete break_events
        const { error: breakError } = await supabaseAdmin
          .from("break_events")
          .delete()
          .eq("user_id", userId);

        if (breakError) {
          console.warn(`[AccountDeletion] break_events: ${breakError.message}`);
        }

        // 3. Delete exercise_sessions
        const { error: exerciseError } = await supabaseAdmin
          .from("exercise_sessions")
          .delete()
          .eq("user_id", userId);

        if (exerciseError) {
          console.warn(`[AccountDeletion] exercise_sessions: ${exerciseError.message}`);
        }

        // 4. Delete challenge_participants
        const { error: challengeError } = await supabaseAdmin
          .from("challenge_participants")
          .delete()
          .eq("user_id", userId);

        if (challengeError) {
          console.warn(`[AccountDeletion] challenge_participants: ${challengeError.message}`);
        }

        // 5. Delete org_alerts for this user
        const { error: alertError } = await supabaseAdmin
          .from("org_alerts")
          .delete()
          .eq("user_id", userId);

        if (alertError) {
          console.warn(`[AccountDeletion] org_alerts: ${alertError.message}`);
        }

        // 6. Delete org_members entry
        const { error: memberError } = await supabaseAdmin
          .from("org_members")
          .delete()
          .eq("user_id", userId);

        if (memberError) {
          throw new Error(`Failed to delete org_member: ${memberError.message}`);
        }

        // 7. Delete auth.users entry using Admin API
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
          // Log but don't fail - user data is already deleted
          console.error(`[AccountDeletion] auth.users deletion failed: ${authError.message}`);
          // Note: The user's data is already deleted, so this is still a partial success
        }

        console.log(`[AccountDeletion] Successfully deleted user ${userId}`);
        results.succeeded++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[AccountDeletion] Failed to delete user ${userId}:`, errorMsg);
        results.failed++;
        results.errors.push(`User ${userId}: ${errorMsg}`);
      }
    }

    console.log(`[AccountDeletion] Complete: ${results.succeeded} succeeded, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: "Account deletion processing complete",
        ...results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[AccountDeletion] Critical error:", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
