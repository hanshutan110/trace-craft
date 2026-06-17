import { Router, type Request, type Response } from 'express';
import { errorPayload, requireAuth, successPayload } from './common';
import {
  addComment,
  createPost,
  getPost,
  listComments,
  listNotifications,
  listPosts,
  markNotificationsRead,
  toggleFollow,
  togglePostLike,
} from '../services/communityService';

const router = Router();

router.get('/community/posts', requireAuth, async (req: Request, res: Response) => {
  try {
    const tab = typeof req.query.tab === 'string' ? req.query.tab : 'recommend';
    const posts = await listPosts(req.userId!, tab);
    res.json(successPayload({ posts }));
  } catch (err) {
    console.error('[community:posts:list]', err);
    res.status(500).json(errorPayload('list community posts failed', 'community_posts_failed', 500));
  }
});

router.post('/community/posts', requireAuth, async (req: Request, res: Response) => {
  try {
    const post = await createPost(req.userId!, req.body || {});
    res.json(successPayload({ post }));
  } catch (err) {
    console.error('[community:posts:create]', err);
    res.status(500).json(errorPayload('create community post failed', 'community_post_create_failed', 500));
  }
});

router.get('/community/posts/:postId', requireAuth, async (req: Request, res: Response) => {
  try {
    const post = await getPost(req.userId!, String(req.params.postId));
    if (!post) {
      return res.status(404).json(errorPayload('post not found', 'post_not_found', 404));
    }
    const comments = await listComments(post.id);
    return res.json(successPayload({ post, comments }));
  } catch (err) {
    console.error('[community:posts:get]', err);
    return res.status(500).json(errorPayload('get community post failed', 'community_post_failed', 500));
  }
});

router.post('/community/posts/:postId/comments', requireAuth, async (req: Request, res: Response) => {
  try {
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    if (!content) {
      return res.status(400).json(errorPayload('comment content required', 'comment_required', 400));
    }
    const comment = await addComment(req.userId!, String(req.params.postId), content);
    return res.json(successPayload({ comment }));
  } catch (err) {
    console.error('[community:comments:add]', err);
    return res.status(500).json(errorPayload('add comment failed', 'comment_add_failed', 500));
  }
});

router.post('/community/posts/:postId/like', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await togglePostLike(req.userId!, String(req.params.postId));
    res.json(successPayload(result));
  } catch (err) {
    console.error('[community:like]', err);
    res.status(500).json(errorPayload('toggle like failed', 'like_failed', 500));
  }
});

router.post('/community/follows/:followingId', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await toggleFollow(req.userId!, String(req.params.followingId));
    res.json(successPayload(result));
  } catch (err) {
    console.error('[community:follow]', err);
    res.status(500).json(errorPayload('toggle follow failed', 'follow_failed', 500));
  }
});

router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : 'all';
    const notifications = await listNotifications(req.userId!, type);
    res.json(successPayload({ notifications }));
  } catch (err) {
    console.error('[notifications:list]', err);
    res.status(500).json(errorPayload('list notifications failed', 'notifications_failed', 500));
  }
});

router.post('/notifications/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = typeof req.body?.id === 'string' ? req.body.id : undefined;
    await markNotificationsRead(req.userId!, id);
    res.json(successPayload({ read: true }));
  } catch (err) {
    console.error('[notifications:read]', err);
    res.status(500).json(errorPayload('mark notifications read failed', 'notifications_read_failed', 500));
  }
});

export default router;
