import { tabAction } from "@/app/lib/actions";
import { cookies } from "next/headers";

export default function Tabs() {
  const tabs = ["All", "Pending", "Overdue", "Cancelled", "Paid"];
  const cookieStore = cookies(); // Access cookies from the request
  const status = cookieStore.get("status")?.value || "all";
  console.log("log from tabs component", status);
  return (
    <div className="flex items-center justify-end mt-8">
      {tabs.map((tab) => {
        return (
          <form action={tabAction} key={tab}>
            <input
              readOnly
              className="hidden"
              name="tabValue"
              id="tabValue"
              value={tab.toLocaleLowerCase()}
            />
            <button
              className={`px-3 py-2 rounded-lg ${
                status === tab.toLocaleLowerCase()
                  ? "bg-blue-800"
                  : "bg-blue-500"
              } mx-3 text-white`}
              type="submit"
            >
              {tab}
            </button>
          </form>
        );
      })}
    </div>
  );
}
