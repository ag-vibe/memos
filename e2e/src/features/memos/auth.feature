@journey @P0 @memos
Feature: Memos 登录流程

  作为用户，我希望系统能正确处理未登录访问和登录成功，
  以便我能进入 memo 列表开始记录内容

  @MEMOS-AUTH-001
  Scenario: 未登录用户访问首页时会跳转到登录页
    When 用户访问 memos 首页
    Then 应该跳转到 memos 登录页

  @MEMOS-AUTH-002
  Scenario: 用户使用已有账号成功登录
    Given 存在一个可登录的 memos 用户
    And 用户打开 memos 登录页
    When 用户使用该 memos 用户登录
    Then 用户应该进入 memos 列表页
