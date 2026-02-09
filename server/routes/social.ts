import { Router } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db.js";
import { posts, postLikes, comments, schools, users } from "@shared/schema";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();

const createPostSchema = z.object({
  content: z.string().min(1),
  category: z.string().default("discussions"),
  visibility: z.enum(["public", "school", "class"]).default("public"),
  mediaUrl: z.string().optional(),
  mediaThumbnail: z.string().optional(),
  tags: z.array(z.string()).default([]),
  postedAsSchool: z.boolean().optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().optional(),
});

router.get("/posts", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(String(req.query.limit || "50"), 10), 100);

    const conditions = category ? [eq(posts.category, category)] : [];
    const baseQuery = db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        postedAsSchool: posts.postedAsSchool,
        content: posts.content,
        category: posts.category,
        visibility: posts.visibility,
        mediaUrl: posts.mediaUrl,
        mediaThumbnail: posts.mediaThumbnail,
        tags: posts.tags,
        likesCount: posts.likesCount,
        createdAt: posts.createdAt,
        authorName: users.name,
        authorRole: users.role,
        schoolName: schools.name,
        schoolLogoUrl: schools.logoUrl,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .leftJoin(schools, eq(posts.schoolId, schools.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    const rows = conditions.length
      ? await baseQuery.where(conditions[0])
      : await baseQuery;

    const postIds = rows.map((p) => p.id);
    const commentsList =
      postIds.length > 0
        ? await db.select().from(comments).where(inArray(comments.postId, postIds))
        : [];
    const commentsByPost: Record<string, typeof commentsList> = {};
    for (const c of commentsList) {
      if (!commentsByPost[c.postId]) commentsByPost[c.postId] = [];
      commentsByPost[c.postId].push(c);
    }

    const authorIds = [...new Set(commentsList.map((c) => c.authorId))];
    const authors =
      authorIds.length > 0
        ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, authorIds))
        : [];
    const authorMap = Object.fromEntries(authors.map((a) => [a.id, a.name]));
    const result = rows.map((p) => {
      const asSchool = !!(p as any).postedAsSchool;
      return {
      ...p,
      authorDisplayName: asSchool ? (p as any).schoolName ?? "School" : (p as any).authorName ?? "User",
      authorLogoUrl: asSchool ? (p as any).schoolLogoUrl ?? null : null,
      comments: (commentsByPost[p.id] || []).map((c) => ({
        id: c.id,
        authorId: c.authorId,
        authorName: authorMap[c.authorId] ?? "User",
        content: c.content,
        createdAt: c.createdAt,
        timestamp: c.createdAt,
      })),
    };
    });

    return res.json({
      posts: result,
      nextCursor: null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch posts" });
  }
});

router.post("/posts", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = createPostSchema.parse(req.body);
    const schoolId = req.user!.schoolId ?? null;
    const wantsSchoolAuthor = !!body.postedAsSchool;
    const canPostAsSchool = (req.user!.role === "admin" || req.user!.role === "employee") && !!schoolId;
    const postedAsSchool = wantsSchoolAuthor && canPostAsSchool;

    const [post] = await db
      .insert(posts)
      .values({
        authorId: req.user!.id,
        postedAsSchool,
        content: body.content,
        category: body.category,
        visibility: body.visibility,
        mediaUrl: body.mediaUrl,
        mediaThumbnail: body.mediaThumbnail,
        tags: body.tags,
        schoolId,
      })
      .returning();
    if (!post) throw new Error("Insert failed");
    const [author] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    const [school] = schoolId ? await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1) : [null as any];
    return res.status(201).json({
      ...post,
      authorName: author?.name ?? req.user!.name,
      authorRole: author?.role ?? req.user!.role,
      authorDisplayName: postedAsSchool ? school?.name ?? "School" : author?.name ?? req.user!.name,
      authorLogoUrl: postedAsSchool ? school?.logoUrl ?? null : null,
      comments: [],
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: e.errors });
    }
    console.error(e);
    return res.status(500).json({ message: "Failed to create post" });
  }
});

router.post("/posts/:id/like", requireAuth, async (req: AuthRequest, res) => {
  const postId = req.params.id;
  const userId = req.user!.id;
  try {
    const [existing] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);
    if (existing) {
      await db.delete(postLikes).where(eq(postLikes.id, existing.id));
      await db
        .update(posts)
        .set({ likesCount: sql`GREATEST(0, ${posts.likesCount} - 1)` })
        .where(eq(posts.id, postId));
      return res.json({ liked: false });
    }
    await db.insert(postLikes).values({ postId, userId });
    await db
      .update(posts)
      .set({ likesCount: sql`${posts.likesCount} + 1` })
      .where(eq(posts.id, postId));
    return res.json({ liked: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to toggle like" });
  }
});

router.post("/posts/:id/comments", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = createCommentSchema.parse(req.body);
    const [comment] = await db
      .insert(comments)
      .values({
        postId: req.params.id,
        authorId: req.user!.id,
        content: body.content,
        parentId: body.parentId ?? null,
      })
      .returning();
    if (!comment) throw new Error("Insert failed");
    return res.status(201).json({
      ...comment,
      authorName: req.user!.name,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input" });
    }
    return res.status(500).json({ message: "Failed to add comment" });
  }
});

export default router;
