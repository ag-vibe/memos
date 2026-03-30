export const selectors = {
  authPage: '[data-testid="auth-page"]',
  authForm: '[data-testid="auth-form"]',
  memosPage: '[data-testid="memos-page"]',
  memoListHeading: '[data-testid="memo-list-heading"]',
  memoCard: '[data-testid="memo-card"]',
  memoContentInput: '[data-testid="memo-content-input"]',
  memoSubmit: '[data-testid="memo-submit"]',
  sidebarTagAll: '[data-testid="sidebar-tag-all"]',
  sidebarTagButton: (tag: string) => `[data-testid="sidebar-tag-${tag}"]`,
};
