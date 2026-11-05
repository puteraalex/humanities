import { describe, it, expect } from 'vitest';
import {
  startGame,
  getScreen,
  setScreen,
  startStory,
  nextStory,
  skipStory,
  getStoryStep,
} from '../src/state/store.js';
import { STORY, titleHtml, storyHtml } from '../src/ui/renderTitle.js';

describe('intro flow', () => {
  it('walks through the story and ends on the preparation screen', () => {
    startGame(1);
    setScreen('title');
    expect(getScreen()).toBe('title');
    startStory();
    expect(getScreen()).toBe('story');
    for (let i = 0; i < STORY.length - 1; i++) {
      nextStory(STORY.length);
      expect(getScreen()).toBe('story');
    }
    nextStory(STORY.length);
    expect(getScreen()).toBeNull();
    expect(getStoryStep()).toBe(0);
  });

  it('can be skipped at any point', () => {
    startGame(1);
    startStory();
    nextStory(STORY.length);
    skipStory();
    expect(getScreen()).toBeNull();
    expect(getStoryStep()).toBe(0);
  });
});

describe('title and story text', () => {
  it('keeps the independence note and a way to skip', () => {
    const html = titleHtml();
    expect(html).toContain('not made by, affiliated with, or endorsed by NASA');
    expect(html).toContain('Skip the story');
    expect(html).toContain('Science sources');
  });

  it('every story panel has a title and text', () => {
    STORY.forEach((s, i) => {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.text.length).toBeGreaterThan(20);
      expect(storyHtml(i)).toContain(s.title);
    });
  });
});