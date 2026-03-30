@journey @P1 @memos
Feature: Memos 标签筛选

  作为已登录用户，我希望能按标签筛选 memo，
  以便我快速聚焦同一主题的内容

  Background:
    Given 用户已登录 memos 系统

  @MEMOS-FILTER-001
  Scenario: 用户按标签筛选 memo 列表
    Given 列表中存在可按标签筛选的 memo
    When 用户按该标签筛选 memo 列表
    Then 列表中只应显示带该标签的 memo
    And 用户清除该标签筛选后应该看到全部相关 memo
