'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchAttendanceForSession, getExplorerUrl, type AttendanceRecord } from '@/lib/algorand';

export default function AttendanceListPage() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId') ?? '';

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<AttendanceRecord[]>([]);

  const canFetch = useMemo(() => sessionId.trim().length > 0, [sessionId]);

  const fetchList = async () => {
    if (!canFetch) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchAttendanceForSession(sessionId.trim());
      setRows(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch {
      setError('Failed to fetch attendance list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSessionId) {
      fetchList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId]);

  return (
    <main className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/attendance" className="underline">Back</Link>
      </div>

      <h1 className="text-2xl font-semibold mb-4">Attendance List</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="Session ID"
          className="border px-3 py-2 w-full max-w-md"
        />
        <button
          onClick={fetchList}
          disabled={!canFetch || loading}
          className="border px-4 py-2"
        >
          {loading ? 'Loading...' : 'Fetch'}
        </button>
      </div>

      {error ? <p className="text-red-600 mb-4">{error}</p> : null}

      <p className="mb-3">Total Records: {rows.length}</p>

      <div className="overflow-auto border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Student Name</th>
              <th className="text-left p-2">Wallet</th>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.txId} className="border-b">
                <td className="p-2">{row.studentName ?? 'Unknown'}</td>
                <td className="p-2 font-mono">{row.sender}</td>
                <td className="p-2">{new Date(row.timestamp).toLocaleString()}</td>
                <td className="p-2">
                  <a href={getExplorerUrl(row.txId)} target="_blank" rel="noreferrer" className="underline">
                    {row.txId}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

