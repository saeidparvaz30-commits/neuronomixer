-- C3-C5: engagement lookups by postSlug and notifications by userId
CREATE INDEX "ReadingHistory_postSlug_idx" ON "ReadingHistory"("postSlug");
CREATE INDEX "Like_postSlug_idx" ON "Like"("postSlug");
CREATE INDEX "Bookmark_postSlug_idx" ON "Bookmark"("postSlug");
CREATE INDEX "Comment_postSlug_idx" ON "Comment"("postSlug");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
