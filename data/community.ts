// Must match COMMUNITY_CATEGORIES on the server.
export const ALL_DISCUSSIONS = 'All Discussions';

export const communityCategories = [
  ALL_DISCUSSIONS,
  'Anxiety & Panic',
  'Depression & Low Mood',
  'Burnout & Work Stress',
  'Coping Strategies & Tips',
  'Grief & Loss',
  'Questions for Supporters',
  'General Discussion',
];

/** Categories a new post can be filed under. */
export const postCategories = communityCategories.filter((category) => category !== ALL_DISCUSSIONS);
