/**
 * TraceCraft 通知文案国际化单元测试
 *
 * 测试目标：notification-i18n.ts
 *   - getNotificationTexts：按语言返回对应文案
 *   - 默认中文、支持英文
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNotificationTexts } from '../src/services/notification-i18n';

test('getNotificationTexts defaults to zh-CN', () => {
  const texts = getNotificationTexts();
  assert.equal(texts.comment.title, '收到新评论');
  assert.equal(texts.like.title, '收到新点赞');
  assert.equal(texts.follow.title, '新增关注');
  assert.equal(texts.system.title, '系统通知');
});

test('getNotificationTexts returns zh-CN for explicit locale', () => {
  const texts = getNotificationTexts('zh-CN');
  assert.equal(texts.like.body, '有人点赞了你的作品');
  assert.equal(texts.follow.body, '有人关注了你');
});

test('getNotificationTexts returns en-US for English locale', () => {
  const texts = getNotificationTexts('en-US');
  assert.equal(texts.comment.title, 'New Comment');
  assert.equal(texts.like.title, 'New Like');
  assert.equal(texts.like.body, 'Someone liked your post');
  assert.equal(texts.follow.title, 'New Follower');
  assert.equal(texts.follow.body, 'Someone followed you');
  assert.equal(texts.system.title, 'System Notification');
});

test('getNotificationTexts returns en-US for short en code', () => {
  const texts = getNotificationTexts('en');
  assert.equal(texts.comment.title, 'New Comment');
});

test('comment body uses dynamic content', () => {
  const zhTexts = getNotificationTexts('zh-CN');
  assert.equal(zhTexts.comment.body('测试评论内容'), '测试评论内容');

  const enTexts = getNotificationTexts('en-US');
  assert.equal(enTexts.comment.body('Hello world'), 'Hello world');
});

test('getNotificationTexts falls back to zh-CN for unknown locale', () => {
  const texts = getNotificationTexts('ja-JP');
  assert.equal(texts.comment.title, '收到新评论');
});
