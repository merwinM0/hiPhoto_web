#!/bin/bash

echo "测试邮箱验证功能"
echo "=================="

# 设置测试邮箱和密码
TEST_EMAIL="test@example.com"
TEST_PASSWORD="Test123!"

echo "1. 测试用户注册..."
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}"

echo -e "\n\n2. 测试重复注册..."
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}"

echo -e "\n\n3. 测试登录（未验证邮箱）..."
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}"

echo -e "\n\n4. 测试重新发送验证码..."
curl -X POST http://localhost:8000/api/auth/resend \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}"

echo -e "\n\n5. 测试错误验证码..."
curl -X POST http://localhost:8000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"code\": \"000000\"}"

echo -e "\n\n注意：要测试完整的验证流程，你需要："
echo "1. 查看日志获取实际发送的验证码"
echo "2. 使用正确的验证码调用验证接口"
echo "3. 验证成功后测试登录"