@journey @P0 @memos
Feature: Memos 基础操作

  作为已登录用户，我希望能创建 memo，
  以便我可以记录和回看想法

  Background:
    Given 用户已登录 memos 系统

  @MEMOS-CRUD-001
  Scenario: 用户创建一条新的 memo
    When 用户创建一条新的 memo
    Then 新 memo 应该出现在列表中
