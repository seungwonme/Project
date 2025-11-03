"use client";

import { useState } from "react";
import type { CustomOrder, CustomOrderStatus } from "@/types/custom-order";
import { ORDER_STATUS_LABEL } from "@/types/custom-order";
import { CustomOrderDetailDialog } from "./custom-order-detail-dialog";
import Link from "next/link";

/**
 * @file components/admin/custom-order-table.tsx
 * @description 관리자용 주문제작 목록 테이블 (상태별 탭 포함)
 */

interface CustomOrderTableProps {
  orders: CustomOrder[];
  currentStatus?: CustomOrderStatus;
}

const STATUS_TABS: { value: CustomOrderStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending_review", label: "검토 대기" },
  { value: "quote_provided", label: "견적 제공됨" },
  { value: "in_progress", label: "제작 중" },
  { value: "completed", label: "제작 완료" },
  { value: "cancelled", label: "취소됨" },
];

export function CustomOrderTable({ orders, currentStatus }: CustomOrderTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);

  const currentTab = currentStatus || "all";

  return (
    <div>
      {/* 상태별 탭 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_TABS.map((tab) => {
          const isActive = tab.value === currentTab;
          const count = tab.value === "all" 
            ? orders.length 
            : orders.filter((o) => o.status === tab.value).length;

          return (
            <Link
              key={tab.value}
              href={tab.value === "all" ? "/admin/custom-orders" : `/admin/custom-orders?status=${tab.value}`}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label} ({count})
            </Link>
          );
        })}
      </div>

      {/* 주문 목록 테이블 */}
      {orders.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">주문이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    주문 ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    사용자 ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    설명
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    견적가
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    생성일
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {order.clerk_id.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                      {order.description}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : order.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : order.status === "quote_provided"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {order.quoted_price
                        ? `₩${order.quoted_price.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {selectedOrder && (
        <CustomOrderDetailDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

