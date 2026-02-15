'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  fetchAttendanceForSession,
  fetchAttendanceSessionsSummary,
  getExplorerUrl,
  type AttendanceRecord,
  type AttendanceSessionSummary
} from '@/lib/algorand';
import { getDistanceFromLatLonInKm } from '@/lib/utils';

function AttendanceListContent() {
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId') ?? '';

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSessionSummary[]>([]);

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

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await fetchAttendanceSessionsSummary();
      setSessions(data);
    } finally {
      setSessionsLoading(false);
    }
  };

  const studentsPresent = useMemo(() => {
    const unique = new Set<string>();
    for (const row of rows) {
      if (row.studentName?.trim()) unique.add(row.studentName.trim());
      else if (row.sender) unique.add(row.sender);
    }
    return Array.from(unique);
  }, [rows]);

  useEffect(() => {
    fetchSessions();
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

      <div className="border p-3 mb-4">
        <h2 className="font-semibold mb-2">Session List</h2>
        {sessionsLoading ? <p>Loading sessions...</p> : null}
        {!sessionsLoading && sessions.length === 0 ? <p>No sessions found.</p> : null}
        {!sessionsLoading && sessions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sessions.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => {
                  setSessionId(s.sessionId);
                  setTimeout(() => fetchList(), 0);
                }}
                className="border px-2 py-1 text-left"
              >
                <div className="font-mono text-xs">{s.sessionId}</div>
                <div className="text-xs">Students: {s.presentStudents}</div>
                <div className="text-xs">Geo Txns: {s.geoVerifiedTransactions}</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="border p-3 mb-4">
        <h2 className="font-semibold mb-2">Students Present So Far</h2>
        {studentsPresent.length === 0 ? (
          <p>No students for selected session.</p>
        ) : (
          <ul className="list-disc pl-5">
            {studentsPresent.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
      </div>

      <p className="mb-3">Total Records: {rows.length}</p>

      <div className="overflow-auto border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Student Name</th>
              <th className="text-left p-2">Wallet</th>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Geo</th>
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
                  {(() => {
                    if (!row.locationVerified) return <span className="text-muted-foreground">No</span>;

                    // Check if Parseable Session Location exists
                    // Format: CLASS-DATE-RAND_LAT_LONG
                    // We can also check if `sessionId` in state has the coords
                    const parts = sessionId.split('_');
                    if (parts.length >= 3 && row.location) {
                      const sLat = parseFloat(parts[1]);
                      const sLong = parseFloat(parts[2]);
                      if (!isNaN(sLat) && !isNaN(sLong)) {
                        const dist = getDistanceFromLatLonInKm(sLat, sLong, row.location.lat, row.location.long) * 1000;
                        if (dist <= 100) {
                          return <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200 text-xs">🟢 In Class ({Math.round(dist)}m)</span>;
                        } else {
                          return <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 text-xs">🔴 Remote ({(dist / 1000).toFixed(1)}km)</span>;
                        }
                      }
                    }

                    return <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">📍 Geo-Tagged</span>;
                  })()}
                </td>
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

export default function AttendanceListPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-6 max-w-5xl mx-auto">Loading...</main>}>
      <AttendanceListContent />
    </Suspense>
  );
}
