import { restoreAction } from "@/app/lib/actions";
import { fetchInvoiceLogs } from "@/app/lib/data";
import { formatReadableDate } from "@/app/lib/utils";

export default async function LogsTable() {
  const fetchedLogs = await fetchInvoiceLogs();
  const logs = Array.isArray(fetchedLogs) ? fetchedLogs : [];
  console.log(logs[0].created_at);
  return (
    <div className="overflow-x-auto mt-12">
      <table className="min-w-full table-auto">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 text-left">Invoice ID</th>
            <th className="py-2 px-4 text-left">Old Status</th>
            <th className="py-2 px-4 text-left">New Status</th>
            <th className="py-2 px-4 text-left">Changed By</th>
            <th className="py-2 px-4 text-left">Created At</th>
            <th className="py-2 px-4 text-left">Restore</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.invoice_id} className="border-t">
              <td className="py-2 px-4">{log.invoice_id}</td>
              <td className="py-2 px-4">{log.old_status}</td>
              <td className="py-2 px-4">{log.new_status}</td>
              <td className="py-2 px-4">{log.username}</td>
              <td className="py-2 px-4">
                {formatReadableDate(log.created_at)}
              </td>
              <td className="py-2 px-4">
                <form action={restoreAction}>
                  <input
                    readOnly
                    className="hidden"
                    value={log.new_status}
                    name="newStatus"
                    id="newStatus"
                  />
                  <input
                    readOnly
                    className="hidden"
                    value={log.old_status}
                    name="oldStatus"
                    id="oldStatus"
                  />
                  <input
                    readOnly
                    className="hidden"
                    value={log.invoice_id}
                    name="id"
                    id="id"
                  />
                  <button
                    type="submit"
                    className="text-blue-500 hover:underline"
                  >
                    Restore
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
