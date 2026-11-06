import React from 'react';
import { CheckCircle2, Clock, Package, Truck, Home, AlertCircle } from 'lucide-react';

interface OrderTrackerProps {
  currentStatus: string;
}

const statusSteps = [
  { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'PROCESSING', label: 'Processing', icon: Clock },
  { key: 'PACKED', label: 'Packed', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Home }
];

export const OrderTracker: React.FC<OrderTrackerProps> = ({ currentStatus }) => {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold">Order Cancelled</p>
          <p className="text-xs text-red-600">This order was cancelled. Any debited amount will be refunded to your original payment method.</p>
        </div>
      </div>
    );
  }

  if (currentStatus === 'RETURNED') {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 text-sm">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold">Order Returned</p>
          <p className="text-xs text-amber-700">The returned items have been received at our Bengaluru facility.</p>
        </div>
      </div>
    );
  }

  const currentIndex = statusSteps.findIndex((s) => s.key === currentStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="py-6">
      <div className="relative">
        {/* Track Line */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-stone-200 -z-0">
          <div
            className="h-full bg-[#832729] transition-all duration-500"
            style={{ width: `${(activeIndex / (statusSteps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex justify-between relative z-10">
          {statusSteps.map((step, idx) => {
            const isCompleted = idx <= activeIndex;
            const isCurrent = idx === activeIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center text-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-[#832729] border-[#832729] text-white shadow-md'
                      : 'bg-white border-stone-300 text-stone-400'
                  } ${isCurrent ? 'ring-4 ring-[#832729]/20 scale-110' : ''}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`mt-2 text-[11px] font-semibold max-w-[70px] leading-tight ${
                    isCompleted ? 'text-stone-800' : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
