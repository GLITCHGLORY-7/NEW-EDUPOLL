const { supabase } = require('../database/db');
const { mapPoll } = require('../utils/mappers');

/**
 * Performs database cleanup:
 * 1. Deletes expired messages (expires_at < NOW())
 * 2. Deletes expired announcements/notifications (expires_at < NOW())
 * 3. Deletes expired stored reports (expires_at < NOW())
 * 4. Moves expired polls to 'archived' status (15 days after expiresAt/deadline or 15 days after closed)
 */
async function performCleanup() {
  console.log('[CLEANUP] Starting daily database storage cleanup...');
  const nowStr = new Date().toISOString();
  const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;

  try {
    // 1. Delete expired messages
    const { data: deletedMsgs, error: msgErr } = await supabase
      .from('messages')
      .delete()
      .lt('expires_at', nowStr)
      .select('id');
    if (msgErr) console.error('[CLEANUP] Error deleting messages:', msgErr);
    else console.log(`[CLEANUP] Deleted ${deletedMsgs?.length || 0} expired messages.`);

    // 2. Delete expired announcements (notifications)
    const { data: deletedAnns, error: annErr } = await supabase
      .from('announcements')
      .delete()
      .lt('expires_at', nowStr)
      .select('id');
    if (annErr) console.error('[CLEANUP] Error deleting announcements:', annErr);
    else console.log(`[CLEANUP] Deleted ${deletedAnns?.length || 0} expired announcements.`);

    // 3. Delete expired saved reports
    const { data: deletedReps, error: repErr } = await supabase
      .from('saved_reports')
      .delete()
      .lt('expires_at', nowStr)
      .select('id');
    if (repErr) console.error('[CLEANUP] Error deleting saved reports:', repErr);
    else console.log(`[CLEANUP] Deleted ${deletedReps?.length || 0} expired saved reports.`);

    // 4. Archive expired polls
    const { data: polls, error: pollErr } = await supabase
      .from('polls')
      .select('*')
      .neq('status', 'archived');

    if (pollErr) {
      console.error('[CLEANUP] Error fetching polls for archive check:', pollErr);
    } else if (polls && polls.length > 0) {
      let archivedCount = 0;
      for (const p of polls) {
        const mapped = mapPoll(p);
        let shouldArchive = false;

        if (mapped.expiresAt) {
          // If poll has an expiration date, archive it 15 days after it expires
          const expiryTime = new Date(mapped.expiresAt).getTime();
          if (Date.now() - expiryTime > FIFTEEN_DAYS) {
            shouldArchive = true;
          }
        } else if (p.status === 'closed') {
          // If manually closed, archive it 15 days after updated_at (closure date)
          const closedTime = new Date(p.updated_at || p.created_at).getTime();
          if (Date.now() - closedTime > FIFTEEN_DAYS) {
            shouldArchive = true;
          }
        }

        if (shouldArchive) {
          const { error: updateErr } = await supabase
            .from('polls')
            .update({ status: 'archived', updated_at: nowStr })
            .eq('id', p.id);
          
          if (updateErr) {
            console.error(`[CLEANUP] Failed to archive poll ${p.id}:`, updateErr);
          } else {
            archivedCount++;
          }
        }
      }
      console.log(`[CLEANUP] Moved ${archivedCount} expired polls to archive status.`);
    }

    console.log('[CLEANUP] Database cleanup process completed.');
    return {
      success: true,
      deletedMessagesCount: deletedMsgs?.length || 0,
      deletedAnnouncementsCount: deletedAnns?.length || 0,
      deletedReportsCount: deletedReps?.length || 0
    };
  } catch (err) {
    console.error('[CLEANUP] Critical error during cleanup:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Starts the daily scheduler to run cleanup once every 24 hours
 */
function startCleanupScheduler() {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  // Run once every 24 hours
  setInterval(async () => {
    try {
      await performCleanup();
    } catch (err) {
      console.error('[CLEANUP SCHEDULER] Error running daily cleanup:', err);
    }
  }, ONE_DAY);

  // Run cleanup once on startup after a short delay
  setTimeout(() => {
    performCleanup().catch(err => console.error('[CLEANUP INIT] Failed startup cleanup:', err));
  }, 10000);
}

module.exports = {
  performCleanup,
  startCleanupScheduler
};
