#!/bin/bash
set -euo pipefail

BASE="http://localhost:3000"
SHIPPING_ID="cmnpbmvxz000j9kq4grqu99c4"
PAYREF_SHIP="ship-$(date +%s)"

echo "== shipping 当前状态 =="
curl -sS -H "x-role: customer" "$BASE/orders/$SHIPPING_ID"
echo
echo

echo "== shipping 支付 =="
curl -sS -X POST \
  -H "x-role: customer" \
  -H "Content-Type: application/json" \
  -d "{\"paymentRef\":\"$PAYREF_SHIP\",\"paidAmountCents\":10800}" \
  "$BASE/orders/$SHIPPING_ID/mark-paid"
echo
echo

echo "== shipping 发货 =="
curl -sS -X POST \
  -H "x-role: store" \
  -H "Content-Type: application/json" \
  -d '{"courierCompany":"SF Express","trackingNumber":"SF123456789CN"}' \
  "$BASE/orders/$SHIPPING_ID/ship"
echo
echo

echo "== shipping 妥投 =="
curl -sS -X POST \
  -H "x-role: store" \
  "$BASE/orders/$SHIPPING_ID/deliver"
echo
echo

echo "== shipping 最终状态 =="
curl -sS -H "x-role: customer" "$BASE/orders/$SHIPPING_ID"
echo
echo

echo "== shipping 状态日志 =="
curl -sS -H "x-role: stus-logs"
echo
echo
