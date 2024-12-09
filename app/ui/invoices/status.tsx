"use client";
import { updateStatusFromDropdown } from "@/app/lib/actions";
import { CheckIcon, ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useState } from "react";

export default function InvoiceStatus({
  status,
  id,
}: {
  status: string;
  id: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const options = ["Overdue", "Cancelled", "Paid", "Pending"];
  return (
    <>
      {isOpen ? (
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-2 py-1 text-xs",
            {
              "bg-gray-100 text-gray-500": status === "pending",
              "bg-green-500 text-white": status === "paid",
              "bg-red-500 text-white": status === "cancelled",
              "bg-red-800 text-white": status === "overdue",
            }
          )}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {status === "pending" ? (
            <>
              Pending
              <ClockIcon className="ml-1 w-4 text-gray-500" />
            </>
          ) : null}
          {status === "paid" ? (
            <>
              Paid
              <CheckIcon className="ml-1 w-4 text-white" />
            </>
          ) : null}
          {status === "cancelled" ? (
            <>
              Cancelled
              <XMarkIcon className="ml-1 w-4 text-white" />
            </>
          ) : null}
          {status === "overdue" ? (
            <>
              Overdue
              <XMarkIcon className="ml-1 w-4 text-white" />
            </>
          ) : null}
        </span>
      ) : (
        <form action={updateStatusFromDropdown}>
          <input
            readOnly
            className="hidden"
            name="oldStatus"
            value={status}
            id="oldStatus"
          />
          <input readOnly className="hidden" name="id" value={id} id="id" />
          <select
            className="rounded-full px-2 py-1 text-xs"
            defaultValue={"status"}
            name="status"
            id="status"
            onChange={(e) => {
              setIsOpen((prev) => !prev);
              e.target.form?.requestSubmit();
            }}
          >
            <option></option>
            {options.map((option) => (
              <option key={option} value={option.toLocaleLowerCase()}>
                {option}
              </option>
            ))}
          </select>
        </form>
      )}
    </>
  );
}
